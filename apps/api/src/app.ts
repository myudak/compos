import cors from "@fastify/cors"
import Fastify from "fastify"
import { ZodError } from "zod"

import { config } from "./config.js"
import type { DatabasePool } from "./db.js"
import { pool as defaultPool } from "./db.js"
import { metricsAsPrometheus, metricsSnapshot } from "./metrics.js"
import { registerAuthRoutes } from "./routes/auth.js"
import { registerBootstrapRoutes } from "./routes/bootstrap.js"
import { registerCorrectionRoutes } from "./routes/corrections.js"
import { registerDeviceRoutes } from "./routes/devices.js"
import { registerDiscrepancyRoutes } from "./routes/discrepancies.js"
import { registerSyncRoutes } from "./routes/sync.js"

export async function buildApp(pool: DatabasePool = defaultPool) {
  const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? "info", redact: ["req.headers.authorization", "req.body.pin"] } })
  await app.register(cors, { origin: config.CORS_ORIGIN.split(","), credentials: false })

  app.get("/health", async (_request, reply) => {
    try {
      await pool.query("SELECT 1")
      return { status: "ok", database: "reachable", timestamp: new Date().toISOString() }
    } catch {
      return reply.code(503).send({ status: "degraded", database: "unreachable", timestamp: new Date().toISOString() })
    }
  })
  app.get("/metrics", async (request, reply) => {
    if (request.headers.accept?.includes("text/plain")) return reply.type("text/plain; version=0.0.4").send(metricsAsPrometheus())
    return metricsSnapshot()
  })

  registerDeviceRoutes(app, pool)
  registerAuthRoutes(app, pool)
  registerBootstrapRoutes(app, pool)
  registerSyncRoutes(app, pool)
  registerCorrectionRoutes(app, pool)
  registerDiscrepancyRoutes(app, pool)

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) return reply.code(400).send({ code: "INVALID_REQUEST", issues: error.issues })
    const withStatus = error as Error & { statusCode?: number; code?: string }
    const statusCode = withStatus.statusCode ?? 500
    if (statusCode >= 500) request.log.error({ err: error }, "request failed")
    return reply.code(statusCode).send({ code: withStatus.code ?? "INTERNAL_ERROR", message: statusCode >= 500 ? "Unexpected server error" : withStatus.message })
  })
  return app
}
