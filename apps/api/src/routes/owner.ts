import {
  ownerDashboardQuerySchema,
  ownerDashboardResponseSchema,
  insightJobResponseSchema,
  insightListResponseSchema,
} from "@operator/contracts"
import type { FastifyInstance } from "fastify"
import { z } from "zod"

import { requireAuth } from "../auth.js"
import type { DatabasePool } from "../db.js"
import { observeMetric } from "../metrics.js"
import { insightGenerationRateLimit, reportingRateLimit } from "../http/rate-limits.js"
import { ReportingService } from "../modules/reporting/service.js"

export function registerOwnerRoutes(
  app: FastifyInstance,
  authPool: DatabasePool,
  reportingPool: DatabasePool,
  commandPool: DatabasePool,
) {
  const service = new ReportingService(reportingPool, commandPool)

  app.get("/v1/owner/dashboard", { config: { rateLimit: reportingRateLimit } }, async (request) => {
    const startedAt = performance.now()
    const identity = await requireAuth(request, ["OWNER"], authPool)
    const query = ownerDashboardQuerySchema.parse(request.query)
    const dashboard = await service.dashboard(identity.merchantId, query.from, query.to)
    observeMetric("reporting_route_latency_ms", performance.now() - startedAt)
    return ownerDashboardResponseSchema.parse(dashboard)
  })

  app.get("/v1/owner/insights", { config: { rateLimit: reportingRateLimit } }, async (request) => {
    const identity = await requireAuth(request, ["OWNER"], authPool)
    const { limit } = z
      .object({ limit: z.coerce.number().int().min(1).max(50).default(20) })
      .parse(request.query)
    return insightListResponseSchema.parse({
      insights: await service.insights(identity.merchantId, limit),
    })
  })

  app.post(
    "/v1/owner/insights/generate",
    { config: { rateLimit: insightGenerationRateLimit } },
    async (request, reply) => {
      const identity = await requireAuth(request, ["OWNER"], authPool)
      const job = await service.queueInsight(identity)
      return reply.code(202).send(insightJobResponseSchema.parse({ job }))
    },
  )

  app.get(
    "/v1/owner/insight-jobs/:jobId",
    { config: { rateLimit: reportingRateLimit } },
    async (request) => {
      const identity = await requireAuth(request, ["OWNER"], authPool)
      const { jobId } = z.object({ jobId: z.string().uuid() }).parse(request.params)
      return insightJobResponseSchema.parse({ job: await service.job(identity.merchantId, jobId) })
    },
  )
}
