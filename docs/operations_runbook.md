# Operations Runbook

## Health dan signals

```bash
curl http://localhost:3001/health
curl -H "Accept: text/plain" http://localhost:3001/metrics
```

Untuk hosted same-origin demo, gunakan URL web service yang sama:

```bash
curl https://your-compos-host/health
curl -H "Accept: text/plain" https://your-compos-host/metrics
```

Kalau `/` sehat tetapi `/health` gagal, browser mungkin masih menampilkan cached PWA. Treat API dan
database health sebagai source of truth untuk kemampuan sync; jangan meminta kasir clear IndexedDB.

Pantau API error/latency, sync outcome, database transaction latency, backend outbox pending/lag, open discrepancy, auth failure, dan worker retry. Structured log boleh membawa request, batch, merchant, device, transaction, result, dan latency ID—tetapi tidak boleh PIN atau bearer token.

## Incident playbooks

### API atau database unavailable

1. Cek health, database reachability, recent deploy, dan connection saturation.
2. Biarkan COMPOS Operator bekerja offline; jangan minta kasir clear browser data atau logout.
3. Pulihkan service, lalu pantau bounded queue drain dan duplicate outcome ratio.
4. Escalate kalau oldest outbox age terus naik setelah recovery.

### Worker lag

1. Cek `backend_outbox_pending` dan `outbox_lag_seconds`.
2. Inspect `last_error`, event type coverage, lock, dan database capacity.
3. Restart/scale worker dengan aman; processed/movement uniqueness membuat replay idempotent.
4. Jangan mark event processed secara manual sebelum business effect terverifikasi.

### Duplicate atau payload conflict

Query merchant + transaction ID lalu compare payload hash dan events. `ALREADY_PROCESSED` sehat setelah lost response. `ID_REUSE_PAYLOAD_MISMATCH` berarti client identity bug atau altered retry; histori tidak boleh dioverwrite.

### Device/account compromise

Admin me-revoke device atau deactivate/reset operator. Pastikan `auth_sessions.revoked_at` terisi. Untuk exposure luas, rotate activation/JWT secret. Local queued data masih berada di device, jadi physical-device policy tetap dibutuhkan.

### Negative inventory

Pastikan worker replay selesai dan movement uniqueness benar. Setelah physical count, Admin resolve discrepancy dengan note. Jangan edit stock dari catalog management.

## Backup expectations

Managed PostgreSQL membutuhkan daily backup + point-in-time recovery yang encrypted dan diuji restore minimal per kuartal. Local PWA data adalah operational resilience, bukan system backup. Tetapkan retention audit/transaction sebelum production.

Render one-click demo tidak memenuhi expectation tersebut: free database tidak punya backup dan
kedaluwarsa setelah 30 hari. Hapus seluruh Render project setelah evaluasi agar paid worker berhenti.
Urutan deploy, smoke test, troubleshooting, dan teardown ada di
[Render Demo Deployment](render_demo_deployment.md).

## Owner/reporting incident

1. Cek `reporting_lane_queue_depth`, `insight_lane_queue_depth`, pool waiting, dan
   `projectionLagSeconds`.
2. Kalau settlement sehat tetapi dashboard stale, fokus ke reporting lane; jangan scale operational
   pool secara refleks.
3. Provider fallback naik berarti external dependency bermasalah. Local insight tetap valid dan wajib
   tampil sebagai `LOCAL_ANALYTICS`.
4. Replay reporting event aman selama `reporting_applied_transactions` utuh. Jangan edit aggregate
   manual sebelum ledger-to-projection reconciliation dijalankan.
