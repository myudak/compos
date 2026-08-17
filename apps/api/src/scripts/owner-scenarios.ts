import type { DatabasePool } from "../db.js"
import { withTransaction } from "../database/transaction.js"
import { processInsightJobs } from "../modules/insights/processor.js"
import {
  applyTransactionProjection,
  processReportingOutbox,
} from "../modules/reporting/projection.js"

type Session = {
  token: string
  merchantId: string
  operator: { id: string }
}

export async function verifyOwnerIntelligence(input: {
  pool: DatabasePool
  deviceId: string
  login: (deviceId: string, operatorCode?: string, pin?: string) => Promise<Session>
  request: <T>(path: string, init?: RequestInit) => Promise<T>
}) {
  while (await processReportingOutbox(input.pool, 100)) {
    /* drain reporting events to convergence */
  }
  const owner = await input.login(input.deviceId, "OWNER", "7777")
  const dashboard = await input.request<{
    summary: { transactionCount: number; netSales: number }
  }>("/v1/owner/dashboard", { headers: { authorization: `Bearer ${owner.token}` } })
  const canonical = await input.pool.query<{ transaction_count: string; net_sales: string }>(
    `SELECT count(*)::text AS transaction_count, coalesce(sum(total), 0)::text AS net_sales
     FROM transactions
     WHERE merchant_id = $1 AND transaction_status = 'CONFIRMED'`,
    [owner.merchantId],
  )
  if (
    dashboard.summary.transactionCount !== Number(canonical.rows[0]?.transaction_count) ||
    dashboard.summary.netSales !== Number(canonical.rows[0]?.net_sales)
  ) {
    throw new Error("Owner reporting projection did not converge with the canonical ledger")
  }
  const appliedTransaction = await input.pool.query<{ transaction_id: string }>(
    `SELECT transaction_id FROM reporting_applied_transactions
     WHERE merchant_id = $1 ORDER BY applied_at LIMIT 1`,
    [owner.merchantId],
  )
  const transactionId = appliedTransaction.rows[0]?.transaction_id
  if (!transactionId) throw new Error("Owner projection has no applied transaction evidence")
  const replayApplied = await withTransaction(input.pool, (client) =>
    applyTransactionProjection(client, owner.merchantId, transactionId),
  )
  if (replayApplied) throw new Error("Reporting projection applied the same transaction twice")

  const queued = await input.request<{ job: { id: string } }>("/v1/owner/insights/generate", {
    method: "POST",
    headers: { authorization: `Bearer ${owner.token}` },
  })
  await processInsightJobs(input.pool)
  const completed = await input.request<{ job: { status: string } }>(
    `/v1/owner/insight-jobs/${queued.job.id}`,
    { headers: { authorization: `Bearer ${owner.token}` } },
  )
  if (completed.job.status !== "COMPLETED") {
    throw new Error(`local Owner insight: expected COMPLETED, got ${completed.job.status}`)
  }

  let operationalStatus = 0
  try {
    await input.request("/v1/transactions", {
      headers: { authorization: `Bearer ${owner.token}` },
    })
  } catch (error) {
    operationalStatus = (error as { status?: number }).status ?? 0
  }
  if (operationalStatus !== 403) {
    throw new Error(`Owner operational boundary: expected HTTP 403, got ${operationalStatus}`)
  }
}
