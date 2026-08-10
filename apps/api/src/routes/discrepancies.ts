import type { FastifyInstance } from "fastify"
import { z } from "zod"

import { requireAuth } from "../auth.js"
import type { DatabasePool } from "../db.js"

export function registerDiscrepancyRoutes(app: FastifyInstance, pool: DatabasePool) {
  app.get("/v1/inventory/discrepancies", async (request) => {
    const identity = await requireAuth(request, ["ADMIN", "OWNER"])
    const result = await pool.query(
      `SELECT d.id, d.product_id, p.name AS product_name, d.detected_at, d.projected_stock, d.status, d.resolution, d.resolved_at
       FROM inventory_discrepancies d
       JOIN products p ON p.merchant_id = d.merchant_id AND p.id = d.product_id
       WHERE d.merchant_id = $1 ORDER BY d.detected_at DESC LIMIT 100`,
      [identity.merchantId],
    )
    return { discrepancies: result.rows }
  })

  app.post("/v1/inventory/discrepancies/:id/resolve", async (request, reply) => {
    const identity = await requireAuth(request, ["ADMIN"])
    const { id } = z.object({ id: z.string() }).parse(request.params)
    const { resolution, adjustedStock } = z.object({ resolution: z.string().min(8).max(500), adjustedStock: z.number().int().optional() }).parse(request.body)
    const client = await pool.connect()
    try {
      await client.query("BEGIN")
      const discrepancy = await client.query<{ product_id: string }>("SELECT product_id FROM inventory_discrepancies WHERE id = $1 AND merchant_id = $2 AND status = 'OPEN' FOR UPDATE", [id, identity.merchantId])
      if (!discrepancy.rows[0]) {
        await client.query("ROLLBACK")
        return reply.code(404).send({ code: "OPEN_DISCREPANCY_NOT_FOUND" })
      }
      if (adjustedStock !== undefined) await client.query("UPDATE products SET stock_projection = $1, updated_at = now() WHERE merchant_id = $2 AND id = $3", [adjustedStock, identity.merchantId, discrepancy.rows[0].product_id])
      await client.query("UPDATE inventory_discrepancies SET status = 'RESOLVED', resolution = $1, resolved_by = $2, resolved_at = now() WHERE id = $3", [resolution, identity.operatorId, id])
      await client.query("COMMIT")
      return { id, status: "RESOLVED" }
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  })
}
