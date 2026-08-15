import type { FastifyInstance } from "fastify"
import { z } from "zod"

import { requireAuth } from "../auth.js"
import type { DatabasePool } from "../db.js"
import { ReconciliationService } from "../modules/reconciliation/service.js"

const correctionSchema = z.object({
  reason: z.string().min(8).max(500),
  adjustmentAmount: z.number().int(),
  evidenceReference: z.string().max(180).optional(),
})

export function registerCorrectionRoutes(app: FastifyInstance, pool: DatabasePool) {
  const service = new ReconciliationService(pool)
  app.post("/v1/admin/transactions/:transactionId/corrections", async (request, reply) => {
    const identity = await requireAuth(request, ["ADMIN"], pool)
    const { transactionId } = z.object({ transactionId: z.string() }).parse(request.params)
    const correction = await service.createCorrection(
      identity,
      transactionId,
      correctionSchema.parse(request.body),
    )
    return reply.code(201).send(correction)
  })

  app.get("/v1/admin/corrections", async (request) => {
    const identity = await requireAuth(request, ["ADMIN"], pool)
    return { corrections: await service.listCorrections(identity.merchantId) }
  })
}
