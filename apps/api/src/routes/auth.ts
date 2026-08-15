import { loginRequestSchema } from "@operator/contracts"
import type { FastifyInstance } from "fastify"

import { requireAuth } from "../auth.js"
import type { DatabasePool } from "../db.js"
import { AuthService } from "../modules/auth/service.js"

export function registerAuthRoutes(app: FastifyInstance, pool: DatabasePool) {
  const service = new AuthService(pool)
  app.post("/v1/auth/login", async (request) => {
    return service.login(loginRequestSchema.parse(request.body))
  })

  app.post("/v1/auth/logout", async (request) => {
    const identity = await requireAuth(request, undefined, pool)
    return service.logout(identity)
  })
}
