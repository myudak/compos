import type { FastifyInstance } from "fastify"
import { z } from "zod"

import { requireAuth } from "../auth.js"
import { config } from "../config.js"
import type { DatabasePool } from "../db.js"

const registerSchema = z.object({
  merchantCode: z.string().min(2),
  activationCode: z.string().min(4),
  deviceId: z.string().min(8).max(128),
  deviceName: z.string().min(2).max(80),
})

export function registerDeviceRoutes(app: FastifyInstance, pool: DatabasePool) {
  app.post("/v1/devices/register", async (request, reply) => {
    const body = registerSchema.parse(request.body)
    if (body.activationCode !== config.DEVICE_ACTIVATION_CODE) return reply.code(403).send({ code: "INVALID_ACTIVATION_CODE" })
    const merchant = await pool.query<{ id: string }>("SELECT id FROM merchants WHERE code = $1", [body.merchantCode])
    if (!merchant.rows[0]) return reply.code(404).send({ code: "MERCHANT_NOT_FOUND" })
    await pool.query(
      `INSERT INTO devices (id, merchant_id, name) VALUES ($1,$2,$3)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
       WHERE devices.merchant_id = EXCLUDED.merchant_id AND devices.revoked_at IS NULL`,
      [body.deviceId, merchant.rows[0].id, body.deviceName],
    )
    return reply.code(201).send({ deviceId: body.deviceId, merchantId: merchant.rows[0].id, status: "REGISTERED" })
  })

  app.post("/v1/devices/:deviceId/revoke", async (request, reply) => {
    const identity = await requireAuth(request, ["ADMIN"])
    const params = z.object({ deviceId: z.string() }).parse(request.params)
    const result = await pool.query("UPDATE devices SET revoked_at = now() WHERE id = $1 AND merchant_id = $2 AND revoked_at IS NULL", [params.deviceId, identity.merchantId])
    if (!result.rowCount) return reply.code(404).send({ code: "DEVICE_NOT_FOUND" })
    return { deviceId: params.deviceId, status: "REVOKED" }
  })
}
