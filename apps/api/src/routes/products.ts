import type { FastifyInstance } from "fastify"

import { requireAuth } from "../auth.js"
import type { DatabasePool } from "../db.js"
import { CatalogRepository } from "../modules/catalog/repository.js"

export function registerProductRoutes(app: FastifyInstance, pool: DatabasePool) {
  const repository = new CatalogRepository(pool)
  app.get("/v1/products", async (request) => {
    const identity = await requireAuth(request)
    return { products: await repository.list(identity.merchantId) }
  })
}
