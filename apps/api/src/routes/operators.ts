import {
  createOperatorRequestSchema,
  resetPinRequestSchema,
  updateOperatorRequestSchema,
} from "@operator/contracts"
import type { FastifyInstance } from "fastify"
import { z } from "zod"

import { requireAuth } from "../auth.js"
import type { DatabasePool } from "../db.js"
import { adminMutationRateLimit } from "../http/rate-limits.js"
import { OperatorService } from "../modules/operators/service.js"

const paramsSchema = z.object({ operatorId: z.string().min(1) })

export function registerOperatorRoutes(app: FastifyInstance, pool: DatabasePool) {
  const service = new OperatorService(pool)
  app.get("/v1/admin/operators", async (request) => {
    const identity = await requireAuth(request, ["ADMIN"], pool)
    return { operators: await service.list(identity.merchantId) }
  })
  app.post(
    "/v1/admin/operators",
    { config: { rateLimit: adminMutationRateLimit } },
    async (request, reply) => {
      const identity = await requireAuth(request, ["ADMIN"], pool)
      const operator = await service.create(
        identity,
        createOperatorRequestSchema.parse(request.body),
      )
      return reply.code(201).send({ operator })
    },
  )
  app.patch(
    "/v1/admin/operators/:operatorId",
    { config: { rateLimit: adminMutationRateLimit } },
    async (request) => {
      const identity = await requireAuth(request, ["ADMIN"], pool)
      const { operatorId } = paramsSchema.parse(request.params)
      return {
        operator: await service.update(
          identity,
          operatorId,
          updateOperatorRequestSchema.parse(request.body),
        ),
      }
    },
  )
  app.post(
    "/v1/admin/operators/:operatorId/reset-pin",
    { config: { rateLimit: adminMutationRateLimit } },
    async (request) => {
      const identity = await requireAuth(request, ["ADMIN"], pool)
      const { operatorId } = paramsSchema.parse(request.params)
      return service.resetPin(identity, operatorId, resetPinRequestSchema.parse(request.body))
    },
  )
}
