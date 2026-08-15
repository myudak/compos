import type { FastifyInstance } from "fastify"
import { z } from "zod"

import { requireAuth } from "../auth.js"
import type { DatabasePool } from "../db.js"
import { TransactionQueryRepository } from "../modules/transactions/query-repository.js"

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(100),
  paymentRiskOnly: z.enum(["true", "false"]).optional(),
})

export function registerTransactionRoutes(app: FastifyInstance, pool: DatabasePool) {
  const repository = new TransactionQueryRepository(pool)
  app.get("/v1/transactions", async (request) => {
    const identity = await requireAuth(request)
    const query = listQuerySchema.parse(request.query)
    const transactions = await repository.list(
      identity.merchantId,
      query.limit,
      query.paymentRiskOnly === "true",
    )
    return { transactions }
  })

  app.get("/v1/transactions/:transactionId", async (request, reply) => {
    const identity = await requireAuth(request)
    const { transactionId } = z.object({ transactionId: z.string() }).parse(request.params)
    const detail = await repository.detail(identity.merchantId, transactionId)
    if (!detail) {
      return reply.code(404).send({
        code: "NOT_FOUND",
        message: "Transaction not found",
        requestId: request.id,
      })
    }
    return detail
  })
}
