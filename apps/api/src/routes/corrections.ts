import { createCorrectionRequestSchema } from "@operator/contracts"
import type { FastifyInstance } from "fastify"
import { z } from "zod"

import { requireAuth } from "../auth.js"
import type { DatabasePool } from "../db.js"
import { adminMutationRateLimit } from "../http/rate-limits.js"
import { ReconciliationService } from "../modules/reconciliation/service.js"

export function registerCorrectionRoutes(app: FastifyInstance, pool: DatabasePool) {
  const service = new ReconciliationService(pool)
  app.post(
    "/v1/admin/transactions/:transactionId/corrections",
    { config: { rateLimit: adminMutationRateLimit } },
    async (request, reply) => {
      const identity = await requireAuth(request, ["ADMIN"], pool)
      const { transactionId } = z.object({ transactionId: z.string() }).parse(request.params)
      const correction = await service.createCorrection(
        identity,
        transactionId,
        createCorrectionRequestSchema.parse(request.body),
      )
      return reply.code(201).send(correction)
    },
  )

  app.get("/v1/admin/corrections", async (request) => {
    const identity = await requireAuth(request, ["ADMIN"], pool)
    return { corrections: await service.listCorrections(identity.merchantId) }
  })
}
