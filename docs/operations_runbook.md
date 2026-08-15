# Operations Runbook

## Health and signals

```bash
curl http://localhost:3001/health
curl -H "Accept: text/plain" http://localhost:3001/metrics
```

Watch API error/latency, sync outcome counts, database transaction latency, backend outbox pending/lag, open discrepancies, auth failures, and worker retry errors. Structured logs include request, batch, merchant, device, transaction, result, and latency identifiers without PIN or bearer token.

## Incident playbooks

### API or database unavailable

1. Confirm health and database reachability; inspect recent deploy/connection saturation.
2. Keep Operator clients offline; do not ask cashiers to clear browser data or logout.
3. Restore API/database, then observe bounded queue drain and duplicate outcome ratio.
4. Escalate if oldest outbox age continues rising after recovery.

### Worker lag

1. Check `backend_outbox_pending` and `outbox_lag_seconds`.
2. Inspect `last_error`, event type coverage, locks, and database capacity.
3. Restart/scale worker safely; processed/movement uniqueness makes replay idempotent.
4. Never manually mark events processed without verifying the business effect.

### Duplicate or payload conflict report

Query merchant + transaction ID and compare payload hash/events. `ALREADY_PROCESSED` is healthy after a lost response. `ID_REUSE_PAYLOAD_MISMATCH` indicates a client identity bug or altered retry and must not be overwritten.

### Device/account compromise

Admin revokes the device or deactivates/resets the operator. Confirm related `auth_sessions.revoked_at`; rotate activation/JWT secrets for broader exposure. Local queued data remains on device, so follow physical-device policy.

### Negative inventory

Confirm worker replay is complete, inspect movement uniqueness, then Admin performs physical count and resolves the discrepancy with a note. Do not edit catalog stock.

## Backup expectations

Managed PostgreSQL: daily backups plus point-in-time recovery, encrypted and restore-tested quarterly. PWA local data is operational resilience, not the system backup. Define retention for audit/transactions before production.

## Ringkasan keputusan (Bahasa Indonesia)

Saat server down, kasir tetap offline dan data browser tidak boleh dihapus. Recovery dipantau lewat outbox lag dan hasil sync. Worker aman di-replay karena idempoten. Konflik payload tidak boleh dioverwrite. Device compromise ditangani lewat revocation/session invalidation; discrepancy stok lewat stock opname dan audit, bukan edit katalog.
