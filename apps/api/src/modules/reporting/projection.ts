import type { DatabaseClient, DatabasePool } from "../../db.js"
import { withTransaction } from "../../database/transaction.js"
import { incrementMetric } from "../../metrics.js"
import { BackendOutboxRepository } from "../inventory/outbox-repository.js"

const REPORTING_EVENT = "REPORTING_TRANSACTION_SETTLED"

export async function processReportingOutbox(pool: DatabasePool, limit = 50) {
  const outbox = new BackendOutboxRepository(pool)
  const claimedIds = await outbox.claim(limit, [REPORTING_EVENT])
  let processed = 0

  for (const eventId of claimedIds) {
    try {
      const handled = await withTransaction(pool, async (client) => {
        const event = await outbox.lock(client, eventId)
        if (!event) return false
        await applyTransactionProjection(client, event.merchantId, event.aggregateId)
        await outbox.markProcessed(client, event.id)
        return true
      })
      if (handled) {
        processed += 1
        incrementMetric("reporting_projection_total")
      }
    } catch (error) {
      await outbox.releaseAfterFailure(eventId, error)
    }
  }

  return processed
}

export async function applyTransactionProjection(
  client: DatabaseClient,
  merchantId: string,
  transactionId: string,
) {
  const applied = await client.query(
    `INSERT INTO reporting_applied_transactions (merchant_id, transaction_id)
     VALUES ($1,$2)
     ON CONFLICT DO NOTHING
     RETURNING transaction_id`,
    [merchantId, transactionId],
  )
  if (!applied.rowCount) return false

  const transaction = await client.query<{
    business_date: string
    subtotal: number
    total: number
    transaction_status: string
  }>(
    `SELECT (t.created_at_device AT TIME ZONE m.timezone)::date::text AS business_date,
            t.subtotal, t.total, t.transaction_status
     FROM transactions t
     JOIN merchants m ON m.id = t.merchant_id
     WHERE t.merchant_id = $1 AND t.id = $2`,
    [merchantId, transactionId],
  )
  const row = transaction.rows[0]
  if (!row || row.transaction_status !== "CONFIRMED") return true

  await client.query(
    `INSERT INTO merchant_daily_sales (
       merchant_id, business_date, gross_sales, net_sales, transaction_count
     ) VALUES ($1,$2,$3,$4,1)
     ON CONFLICT (merchant_id, business_date) DO UPDATE SET
       gross_sales = merchant_daily_sales.gross_sales + EXCLUDED.gross_sales,
       net_sales = merchant_daily_sales.net_sales + EXCLUDED.net_sales,
       transaction_count = merchant_daily_sales.transaction_count + 1,
       updated_at = now()`,
    [merchantId, row.business_date, row.subtotal, row.total],
  )
  await client.query(
    `INSERT INTO merchant_product_daily_sales (
       merchant_id, product_id, product_name, business_date, quantity, revenue
     )
     SELECT merchant_id, product_id, name_snapshot, $3::date, quantity, subtotal
     FROM transaction_items
     WHERE merchant_id = $1 AND transaction_id = $2
     ON CONFLICT (merchant_id, product_id, business_date) DO UPDATE SET
       product_name = EXCLUDED.product_name,
       quantity = merchant_product_daily_sales.quantity + EXCLUDED.quantity,
       revenue = merchant_product_daily_sales.revenue + EXCLUDED.revenue,
       updated_at = now()`,
    [merchantId, transactionId, row.business_date],
  )
  return true
}
