import type { FastifyInstance } from "fastify"

import { requireAuth } from "../auth.js"
import type { DatabasePool } from "../db.js"

export function registerProductRoutes(app: FastifyInstance, pool: DatabasePool) {
  app.get("/v1/products", async (request) => {
    const identity = await requireAuth(request)
    const products = await pool.query(
      `SELECT id, sku, name, description, category, price, stock_projection AS stock,
              min_stock, accent, updated_at
       FROM products WHERE merchant_id = $1 ORDER BY name`,
      [identity.merchantId],
    )
    return { products: products.rows }
  })
}
