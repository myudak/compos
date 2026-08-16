# Strategi Testing

Tujuan test COMPOS bukan cuma mengejar coverage, tetapi membuktikan invariants paling berisiko: local atomicity, durable recovery, idempotency, merchant isolation, session policy, dan immutable settlement.

## Test pyramid

| Layer                           | Fokus                                                                                                                      |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Unit                            | Payment rules, transaction construction, sync transition/backoff, offline lease, permission, last-admin protection.        |
| Browser persistence integration | Atomic checkout, ordered draft, restart/void, outbox recovery, catalog replacement, expired session dengan fake IndexedDB. |
| API/PostgreSQL integration      | Login/logout/revocation, tenant isolation, admin user/catalog, lost response, partial batch, correction, worker replay.    |
| Playwright                      | Production-build user journey lintas offline/reload/reconnect dan multi-context.                                           |

## Skenario E2E utama

1. Offline checkout lalu browser reload.
2. Reconnect dan automatic settlement.
3. Successful response dijatuhkan, lalu retry exactly-once.
4. Dua browser/device context pada merchant yang sama.
5. Partial batch rejection.
6. Admin membuat/deactivate kasir dan permission tetap enforce.
7. Admin mengubah harga/archive product lalu catalog refresh.
8. Offline lease expired: data tetap ada, checkout baru diblokir.

## Command

```bash
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm run ci
```

Integration test memakai database terisolasi `operator_pos_test`. Playwright menjalankan production build dan menyimpan trace/screenshot saat failure. CI menjalankan frozen install, format, type-aware lint, strict typecheck, unit/integration test, build, lalu browser scenarios dengan artifact on failure.

## Evidence dan batasannya

Automated tests adalah executable evidence untuk behavior yang repeatable. Demo manual tetap diperlukan untuk UX dan presentasi, sedangkan load, security, accessibility, serta restore drills perlu dilakukan sebelum production. Test yang bergantung ke time/random/network harus memakai injected ports atau controlled fixtures supaya deterministic.
