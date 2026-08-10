import bcrypt from "bcryptjs"
import type { FastifyInstance } from "fastify"
import { z } from "zod"

import { signAccessToken } from "../auth.js"
import type { DatabasePool } from "../db.js"

const loginSchema = z.object({
  merchantCode: z.string().min(2),
  operatorCode: z.string().min(2),
  pin: z.string().min(4).max(12),
  deviceId: z.string().min(8),
})

export function registerAuthRoutes(app: FastifyInstance, pool: DatabasePool) {
  app.post("/v1/auth/login", async (request, reply) => {
    const body = loginSchema.parse(request.body)
    const result = await pool.query<{
      id: string
      merchant_id: string
      name: string
      role: "OPERATOR" | "ADMIN" | "OWNER"
      pin_hash: string
      active: boolean
      revoked_at: Date | null
    }>(
      `SELECT o.id, o.merchant_id, o.name, o.role, o.pin_hash, o.active, d.revoked_at
       FROM operators o
       JOIN merchants m ON m.id = o.merchant_id
       JOIN devices d ON d.id = $3 AND d.merchant_id = o.merchant_id
       WHERE m.code = $1 AND o.code = $2`,
      [body.merchantCode, body.operatorCode, body.deviceId],
    )
    const operator = result.rows[0]
    if (!operator || !operator.active || operator.revoked_at || !(await bcrypt.compare(body.pin, operator.pin_hash))) {
      return reply.code(401).send({ code: "INVALID_CREDENTIALS", message: "Merchant, operator, PIN, or device is invalid" })
    }
    const token = await signAccessToken({ operatorId: operator.id, operatorName: operator.name, merchantId: operator.merchant_id, role: operator.role })
    return { token, expiresInSeconds: 43_200, operator: { id: operator.id, name: operator.name, role: operator.role }, merchantId: operator.merchant_id }
  })
}
