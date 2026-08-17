type MetricName =
  | "sync_requests_total"
  | "transactions_accepted_total"
  | "transactions_duplicate_total"
  | "transactions_rejected_total"
  | "corrections_created_total"
  | "inventory_discrepancy_total"
  | "reporting_projection_total"
  | "insight_jobs_completed_total"
  | "insight_jobs_failed_total"
  | "insight_provider_fallback_total"
  | "insight_external_requests_total"

type ObservationName =
  | "sync_batch_size"
  | "sync_latency_ms"
  | "database_transaction_latency_ms"
  | "operational_route_latency_ms"
  | "admin_route_latency_ms"
  | "reporting_route_latency_ms"
  | "insight_provider_latency_ms"

type Observation = { count: number; sum: number; max: number }

const counters = new Map<MetricName, number>()
const observations = new Map<ObservationName, Observation>()

export function incrementMetric(name: MetricName, amount = 1) {
  counters.set(name, (counters.get(name) ?? 0) + amount)
}

export function observeMetric(name: ObservationName, value: number) {
  const current = observations.get(name) ?? { count: 0, sum: 0, max: 0 }
  observations.set(name, {
    count: current.count + 1,
    sum: current.sum + value,
    max: Math.max(current.max, value),
  })
}

export function metricsSnapshot(gauges: Record<string, number> = {}) {
  return {
    counters: Object.fromEntries(counters.entries()),
    observations: Object.fromEntries(observations.entries()),
    gauges,
  }
}

export function metricsAsPrometheus(gauges: Record<string, number> = {}) {
  const lines = [...counters.entries()].flatMap(([name, value]) => [
    `# TYPE ${name} counter`,
    `${name} ${value}`,
  ])
  for (const [name, value] of Object.entries(gauges)) {
    lines.push(`# TYPE ${name} gauge`, `${name} ${value}`)
  }
  for (const [name, value] of observations.entries()) {
    lines.push(
      `# TYPE ${name} summary`,
      `${name}_count ${value.count}`,
      `${name}_sum ${value.sum}`,
      `${name}_max ${value.max}`,
    )
  }
  return `${lines.join("\n") || "# no metrics recorded"}\n`
}
