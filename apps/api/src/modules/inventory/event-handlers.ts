import { randomUUID } from "node:crypto"

import type { DatabaseClient } from "../../db.js"
import { incrementMetric } from "../../metrics.js"
import type { BackendOutboxEvent } from "./outbox-repository.js"

export async function handleBackendEvent(client: DatabaseClient, event: BackendOutboxEvent) {
  switch (event.eventType) {
    case "INVENTORY_TRANSACTION_SETTLED":
      await applyTransactionToInventory(client, event)
      return
    case "TRANSACTION_CORRECTED":
      // Corrections are financial audit records; they intentionally do not rewrite stock.
      return
    case "INVENTORY_RECONCILED":
      // The reconciliation transaction already owns the projection update.
      return
    default:
      throw new Error(`Unsupported backend outbox event: ${event.eventType}`)
  }
}

async function applyTransactionToInventory(client: DatabaseClient, event: BackendOutboxEvent) {
  const items = await client.query<{ product_id: string; quantity: number }>(
    `SELECT i.product_id, i.quantity
     FROM transaction_items i
     JOIN transactions t
       ON t.merchant_id = i.merchant_id AND t.id = i.transaction_id
     WHERE i.merchant_id = $1 AND i.transaction_id = $2
       AND t.transaction_status = 'CONFIRMED'`,
    [event.merchantId, event.aggregateId],
  )
  for (const item of items.rows) {
    const movement = await client.query<{ quantity_delta: number }>(
      `INSERT INTO inventory_movements (
        merchant_id, product_id, transaction_id, quantity_delta
      ) VALUES ($1,$2,$3,$4)
      ON CONFLICT DO NOTHING
      RETURNING quantity_delta`,
      [event.merchantId, item.product_id, event.aggregateId, -item.quantity],
    )
    const delta = movement.rows[0]?.quantity_delta
    if (delta === undefined) continue
    const product = await client.query<{ stock_projection: number }>(
      `UPDATE products
       SET stock_projection = stock_projection + $1, updated_at = now()
       WHERE merchant_id = $2 AND id = $3
       RETURNING stock_projection`,
      [delta, event.merchantId, item.product_id],
    )
    const stock = product.rows[0]?.stock_projection
    if (stock !== undefined && stock < 0) {
      const discrepancy = await client.query(
        `INSERT INTO inventory_discrepancies (
          id, merchant_id, product_id, projected_stock
        ) VALUES ($1,$2,$3,$4)
        ON CONFLICT DO NOTHING`,
        [randomUUID(), event.merchantId, item.product_id, stock],
      )
      if (discrepancy.rowCount) incrementMetric("inventory_discrepancy_total")
    }
  }
}
