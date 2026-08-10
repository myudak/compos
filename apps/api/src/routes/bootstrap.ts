import type { FastifyInstance } from "fastify"
import { z } from "zod"

import { requireAuth } from "../auth.js"
import type { DatabasePool } from "../db.js"

export function registerBootstrapRoutes(app: FastifyInstance, pool: DatabasePool) {
  app.get("/v1/bootstrap", async (request, reply) => {
    const identity = await requireAuth(request)
    const { deviceId } = z.object({ deviceId: z.string().min(8) }).parse(request.query)
    const device = await pool.query<{ id: string; name: string; revoked_at: Date | null }>("SELECT id, name, revoked_at FROM devices WHERE id = $1 AND merchant_id = $2", [deviceId, identity.merchantId])
    if (!device.rows[0] || device.rows[0].revoked_at) return reply.code(403).send({ code: "DEVICE_REVOKED_OR_UNKNOWN" })
    const [merchant, products] = await Promise.all([
      pool.query<{ id: string; name: string }>("SELECT id, name FROM merchants WHERE id = $1", [identity.merchantId]),
      pool.query("SELECT id, sku, name, description, category, price, stock_projection AS stock, min_stock, accent, updated_at FROM products WHERE merchant_id = $1 ORDER BY name", [identity.merchantId]),
    ])
    return {
      merchant: merchant.rows[0],
      device: { id: device.rows[0].id, name: device.rows[0].name },
      operator: { id: identity.operatorId, name: identity.operatorName, role: identity.role },
      products: products.rows,
      serverTime: new Date().toISOString(),
      syncCursor: new Date().toISOString(),
    }
  })
}
