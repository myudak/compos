import { registerDeviceRequestSchema } from "@operator/contracts"
import type { FastifyInstance } from "fastify"
import { z } from "zod"

import { requireAuth } from "../auth.js"
import type { DatabasePool } from "../db.js"
import { DeviceService } from "../modules/devices/service.js"

const paramsSchema = z.object({ deviceId: z.string().min(1) })

export function registerDeviceRoutes(app: FastifyInstance, pool: DatabasePool) {
  const service = new DeviceService(pool)

  app.post("/v1/devices/register", async (request, reply) => {
    const registered = await service.register(registerDeviceRequestSchema.parse(request.body))
    return reply.code(201).send(registered)
  })

  app.get("/v1/admin/devices", async (request) => {
    const identity = await requireAuth(request, ["ADMIN"], pool)
    return { devices: await service.list(identity.merchantId) }
  })

  app.post("/v1/devices/:deviceId/revoke", async (request) => {
    const identity = await requireAuth(request, ["ADMIN"], pool)
    const { deviceId } = paramsSchema.parse(request.params)
    return service.revoke(identity, deviceId)
  })
}
