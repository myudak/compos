import cors from "@fastify/cors"
import rateLimit from "@fastify/rate-limit"
import Fastify from "fastify"
import { ZodError } from "zod"

import { config } from "./config.js"
import type { AppPools, DatabasePool } from "./db.js"
import { appPools as defaultPools } from "./db.js"
import { metricsAsPrometheus, metricsSnapshot } from "./metrics.js"
import { HttpError } from "./http/errors.js"
import { registerAuthRoutes } from "./routes/auth.js"
import { registerBootstrapRoutes } from "./routes/bootstrap.js"
import { registerCorrectionRoutes } from "./routes/corrections.js"
import { registerDeviceRoutes } from "./routes/devices.js"
import { registerDiscrepancyRoutes } from "./routes/discrepancies.js"
import { registerOperatorRoutes } from "./routes/operators.js"
import { registerOwnerRoutes } from "./routes/owner.js"
import { registerProductRoutes } from "./routes/products.js"
import { registerSyncRoutes } from "./routes/sync.js"
import { registerTransactionRoutes } from "./routes/transactions.js"
import { registerWebHosting } from "./web-hosting.js"

function normalizePools(input: DatabasePool | AppPools): AppPools {
  return "operational" in input ? input : { operational: input, admin: input, reporting: input }
}

export async function buildApp(input: DatabasePool | AppPools = defaultPools) {
  const pools = normalizePools(input)
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
  await app.register(rateLimit, {
    global: false,
    keyGenerator: (request) => request.headers.authorization ?? request.ip,
  })

  app.get("/health", async (_request, reply) => {
    try {
      await pools.operational.query("SELECT 1")
      return { status: "ok", database: "reachable", timestamp: new Date().toISOString() }
    } catch {
      return reply
        .code(503)
        .send({ status: "degraded", database: "unreachable", timestamp: new Date().toISOString() })
    }
  })
  app.get("/metrics", async (request, reply) => {
    const runtime = await pools.operational.query<{
      pending_outbox: string
      outbox_lag_seconds: string | null
      open_discrepancies: string
      reporting_queue: string
      insight_queue: string
    }>(
      `SELECT
        (SELECT count(*) FROM backend_outbox_events WHERE processed_at IS NULL)::text AS pending_outbox,
        (SELECT extract(epoch FROM now() - min(created_at)) FROM backend_outbox_events WHERE processed_at IS NULL)::text AS outbox_lag_seconds,
        (SELECT count(*) FROM inventory_discrepancies WHERE status = 'OPEN')::text AS open_discrepancies,
        (SELECT count(*) FROM backend_outbox_events WHERE processed_at IS NULL AND event_type = 'REPORTING_TRANSACTION_SETTLED')::text AS reporting_queue,
        (SELECT count(*) FROM insight_jobs WHERE status IN ('QUEUED','PROCESSING','FAILED'))::text AS insight_queue`,
    )
    const row = runtime.rows[0]
    const gauges = {
      backend_outbox_pending: Number(row?.pending_outbox ?? 0),
      outbox_lag_seconds: Number(row?.outbox_lag_seconds ?? 0),
      inventory_discrepancy_open: Number(row?.open_discrepancies ?? 0),
      reporting_lane_queue_depth: Number(row?.reporting_queue ?? 0),
      insight_lane_queue_depth: Number(row?.insight_queue ?? 0),
      operational_pool_waiting: pools.operational.waitingCount,
      admin_pool_waiting: pools.admin.waitingCount,
      reporting_pool_waiting: pools.reporting.waitingCount,
    }
    if (request.headers.accept?.includes("text/plain"))
      return reply.type("text/plain; version=0.0.4").send(metricsAsPrometheus(gauges))
    return metricsSnapshot(gauges)
  })

  registerDeviceRoutes(app, pools.operational, pools.admin)
  registerAuthRoutes(app, pools.operational)
  registerBootstrapRoutes(app, pools.operational)
  registerSyncRoutes(app, pools.operational)
  registerTransactionRoutes(app, pools.operational)
  registerCorrectionRoutes(app, pools.admin)
  registerDiscrepancyRoutes(app, pools.admin)
  registerOperatorRoutes(app, pools.admin)
  registerProductRoutes(app, pools.operational, pools.admin)
  registerOwnerRoutes(app, pools.operational, pools.reporting, pools.admin)

  await registerWebHosting(app, {
    enabled: config.SERVE_WEB,
    root: config.WEB_DIST_PATH,
    ownerRoot: config.OWNER_WEB_DIST_PATH,
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
