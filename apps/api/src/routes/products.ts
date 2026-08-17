import { productInputSchema, productPatchSchema } from "@operator/contracts"
import type { FastifyInstance } from "fastify"
import { z } from "zod"

import { requireAuth } from "../auth.js"
import type { DatabasePool } from "../db.js"
import { adminMutationRateLimit } from "../http/rate-limits.js"
import { CatalogService } from "../modules/catalog/service.js"

const paramsSchema = z.object({ productId: z.string().min(1) })

export function registerProductRoutes(
  app: FastifyInstance,
  operationalPool: DatabasePool,
  adminPool: DatabasePool = operationalPool,
) {
  const operationalService = new CatalogService(operationalPool)
  const adminService = new CatalogService(adminPool)
  app.get("/v1/products", async (request) => {
    const identity = await requireAuth(request, ["OPERATOR", "ADMIN"], operationalPool)
    return { products: await operationalService.list(identity.merchantId, false) }
  })

  app.get("/v1/admin/products", async (request) => {
    const identity = await requireAuth(request, ["ADMIN"], adminPool)
    return { products: await adminService.list(identity.merchantId, true) }
  })

  app.post(
    "/v1/admin/products",
    { config: { rateLimit: adminMutationRateLimit } },
    async (request, reply) => {
      const identity = await requireAuth(request, ["ADMIN"], adminPool)
      const product = await adminService.create(identity, productInputSchema.parse(request.body))
      return reply.code(201).send({ product })
    },
  )

  app.patch(
    "/v1/admin/products/:productId",
    { config: { rateLimit: adminMutationRateLimit } },
    async (request) => {
      const identity = await requireAuth(request, ["ADMIN"], adminPool)
      const { productId } = paramsSchema.parse(request.params)
      return {
        product: await adminService.update(
          identity,
          productId,
          productPatchSchema.parse(request.body),
        ),
      }
    },
  )

  app.post(
    "/v1/admin/products/:productId/archive",
    { config: { rateLimit: adminMutationRateLimit } },
    async (request) => {
      const identity = await requireAuth(request, ["ADMIN"], adminPool)
      const { productId } = paramsSchema.parse(request.params)
      return { product: await adminService.setArchived(identity, productId, true) }
    },
  )

  app.post(
    "/v1/admin/products/:productId/restore",
    { config: { rateLimit: adminMutationRateLimit } },
    async (request) => {
      const identity = await requireAuth(request, ["ADMIN"], adminPool)
      const { productId } = paramsSchema.parse(request.params)
      return { product: await adminService.setArchived(identity, productId, false) }
    },
  )
}
