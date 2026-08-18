# Testing Strategy

Test K-POS membuktikan invariants dan failure behavior, bukan sekadar line coverage.

| Layer               | Bukti                                                                                                      |
| ------------------- | ---------------------------------------------------------------------------------------------------------- |
| Unit                | payment policy, roles, payload hash, sync transition, retry, timezone/report math                          |
| Browser integration | atomic checkout, ordered draft, reload recovery, session lease, terminal cleanup                           |
| PostgreSQL/Rabbit   | auth/device binding, receipt recovery, idempotency, mismatch, retries, conflict, reconciliation, reporting |
| Hosting             | three SPA deep links, service-worker scopes, API precedence, health/metrics                                |
| Playwright          | production build across three roles and degraded broker                                                    |

## Browser acceptance scenarios

1. Offline checkout survive reload.
2. Reconnect auto enqueue dan settle.
3. Dropped successful HTTP response retries exactly once.
4. Stock conflict terlihat Owner lalu di-confirm/void.
5. Entry archive product saat Operator masih memakai cached catalog.
6. Invalid payment reconciliation menghasilkan `FAILED` + append-only void.
7. Role isolation pada tiga UI dan endpoint.
8. Device revoke preserve queued local sale.
9. Owner report eventually converge.
10. Rabbit unavailable menghasilkan degraded health sementara REST login tetap jalan.

## Commands

```bash
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm run ci:full
```

Integration dan E2E memakai real PostgreSQL/RabbitMQ. Mock queue tidak cukup membuktikan publisher
confirm, retry TTL, ACK-after-commit, atau durable recovery.

## Performance evidence

Baseline load harus mencatat commit, OS/CPU/RAM, Docker limits, DB/Rabbit versions, merchant count,
duration, concurrency, dan percentile. Acceptance: local checkout p95 `<500ms`, enqueue `<500ms`,
settlement `<750ms`, dashboard `<1.5s`, projection lag `<30s`, zero duplicate/lost effect.

Local verification 18 Agustus 2026 pada Windows `win32/x64`, Node `v25.6.0`, dan Docker Desktop:

| Profile                |  Sale | Enqueue p95 | Settlement p95 | Dashboard p95 | Integrity                                |
| ---------------------- | ----: | ----------: | -------------: | ------------: | ---------------------------------------- |
| 50 merchant / 15 detik |   250 |   139,75 ms |          76 ms |      38,86 ms | 250/250 terminal; nol lost/duplicate     |
| 500 merchant / 5 menit | 5.000 |   127,60 ms |          71 ms |      25,57 ms | 5.000/5.000 terminal; nol lost/duplicate |

Production-build Playwright juga lulus 9/9 browser scenario dan Rabbit degraded/recovery smoke. Hasil ini adalah baseline supported local environment, bukan SLA production universal.
