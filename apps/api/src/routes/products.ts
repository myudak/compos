import { productInputSchema, productPatchSchema } from "@operator/contracts"
import type { FastifyInstance } from "fastify"
import { z } from "zod"

import { requireAuth } from "../auth.js"
import type { DatabasePool } from "../db.js"
import { CatalogService } from "../modules/catalog/service.js"

const paramsSchema = z.object({ productId: z.string().min(1) })

export function registerProductRoutes(app: FastifyInstance, pool: DatabasePool) {
  const service = new CatalogService(pool)
  app.get("/v1/products", async (request) => {
    const identity = await requireAuth(request, undefined, pool)
    return { products: await service.list(identity.merchantId, false) }
  })

  app.get("/v1/admin/products", async (request) => {
    const identity = await requireAuth(request, ["ADMIN"], pool)
    return { products: await service.list(identity.merchantId, true) }
  })

  app.post("/v1/admin/products", async (request, reply) => {
    const identity = await requireAuth(request, ["ADMIN"], pool)
    const product = await service.create(identity, productInputSchema.parse(request.body))
    return reply.code(201).send({ product })
  })

  app.patch("/v1/admin/products/:productId", async (request) => {
    const identity = await requireAuth(request, ["ADMIN"], pool)
    const { productId } = paramsSchema.parse(request.params)
    return {
      product: await service.update(identity, productId, productPatchSchema.parse(request.body)),
    }
  })

  app.post("/v1/admin/products/:productId/archive", async (request) => {
    const identity = await requireAuth(request, ["ADMIN"], pool)
    const { productId } = paramsSchema.parse(request.params)
    return { product: await service.setArchived(identity, productId, true) }
  })

  app.post("/v1/admin/products/:productId/restore", async (request) => {
    const identity = await requireAuth(request, ["ADMIN"], pool)
    const { productId } = paramsSchema.parse(request.params)
    return { product: await service.setArchived(identity, productId, false) }
  })
}
