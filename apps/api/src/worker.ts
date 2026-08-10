import { randomUUID } from "node:crypto"

import { pool, type DatabasePool } from "./db.js"
import { incrementMetric } from "./metrics.js"

export async function processBackendOutbox(pool: DatabasePool, limit = 50) {
  const claimed = await pool.query<{ id: string }>(
    `UPDATE backend_outbox_events
     SET claimed_at = now(), attempt_count = attempt_count + 1
     WHERE id IN (
       SELECT id FROM backend_outbox_events
       WHERE processed_at IS NULL AND (claimed_at IS NULL OR claimed_at < now() - interval '5 minutes')
       ORDER BY created_at LIMIT $1 FOR UPDATE SKIP LOCKED
     ) RETURNING id`,
    [limit],
  )
  let processed = 0
  for (const { id } of claimed.rows) {
    const client = await pool.connect()
    try {
      await client.query("BEGIN")
      const event = await client.query<{ merchant_id: string; aggregate_id: string; event_type: string }>("SELECT merchant_id, aggregate_id, event_type FROM backend_outbox_events WHERE id = $1 FOR UPDATE", [id])
      const row = event.rows[0]
      if (!row) {
        await client.query("ROLLBACK")
        continue
      }
      if (row.event_type === "TRANSACTION_SETTLED") {
        const items = await client.query<{ product_id: string; quantity: number }>("SELECT product_id, quantity FROM transaction_items WHERE merchant_id = $1 AND transaction_id = $2", [row.merchant_id, row.aggregate_id])
        for (const item of items.rows) {
          const movement = await client.query<{ quantity_delta: number }>(
            `INSERT INTO inventory_movements (merchant_id, product_id, transaction_id, quantity_delta)
             VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING quantity_delta`,
            [row.merchant_id, item.product_id, row.aggregate_id, -item.quantity],
          )
          if (movement.rows[0]) {
            const product = await client.query<{ stock_projection: number }>(
              "UPDATE products SET stock_projection = stock_projection + $1, updated_at = now() WHERE merchant_id = $2 AND id = $3 RETURNING stock_projection",
              [movement.rows[0].quantity_delta, row.merchant_id, item.product_id],
            )
            const stock = product.rows[0]?.stock_projection
            if (stock !== undefined && stock < 0) {
              const discrepancy = await client.query(
                `INSERT INTO inventory_discrepancies (id, merchant_id, product_id, projected_stock)
                 VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
                [randomUUID(), row.merchant_id, item.product_id, stock],
              )
              if (discrepancy.rowCount) incrementMetric("inventory_discrepancy_total")
            }
          }
        }
      }
      await client.query("UPDATE backend_outbox_events SET processed_at = now(), last_error = NULL WHERE id = $1", [id])
      await client.query("COMMIT")
      processed += 1
    } catch (error) {
      await client.query("ROLLBACK")
      await pool.query("UPDATE backend_outbox_events SET claimed_at = NULL, last_error = $1 WHERE id = $2", [error instanceof Error ? error.message : "Unknown worker error", id])
    } finally {
      client.release()
    }
  }
  return processed
}

if (process.argv[1]?.endsWith("worker.ts") || process.argv[1]?.endsWith("worker.js")) {
  // Polling the PostgreSQL outbox keeps RabbitMQ optional and outside transaction acceptance.
  for (;;) {
    const processed = await processBackendOutbox(pool)
    await new Promise((resolve) => setTimeout(resolve, processed ? 100 : 1_000))
  }
}
