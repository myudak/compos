import cors from "@fastify/cors"
import Fastify from "fastify"
import { ZodError } from "zod"

import { config } from "./config.js"
import type { DatabasePool } from "./db.js"
import { pool as defaultPool } from "./db.js"
import { metricsAsPrometheus, metricsSnapshot } from "./metrics.js"
import { HttpError } from "./http/errors.js"
import { registerAuthRoutes } from "./routes/auth.js"
import { registerBootstrapRoutes } from "./routes/bootstrap.js"
import { registerCorrectionRoutes } from "./routes/corrections.js"
import { registerDeviceRoutes } from "./routes/devices.js"
import { registerDiscrepancyRoutes } from "./routes/discrepancies.js"
import { registerOperatorRoutes } from "./routes/operators.js"
import { registerProductRoutes } from "./routes/products.js"
import { registerSyncRoutes } from "./routes/sync.js"
import { registerTransactionRoutes } from "./routes/transactions.js"
import { registerWebHosting } from "./web-hosting.js"

export async function buildApp(pool: DatabasePool = defaultPool) {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
      redact: ["req.headers.authorization", "req.body.pin"],
    },
  })
  await app.register(cors, {
    origin: config.CORS_ORIGIN.split(","),
    credentials: false,
    methods: ["GET", "HEAD", "POST", "PATCH", "OPTIONS"],
  })

  app.get("/health", async (_request, reply) => {
    try {
      await pool.query("SELECT 1")
      return { status: "ok", database: "reachable", timestamp: new Date().toISOString() }
    } catch {
      return reply
        .code(503)
        .send({ status: "degraded", database: "unreachable", timestamp: new Date().toISOString() })
    }
  })
  app.get("/metrics", async (request, reply) => {
    const runtime = await pool.query<{
      pending_outbox: string
      outbox_lag_seconds: string | null
      open_discrepancies: string
    }>(
      `SELECT
        (SELECT count(*) FROM backend_outbox_events WHERE processed_at IS NULL)::text AS pending_outbox,
        (SELECT extract(epoch FROM now() - min(created_at)) FROM backend_outbox_events WHERE processed_at IS NULL)::text AS outbox_lag_seconds,
        (SELECT count(*) FROM inventory_discrepancies WHERE status = 'OPEN')::text AS open_discrepancies`,
    )
    const row = runtime.rows[0]
    const gauges = {
      backend_outbox_pending: Number(row?.pending_outbox ?? 0),
      outbox_lag_seconds: Number(row?.outbox_lag_seconds ?? 0),
      inventory_discrepancy_open: Number(row?.open_discrepancies ?? 0),
    }
    if (request.headers.accept?.includes("text/plain"))
      return reply.type("text/plain; version=0.0.4").send(metricsAsPrometheus(gauges))
    return metricsSnapshot(gauges)
  })

  registerDeviceRoutes(app, pool)
  registerAuthRoutes(app, pool)
  registerBootstrapRoutes(app, pool)
  registerSyncRoutes(app, pool)
  registerTransactionRoutes(app, pool)
  registerCorrectionRoutes(app, pool)
  registerDiscrepancyRoutes(app, pool)
  registerOperatorRoutes(app, pool)
  registerProductRoutes(app, pool)

  await registerWebHosting(app, {
    enabled: config.SERVE_WEB,
    root: config.WEB_DIST_PATH,
  })

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        code: "INVALID_REQUEST",
        message: "Request validation failed",
        details: error.issues,
        requestId: request.id,
      })
    }
    const withStatus = error as Error & { statusCode?: number; code?: string; details?: unknown }
    const statusCode = withStatus.statusCode ?? 500
    if (statusCode >= 500) request.log.error({ err: error }, "request failed")
    return reply.code(statusCode).send({
      code:
        withStatus instanceof HttpError ? withStatus.code : (withStatus.code ?? "INTERNAL_ERROR"),
      message: statusCode >= 500 ? "Unexpected server error" : withStatus.message,
      ...(withStatus.details === undefined ? {} : { details: withStatus.details }),
      requestId: request.id,
    })
  })
  return app
}
