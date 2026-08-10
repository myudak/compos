import type { FastifyInstance } from "fastify"
import { z } from "zod"

import { requireAuth } from "../auth.js"
import type { DatabasePool } from "../db.js"

export function registerTransactionRoutes(app: FastifyInstance, pool: DatabasePool) {
  app.get("/v1/transactions", async (request) => {
    const identity = await requireAuth(request)
    const query = z.object({ limit: z.coerce.number().int().min(1).max(200).default(100), paymentRiskOnly: z.enum(["true", "false"]).optional() }).parse(request.query)
    const result = await pool.query(
      `SELECT t.id, t.invoice_number, t.transaction_status, t.settlement_status, t.payment_method,
              t.payment_verification_type, t.total, t.created_at_device, t.received_at_backend,
              o.name AS operator_name,
              COALESCE((SELECT sum(c.adjustment_amount) FROM corrections c WHERE c.merchant_id = t.merchant_id AND c.transaction_id = t.id), 0)::int AS correction_total
       FROM transactions t JOIN operators o ON o.id = t.operator_id
       WHERE t.merchant_id = $1
         AND ($2::boolean = false OR t.payment_verification_type = 'OPERATOR_ASSERTED')
       ORDER BY t.received_at_backend DESC LIMIT $3`,
      [identity.merchantId, query.paymentRiskOnly === "true", query.limit],
    )
    return { transactions: result.rows }
  })

  app.get("/v1/transactions/:transactionId", async (request, reply) => {
    const identity = await requireAuth(request)
    const { transactionId } = z.object({ transactionId: z.string() }).parse(request.params)
    const transaction = await pool.query(
      `SELECT t.*, o.name AS operator_name, d.name AS device_name
       FROM transactions t JOIN operators o ON o.id = t.operator_id JOIN devices d ON d.id = t.device_id
       WHERE t.merchant_id = $1 AND t.id = $2`,
      [identity.merchantId, transactionId],
    )
    if (!transaction.rows[0]) return reply.code(404).send({ code: "TRANSACTION_NOT_FOUND" })
    const [items, events, corrections] = await Promise.all([
      pool.query("SELECT product_id, name_snapshot, quantity, unit_price, subtotal FROM transaction_items WHERE merchant_id = $1 AND transaction_id = $2", [identity.merchantId, transactionId]),
      pool.query("SELECT event_type, actor_type, actor_id, payload, event_timestamp FROM transaction_events WHERE merchant_id = $1 AND transaction_id = $2 ORDER BY event_timestamp", [identity.merchantId, transactionId]),
      pool.query("SELECT id, reason, adjustment_amount, evidence_reference, created_at FROM corrections WHERE merchant_id = $1 AND transaction_id = $2 ORDER BY created_at", [identity.merchantId, transactionId]),
    ])
    return { transaction: transaction.rows[0], items: items.rows, events: events.rows, corrections: corrections.rows }
  })
}
