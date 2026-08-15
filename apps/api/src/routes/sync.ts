import { randomUUID } from "node:crypto"
import type { FastifyInstance } from "fastify"

import { syncEnvelopeSchema, syncTransactionSchema, type SyncResult } from "../contracts.js"
import { requireAuth } from "../auth.js"
import type { DatabasePool } from "../db.js"
import { incrementMetric, observeMetric } from "../metrics.js"
import { TransactionAcceptanceService } from "../modules/transactions/accept-transaction.js"

export function registerSyncRoutes(app: FastifyInstance, pool: DatabasePool) {
  const acceptance = new TransactionAcceptanceService(pool)
  app.post("/v1/sync/transactions", async (request, reply) => {
    const startedAt = performance.now()
    const identity = await requireAuth(request, ["OPERATOR", "ADMIN"], pool)
    const requestId = String(request.id || randomUUID())
    const envelope = syncEnvelopeSchema.parse(request.body)
    if (envelope.merchantId !== identity.merchantId) {
      return reply
        .code(403)
        .send({ code: "FORBIDDEN", message: "Merchant scope mismatch", requestId })
    }

    const device = await pool.query<{ revoked_at: Date | null }>(
      `SELECT revoked_at FROM devices WHERE id = $1 AND merchant_id = $2`,
      [envelope.deviceId, identity.merchantId],
    )
    if (!device.rows[0] || device.rows[0].revoked_at) {
      return reply.code(403).send({
        code: "DEVICE_REVOKED_OR_UNKNOWN",
        message: "Device is revoked or unknown",
        requestId,
      })
    }

    incrementMetric("sync_requests_total")
    observeMetric("sync_batch_size", envelope.transactions.length)
    const results = await Promise.all(
      envelope.transactions.map((candidate) =>
        processCandidate(candidate, identity, envelope.deviceId, acceptance, request.log, {
          requestId,
          batchId: envelope.batchId,
        }),
      ),
    )
    const latencyMs = Math.round((performance.now() - startedAt) * 100) / 100
    observeMetric("sync_latency_ms", latencyMs)
    request.log.info(
      {
        requestId,
        batchId: envelope.batchId,
        merchantId: identity.merchantId,
        deviceId: envelope.deviceId,
        batchSize: envelope.transactions.length,
        results: results.map((result) => ({
          transactionId: result.transactionId,
          result: result.status,
        })),
        latencyMs,
      },
      "sync batch processed",
    )
    return { schemaVersion: 1 as const, batchId: envelope.batchId, results }
  })
}

async function processCandidate(
  candidate: unknown,
  identity: Awaited<ReturnType<typeof requireAuth>>,
  deviceId: string,
  acceptance: TransactionAcceptanceService,
  log: { error: (properties: object, message: string) => void },
  context: { requestId: string; batchId: string },
): Promise<SyncResult> {
  const parsed = syncTransactionSchema.safeParse(candidate)
  if (!parsed.success) {
    incrementMetric("transactions_rejected_total")
    return {
      transactionId: transactionIdFrom(candidate),
      status: "REJECTED_PERMANENT",
      reason: parsed.error.issues.map((issue) => issue.message).join("; "),
    }
  }
  if (parsed.data.operatorId !== identity.operatorId && identity.role !== "ADMIN") {
    return {
      transactionId: parsed.data.transactionId,
      status: "REJECTED_PERMANENT",
      reason: "OPERATOR_SCOPE_MISMATCH",
    }
  }
  try {
    return await acceptance.accept(identity, deviceId, parsed.data)
  } catch (error) {
    log.error(
      {
        err: error,
        ...context,
        transactionId: parsed.data.transactionId,
      },
      "transaction acceptance failed",
    )
    return {
      transactionId: parsed.data.transactionId,
      status: "RETRYABLE_ERROR",
      reason: "TEMPORARY_BACKEND_FAILURE",
    }
  }
}

function transactionIdFrom(candidate: unknown) {
  return typeof candidate === "object" && candidate && "transactionId" in candidate
    ? String(candidate.transactionId)
    : "UNKNOWN"
}
