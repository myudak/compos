type MetricName =
  | "sync_requests_total"
  | "transactions_accepted_total"
  | "transactions_duplicate_total"
  | "transactions_rejected_total"
  | "corrections_created_total"
  | "inventory_discrepancy_total"

const counters = new Map<MetricName, number>()

export function incrementMetric(name: MetricName, amount = 1) {
  counters.set(name, (counters.get(name) ?? 0) + amount)
}

export function metricsSnapshot() {
  return Object.fromEntries(counters.entries())
}

export function metricsAsPrometheus() {
  return ([...counters.entries()].map(([name, value]) => `# TYPE ${name} counter\n${name} ${value}`).join("\n") || "# no metrics recorded") + "\n"
}
