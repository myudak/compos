# Operations Runbook

## Fast checks

```bash
curl http://localhost:8080/health
curl http://localhost:8080/metrics
docker compose ps
docker compose logs --tail 200 api rabbitmq postgres
```

Health is `healthy` when DB/Rabbit are reachable, `degraded` when optional async dependency is down,
and unhealthy when canonical DB/write path cannot operate.

## Rabbit unavailable

Expected: checkout remains local, REST auth/catalog/reporting stays available, sync enqueue may return
retryable 503, receipt dispatcher resumes after broker recovery. Do not clear browser IndexedDB or
generate replacement offline UUIDs.

1. Check Rabbit container/node/disk alarm and network/DNS.
2. Restore broker; verify durable exchanges/queues/retry/DLQ declared.
3. Watch unpublished receipt count and consumer lag return to zero.
4. Verify duplicate count remains zero and sample receipt reaches terminal.

## DLQ/failing receipt

Owner sees terminal failures. Inspect classification and payload/request ID. Retry only if failure is
marked retryable and root cause is fixed. Permanent validation or payload-hash mismatch must not be
forced through.

## Stock conflict

Review product, snapshot, requested quantity, and physical stock. Confirm if merchant accepts negative
stock/discrepancy; otherwise void. Both actions are audit events. Never edit canonical transaction row.

## Payment exception

Open reconciliation only with a reason/evidence note. Valid closes without transaction mutation.
Invalid resolution must atomically create payment `FAILED`, append-only correction, effective void,
and reporting reversal. Escalate if any part is missing.

## Reporting lag

Compare `data_as_of`, projection queue depth, backend outbox age, and canonical ledger count. Replay
projection idempotently; do not hand-edit aggregate rows. Timezone is merchant timezone.

## Backup/restore

Production requires automatic PostgreSQL backup + PITR. Quarterly restore drill verifies schema,
transaction/payment/correction links, outbox replay, and dashboard convergence. Rabbit is transport;
unpublished durable receipts/backend outbox in PostgreSQL remain recovery anchors.
