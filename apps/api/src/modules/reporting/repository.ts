import type { BusinessInsight, InsightJob, OwnerDashboard } from "@operator/contracts"

import type { DatabasePool } from "../../db.js"

type DailyRow = {
  business_date: string
  gross_sales: string
  net_sales: string
  transaction_count: string
  updated_at: Date
}

type ProductRow = {
  product_id: string
  product_name: string
  quantity: string
  revenue: string
}

type InsightRow = {
  id: string
  period_start: string
  period_end: string
  title: string
  summary: string
  recommendations: unknown
  source: "EXTERNAL_AI" | "LOCAL_ANALYTICS"
  generated_at: Date
}

type JobRow = {
  id: string
  status: InsightJob["status"]
  period_start: string
  period_end: string
  insight_id: string | null
  last_error: string | null
  created_at: Date
  updated_at: Date
}

export class ReportingRepository {
  constructor(private readonly pool: DatabasePool) {}

  async merchantTimezone(merchantId: string) {
    const result = await this.pool.query<{ timezone: string }>(
      `SELECT timezone FROM merchants WHERE id = $1`,
      [merchantId],
    )
    return result.rows[0]?.timezone ?? "Asia/Jakarta"
  }

  async dashboard(
    merchantId: string,
    from: string,
    to: string,
    timezone: string,
  ): Promise<OwnerDashboard> {
    const [daily, products, lag] = await Promise.all([
      this.pool.query<DailyRow>(
        `SELECT business_date::text, gross_sales::text, net_sales::text,
                transaction_count::text, updated_at
         FROM merchant_daily_sales
         WHERE merchant_id = $1 AND business_date BETWEEN $2 AND $3
         ORDER BY business_date`,
        [merchantId, from, to],
      ),
      this.pool.query<ProductRow>(
        `SELECT product_id, max(product_name) AS product_name,
                sum(quantity)::text AS quantity, sum(revenue)::text AS revenue
         FROM merchant_product_daily_sales
         WHERE merchant_id = $1 AND business_date BETWEEN $2 AND $3
         GROUP BY product_id
         ORDER BY sum(revenue) DESC, product_id
         LIMIT 10`,
        [merchantId, from, to],
      ),
      this.pool.query<{ lag_seconds: string; data_as_of: Date | null }>(
        `SELECT
           coalesce(extract(epoch FROM now() - (min(created_at) FILTER (
             WHERE processed_at IS NULL AND event_type = 'REPORTING_TRANSACTION_SETTLED'
           ))), 0)::text AS lag_seconds,
           (SELECT max(updated_at) FROM merchant_daily_sales WHERE merchant_id = $1) AS data_as_of
         FROM backend_outbox_events
         WHERE merchant_id = $1`,
        [merchantId],
      ),
    ])
    const grossSales = daily.rows.reduce((sum, row) => sum + Number(row.gross_sales), 0)
    const netSales = daily.rows.reduce((sum, row) => sum + Number(row.net_sales), 0)
    const transactionCount = daily.rows.reduce((sum, row) => sum + Number(row.transaction_count), 0)
    const freshness = lag.rows[0]
    return {
      period: { from, to, timezone },
      summary: {
        grossSales,
        netSales,
        transactionCount,
        averageOrderValue: transactionCount ? Math.round(netSales / transactionCount) : 0,
      },
      dailySales: daily.rows.map((row) => ({
        date: row.business_date,
        grossSales: Number(row.gross_sales),
        transactionCount: Number(row.transaction_count),
      })),
      topProducts: products.rows.map((row) => ({
        productId: row.product_id,
        name: row.product_name,
        quantity: Number(row.quantity),
        revenue: Number(row.revenue),
      })),
      dataAsOf: freshness?.data_as_of?.toISOString() ?? null,
      projectionLagSeconds: Math.max(0, Math.round(Number(freshness?.lag_seconds ?? 0))),
    }
  }

  async insights(merchantId: string, limit: number): Promise<BusinessInsight[]> {
    const result = await this.pool.query<InsightRow>(
      `SELECT id, period_start::text, period_end::text, title, summary,
              recommendations, source, generated_at
       FROM business_insights
       WHERE merchant_id = $1
       ORDER BY generated_at DESC
       LIMIT $2`,
      [merchantId, limit],
    )
    return result.rows.map(mapInsight)
  }

  async job(merchantId: string, jobId: string): Promise<InsightJob | null> {
    const result = await this.pool.query<JobRow>(
      `SELECT id, status, period_start::text, period_end::text, insight_id,
              last_error, created_at, updated_at
       FROM insight_jobs WHERE merchant_id = $1 AND id = $2`,
      [merchantId, jobId],
    )
    return result.rows[0] ? mapJob(result.rows[0]) : null
  }
}

function mapInsight(row: InsightRow): BusinessInsight {
  return {
    id: row.id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    title: row.title,
    summary: row.summary,
    recommendations: Array.isArray(row.recommendations)
      ? row.recommendations.filter((item): item is string => typeof item === "string")
      : [],
    source: row.source,
    generatedAt: row.generated_at.toISOString(),
  }
}

function mapJob(row: JobRow): InsightJob {
  return {
    id: row.id,
    status: row.status,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    insightId: row.insight_id,
    lastError: row.last_error,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}
