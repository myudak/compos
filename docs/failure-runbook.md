# Failure runbook

## Automated coverage

| Scenario | Expected invariant | Command |
|---|---|---|
| Network absent during checkout | Transaction + outbox durable; draft removed; stock projection updated atomically | `pnpm test` |
| Local validation fails | All IndexedDB writes roll back | `pnpm test` |
| Browser database reopens | Transaction and installation device ID remain | `pnpm test` |
| Backend committed but response is lost | Retry of same ID returns `ALREADY_PROCESSED`; one row only | `pnpm test:integration` |
| Two registered devices retry same stable ID | No duplicate; existing result returned | `pnpm test:integration` |
| Same ID, changed payload | Permanent conflict; original remains untouched | `pnpm test:integration` |
| One malformed transaction in a batch | Valid sibling settles; invalid item fails permanently | `pnpm test:integration` |
| 30-device-style reconnect workload | Requests are split into bounded 25 + 5 batches | `pnpm test:integration` |
| Settled payment correction | Original remains immutable; append-only correction is audited | `pnpm test:integration` |
| Negative inventory projection | Worker creates a discrepancy; admin resolves it explicitly | `pnpm test:integration` |
| Device revoked after token issued | Next sync is rejected with HTTP 403 | `pnpm test:integration` |

## Operator response

| Signal | Meaning | Action |
|---|---|---|
| Offline / saved on device | Checkout is durable locally, backend not yet proven reachable | Continue selling; reconnect when practical |
| Pending sync | Outbox still owns delivery | Wait for automatic retry or use Retry |
| Permanent failure | Payload/auth rule requires attention | Preserve the sale, inspect diagnostics, escalate to admin |
| Provisional payment | Backend has not settled the local record | Do not represent it as centrally reconciled |
| Open discrepancy | Historical sales drove inventory projection below expected stock | Count physical stock and resolve in Reconciliation |

## Incident checks

1. Call `/health`. A 503 means the API cannot reach PostgreSQL.
2. Check `backend_outbox_pending` and `outbox_lag_seconds` in `/metrics`. Rising values with a healthy API indicate the worker is stopped or failing.
3. Inspect structured API logs using `batchId`, `deviceId`, or `transactionId`; do not ask the cashier to create a replacement ID for a retry.
4. Restart the worker safely. Inventory movement uniqueness makes replay idempotent.
5. For a revoked/unknown device, reactivate a legitimate installation; never bypass merchant/device scope.

## Manual acceptance exercise

1. Start web, API, worker, and seeded PostgreSQL.
2. Log in as `RANI`, force offline, confirm a cash sale, reload, and verify it remains provisional.
3. Reconnect and verify it becomes settled without blocking a second checkout.
4. Stop the API after a local commit, retry, restore it, then verify eventual settlement.
5. Log in as `ADMIN` and verify original settled data stays unchanged when a correction is added.
