import { randomUUID } from "node:crypto"
import type { FastifyInstance } from "fastify"

import { requireAuth } from "../auth.js"
import { syncEnvelopeSchema, syncTransactionSchema, type SyncResult } from "../contracts.js"
import type { DatabasePool } from "../db.js"
import { incrementMetric } from "../metrics.js"
import { acceptTransaction } from "../services/transaction-service.js"

export function registerSyncRoutes(app: FastifyInstance, pool: DatabasePool) {
  app.post("/v1/sync/transactions", async (request, reply) => {
    const identity = await requireAuth(request, ["OPERATOR", "ADMIN"])
    const requestId = String(request.id || randomUUID())
    const envelope = syncEnvelopeSchema.parse(request.body)
    if (envelope.merchantId !== identity.merchantId) return reply.code(403).send({ code: "MERCHANT_SCOPE_MISMATCH" })

    const device = await pool.query<{ revoked_at: Date | null }>("SELECT revoked_at FROM devices WHERE id = $1 AND merchant_id = $2", [envelope.deviceId, identity.merchantId])
    if (!device.rows[0] || device.rows[0].revoked_at) return reply.code(403).send({ code: "DEVICE_REVOKED_OR_UNKNOWN" })

    incrementMetric("sync_requests_total")
    const results: SyncResult[] = []
    for (const candidate of envelope.transactions) {
      const parsed = syncTransactionSchema.safeParse(candidate)
      if (!parsed.success) {
        const transactionId = typeof candidate === "object" && candidate && "transactionId" in candidate ? String(candidate.transactionId) : "UNKNOWN"
        incrementMetric("transactions_rejected_total")
        results.push({ transactionId, status: "REJECTED_PERMANENT", reason: parsed.error.issues.map((issue) => issue.message).join("; ") })
        continue
      }
      if (parsed.data.operatorId !== identity.operatorId && identity.role !== "ADMIN") {
        results.push({ transactionId: parsed.data.transactionId, status: "REJECTED_PERMANENT", reason: "OPERATOR_SCOPE_MISMATCH" })
        continue
      }
      try {
        results.push(await acceptTransaction(pool, identity, envelope.deviceId, parsed.data))
      } catch (error) {
        request.log.error({ err: error, requestId, batchId: envelope.batchId, transactionId: parsed.data.transactionId }, "transaction acceptance failed")
        results.push({ transactionId: parsed.data.transactionId, status: "RETRYABLE_ERROR", reason: "TEMPORARY_BACKEND_FAILURE" })
      }
    }
    return { requestId, batchId: envelope.batchId, results }
  })
}
