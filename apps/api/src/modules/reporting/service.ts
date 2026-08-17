import { randomUUID } from "node:crypto"

import type { AuthIdentity } from "../../auth.js"
import type { DatabasePool } from "../../db.js"
import { HttpError } from "../../http/errors.js"
import { ReportingRepository } from "./repository.js"

const DAY_MS = 86_400_000

export class ReportingService {
  private readonly reporting: ReportingRepository

  constructor(
    reportingPool: DatabasePool,
    private readonly commandPool: DatabasePool,
  ) {
    this.reporting = new ReportingRepository(reportingPool)
  }

  async dashboard(merchantId: string, requestedFrom?: string, requestedTo?: string) {
    const timezone = await this.reporting.merchantTimezone(merchantId)
    const today = dateInTimezone(new Date(), timezone)
    const to = requestedTo ?? today
    const from = requestedFrom ?? shiftDate(to, -29)
    assertDateWindow(from, to)
    return this.reporting.dashboard(merchantId, from, to, timezone)
  }

  async insights(merchantId: string, limit: number) {
    return this.reporting.insights(merchantId, limit)
  }

  async queueInsight(identity: AuthIdentity) {
    const timezone = await this.reporting.merchantTimezone(identity.merchantId)
    const periodEnd = dateInTimezone(new Date(), timezone)
    const periodStart = shiftDate(periodEnd, -29)
    const result = await this.commandPool.query<{ id: string }>(
      `INSERT INTO insight_jobs (
         id, merchant_id, requested_by, period_start, period_end
       ) VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (merchant_id, period_start, period_end) DO UPDATE SET
         updated_at = insight_jobs.updated_at
       RETURNING id`,
      [randomUUID(), identity.merchantId, identity.operatorId, periodStart, periodEnd],
    )
    return this.reporting.job(identity.merchantId, result.rows[0]!.id)
  }

  async job(merchantId: string, jobId: string) {
    const job = await this.reporting.job(merchantId, jobId)
    if (!job) throw new HttpError(404, "NOT_FOUND", "Insight job not found")
    return job
  }
}

function assertDateWindow(from: string, to: string) {
  const fromTime = Date.parse(`${from}T00:00:00Z`)
  const toTime = Date.parse(`${to}T00:00:00Z`)
  const days = (toTime - fromTime) / DAY_MS + 1
  if (!Number.isFinite(days) || days < 1 || days > 90) {
    throw new HttpError(400, "INVALID_REQUEST", "Report range must be between 1 and 90 days")
  }
}

function dateInTimezone(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}
