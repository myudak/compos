import { randomUUID } from "node:crypto"

import type { DatabasePool } from "../../db.js"
import { withTransaction } from "../../database/transaction.js"
import { incrementMetric } from "../../metrics.js"
import { ReportingRepository } from "../reporting/repository.js"
import { generateInsight } from "./provider.js"

type ClaimedJob = {
  id: string
  merchant_id: string
  period_start: string
  period_end: string
}

export async function processInsightJobs(pool: DatabasePool, limit = 4) {
  await enqueueScheduledInsightJobs(pool)
  const jobs = await claimJobs(pool, limit)
  await Promise.all(jobs.map((job) => processJob(pool, job)))
  return jobs.length
}

async function enqueueScheduledInsightJobs(pool: DatabasePool) {
  await pool.query(
    `INSERT INTO insight_jobs (
       id, merchant_id, requested_by, period_start, period_end
     )
     SELECT
       'scheduled-' || to_char((now() AT TIME ZONE m.timezone)::date, 'YYYYMMDD') || '-' || md5(m.id),
       m.id,
       NULL,
       (now() AT TIME ZONE m.timezone)::date - 29,
       (now() AT TIME ZONE m.timezone)::date
     FROM merchants m
     WHERE EXISTS (
       SELECT 1 FROM merchant_daily_sales sales WHERE sales.merchant_id = m.id
     )
     ON CONFLICT (merchant_id, period_start, period_end) DO NOTHING`,
  )
}

async function claimJobs(pool: DatabasePool, limit: number) {
  return withTransaction(pool, async (client) => {
    const result = await client.query<ClaimedJob>(
      `UPDATE insight_jobs
       SET status = 'PROCESSING', attempt_count = attempt_count + 1, updated_at = now()
       WHERE id IN (
         SELECT id FROM insight_jobs
         WHERE status IN ('QUEUED','FAILED') AND next_attempt_at <= now()
         ORDER BY created_at
         LIMIT $1
         FOR UPDATE SKIP LOCKED
       )
       RETURNING id, merchant_id, period_start::text, period_end::text`,
      [limit],
    )
    return result.rows
  })
}

async function processJob(pool: DatabasePool, job: ClaimedJob) {
  try {
    const repository = new ReportingRepository(pool)
    const timezone = await repository.merchantTimezone(job.merchant_id)
    const dashboard = await repository.dashboard(
      job.merchant_id,
      job.period_start,
      job.period_end,
      timezone,
    )
    const generated = await generateInsight({
      periodStart: job.period_start,
      periodEnd: job.period_end,
      ...dashboard.summary,
      topProducts: dashboard.topProducts.map(({ name, quantity, revenue }) => ({
        name,
        quantity,
        revenue,
      })),
    })
    await withTransaction(pool, async (client) => {
      const insightId = randomUUID()
      await client.query(
        `INSERT INTO business_insights (
           id, merchant_id, period_start, period_end, title, summary, recommendations, source
         ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8)`,
        [
          insightId,
          job.merchant_id,
          job.period_start,
          job.period_end,
          generated.title,
          generated.summary,
          JSON.stringify(generated.recommendations),
          generated.source,
        ],
      )
      await client.query(
        `UPDATE insight_jobs
         SET status = 'COMPLETED', insight_id = $1, last_error = NULL, updated_at = now()
         WHERE id = $2`,
        [insightId, job.id],
      )
    })
    incrementMetric("insight_jobs_completed_total")
  } catch (error) {
    await pool.query(
      `UPDATE insight_jobs
       SET status = 'FAILED', last_error = $1,
           next_attempt_at = now() + interval '5 minutes', updated_at = now()
       WHERE id = $2`,
      [error instanceof Error ? error.message : "Unknown insight failure", job.id],
    )
    incrementMetric("insight_jobs_failed_total")
  }
}
