import type { FastifyInstance } from "fastify"
import { z } from "zod"

import { requireAuth } from "../auth.js"
import type { DatabasePool } from "../db.js"
import { BootstrapRepository } from "../modules/bootstrap/repository.js"
import { CatalogRepository } from "../modules/catalog/repository.js"

export function registerBootstrapRoutes(app: FastifyInstance, pool: DatabasePool) {
  const bootstrap = new BootstrapRepository(pool)
  const catalog = new CatalogRepository(pool)
  app.get("/v1/bootstrap", async (request, reply) => {
    const identity = await requireAuth(request, undefined, pool)
    const { deviceId } = z.object({ deviceId: z.string().min(8) }).parse(request.query)
    const [merchant, device, products] = await Promise.all([
      bootstrap.merchant(identity.merchantId),
      bootstrap.device(identity.merchantId, deviceId),
      catalog.list(identity.merchantId),
    ])
    if (!device || device.revokedAt) {
      return reply.code(403).send({
        code: "DEVICE_REVOKED_OR_UNKNOWN",
        message: "Device is revoked or unknown",
        requestId: request.id,
      })
    }
    return {
      merchant,
      device: { id: device.id, name: device.name },
      operator: {
        id: identity.operatorId,
        name: identity.operatorName,
        role: identity.role,
      },
      products,
      serverTime: new Date().toISOString(),
      syncCursor: new Date().toISOString(),
    }
  })
}
