import { z } from "zod"

const dateSchema = z.iso.date()

export const ownerDashboardQuerySchema = z.object({
  from: dateSchema.optional(),
  to: dateSchema.optional(),
})

export const ownerDashboardResponseSchema = z.object({
  period: z.object({ from: dateSchema, to: dateSchema, timezone: z.string() }),
  summary: z.object({
    grossSales: z.number().int(),
    netSales: z.number().int(),
    transactionCount: z.number().int(),
    averageOrderValue: z.number().int(),
  }),
  dailySales: z.array(
    z.object({
      date: dateSchema,
      grossSales: z.number().int(),
      transactionCount: z.number().int(),
    }),
  ),
  topProducts: z.array(
    z.object({
      productId: z.string(),
      name: z.string(),
      quantity: z.number().int(),
      revenue: z.number().int(),
    }),
  ),
  dataAsOf: z.iso.datetime({ offset: true }).nullable(),
  projectionLagSeconds: z.number().int().nonnegative(),
})

export const insightSourceSchema = z.enum(["EXTERNAL_AI", "LOCAL_ANALYTICS"])
export const insightJobStatusSchema = z.enum(["QUEUED", "PROCESSING", "COMPLETED", "FAILED"])
export const businessInsightSchema = z.object({
  id: z.string(),
  periodStart: dateSchema,
  periodEnd: dateSchema,
  title: z.string(),
  summary: z.string(),
  recommendations: z.array(z.string()),
  source: insightSourceSchema,
  generatedAt: z.iso.datetime({ offset: true }),
})
export const insightJobSchema = z.object({
  id: z.string(),
  status: insightJobStatusSchema,
  periodStart: dateSchema,
  periodEnd: dateSchema,
  insightId: z.string().nullable(),
  lastError: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
})
export const insightListResponseSchema = z.object({ insights: z.array(businessInsightSchema) })
export const insightJobResponseSchema = z.object({ job: insightJobSchema })

export type OwnerDashboard = z.infer<typeof ownerDashboardResponseSchema>
export type BusinessInsight = z.infer<typeof businessInsightSchema>
export type InsightJob = z.infer<typeof insightJobSchema>
