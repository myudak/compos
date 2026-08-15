import type { FastifyInstance } from "fastify"
import { z } from "zod"

import { requireAuth } from "../auth.js"
import type { DatabasePool } from "../db.js"
import { ReconciliationService } from "../modules/reconciliation/service.js"

const resolutionSchema = z.object({
  resolution: z.string().min(8).max(500),
  adjustedStock: z.number().int().optional(),
})

export function registerDiscrepancyRoutes(app: FastifyInstance, pool: DatabasePool) {
  const service = new ReconciliationService(pool)
  app.get("/v1/inventory/discrepancies", async (request) => {
    const identity = await requireAuth(request, ["ADMIN"], pool)
    return { discrepancies: await service.listDiscrepancies(identity.merchantId) }
  })

  app.post("/v1/inventory/discrepancies/:id/resolve", async (request) => {
    const identity = await requireAuth(request, ["ADMIN"], pool)
    const { id } = z.object({ id: z.string() }).parse(request.params)
    return service.resolveDiscrepancy(identity, id, resolutionSchema.parse(request.body))
  })
}
