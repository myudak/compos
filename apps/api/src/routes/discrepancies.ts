import { resolveInventoryDiscrepancyRequestSchema } from "@operator/contracts"
import type { FastifyInstance } from "fastify"
import { z } from "zod"

import { requireAuth } from "../auth.js"
import type { DatabasePool } from "../db.js"
import { adminMutationRateLimit } from "../http/rate-limits.js"
import { ReconciliationService } from "../modules/reconciliation/service.js"

export function registerDiscrepancyRoutes(app: FastifyInstance, pool: DatabasePool) {
  const service = new ReconciliationService(pool)
  app.get("/v1/inventory/discrepancies", async (request) => {
    const identity = await requireAuth(request, ["ADMIN"], pool)
    return { discrepancies: await service.listDiscrepancies(identity.merchantId) }
  })

  app.post(
    "/v1/inventory/discrepancies/:id/resolve",
    { config: { rateLimit: adminMutationRateLimit } },
    async (request) => {
      const identity = await requireAuth(request, ["ADMIN"], pool)
      const { id } = z.object({ id: z.string() }).parse(request.params)
      return service.resolveDiscrepancy(
        identity,
        id,
        resolveInventoryDiscrepancyRequestSchema.parse(request.body),
      )
    },
  )
}
