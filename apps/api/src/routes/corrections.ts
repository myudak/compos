import { randomUUID } from "node:crypto"
import type { FastifyInstance } from "fastify"
import { z } from "zod"

import { requireAuth } from "../auth.js"
import type { DatabasePool } from "../db.js"
import { incrementMetric } from "../metrics.js"

const correctionSchema = z.object({
  reason: z.string().min(8).max(500),
  adjustmentAmount: z.number().int(),
  evidenceReference: z.string().max(180).optional(),
})

export function registerCorrectionRoutes(app: FastifyInstance, pool: DatabasePool) {
  app.post("/v1/admin/transactions/:transactionId/corrections", async (request, reply) => {
    const identity = await requireAuth(request, ["ADMIN"])
    const { transactionId } = z.object({ transactionId: z.string() }).parse(request.params)
    const body = correctionSchema.parse(request.body)
    const client = await pool.connect()
    const correctionId = randomUUID()
    try {
      await client.query("BEGIN")
      const transaction = await client.query("SELECT id FROM transactions WHERE merchant_id = $1 AND id = $2 AND settlement_status = 'SETTLED' FOR SHARE", [identity.merchantId, transactionId])
      if (!transaction.rows[0]) {
        await client.query("ROLLBACK")
        return reply.code(404).send({ code: "SETTLED_TRANSACTION_NOT_FOUND" })
      }
      await client.query(
        `INSERT INTO corrections (id, merchant_id, transaction_id, admin_id, reason, adjustment_amount, evidence_reference)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [correctionId, identity.merchantId, transactionId, identity.operatorId, body.reason, body.adjustmentAmount, body.evidenceReference ?? null],
      )
      await client.query(
        `INSERT INTO transaction_events (merchant_id, transaction_id, event_type, actor_type, actor_id, payload)
         VALUES ($1,$2,'CORRECTION_CREATED','ADMIN',$3,$4::jsonb)`,
        [identity.merchantId, transactionId, identity.operatorId, JSON.stringify({ correctionId, ...body })],
      )
      await client.query(
        `INSERT INTO backend_outbox_events (id, merchant_id, aggregate_type, aggregate_id, event_type, payload)
         VALUES ($1,$2,'CORRECTION',$3,'TRANSACTION_CORRECTED',$4::jsonb)`,
        [randomUUID(), identity.merchantId, correctionId, JSON.stringify({ correctionId, transactionId })],
      )
      await client.query("COMMIT")
      incrementMetric("corrections_created_total")
      return reply.code(201).send({ correctionId, transactionId, status: "RECORDED", originalTransactionMutated: false })
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  })

  app.get("/v1/admin/corrections", async (request) => {
    const identity = await requireAuth(request, ["ADMIN", "OWNER"])
    const result = await pool.query(
      `SELECT c.id, c.transaction_id, c.reason, c.adjustment_amount, c.evidence_reference, c.created_at,
              o.name AS admin_name, t.invoice_number
       FROM corrections c JOIN operators o ON o.id = c.admin_id
       JOIN transactions t ON t.merchant_id = c.merchant_id AND t.id = c.transaction_id
       WHERE c.merchant_id = $1 ORDER BY c.created_at DESC LIMIT 100`,
      [identity.merchantId],
    )
    return { corrections: result.rows }
  })
}
