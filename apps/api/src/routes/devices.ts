import { registerDeviceRequestSchema } from "@operator/contracts"
import type { FastifyInstance } from "fastify"
import { z } from "zod"

import { requireAuth } from "../auth.js"
import type { DatabasePool } from "../db.js"
import { adminMutationRateLimit } from "../http/rate-limits.js"
import { DeviceService } from "../modules/devices/service.js"

const paramsSchema = z.object({ deviceId: z.string().min(1) })

export function registerDeviceRoutes(
  app: FastifyInstance,
  operationalPool: DatabasePool,
  adminPool: DatabasePool = operationalPool,
) {
  const operationalService = new DeviceService(operationalPool)
  const adminService = new DeviceService(adminPool)

  app.post("/v1/devices/register", async (request, reply) => {
    const registered = await operationalService.register(
      registerDeviceRequestSchema.parse(request.body),
    )
    return reply.code(201).send(registered)
  })

  app.get("/v1/admin/devices", async (request) => {
    const identity = await requireAuth(request, ["ADMIN"], adminPool)
    return { devices: await adminService.list(identity.merchantId) }
  })

  app.post(
    "/v1/devices/:deviceId/revoke",
    { config: { rateLimit: adminMutationRateLimit } },
    async (request) => {
      const identity = await requireAuth(request, ["ADMIN"], adminPool)
      const { deviceId } = paramsSchema.parse(request.params)
      return adminService.revoke(identity, deviceId)
    },
  )
}
