# Testing Strategy

## Test pyramid

| Layer                  | Scope                                                                                                                                                                              |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit                   | Payment rules, transaction construction, retry/backoff transitions, offline lease, operator/final-Admin policy, Zod contracts.                                                     |
| Browser persistence    | Atomic sale/outbox, negative local projection, ordered draft saves, restart recovery, void, session expiry with fake IndexedDB.                                                    |
| PostgreSQL integration | Isolated `operator_pos_test`: idempotency, lost response, two devices, partial/mass batch, immutable correction, worker replay, revocation, user/catalog policy, tenant isolation. |
| Playwright             | Eight production-build cases: offline reload, reconnect, dropped response, two contexts, partial rejection, Admin user, Admin catalog, lease expiry.                               |

## Commands

```bash
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm ci
```

Integration tests recreate only the exact guarded database `operator_pos_test`, migrate/seed it, run an API on port 3101, then terminate sessions and drop the database. Playwright requires the main project database to be migrated/seeded and starts/reuses API `3001` plus preview `4173`.

## Acceptance gates

- Formatting, lint, typecheck, unit, integration, E2E, and build must pass.
- Failures retain Playwright screenshot/video/trace in CI.
- Tests assert externally observable state and database invariants, not implementation call counts.
- Lost-response tests intentionally allow the first backend commit and discard its response before retry.

## Coverage gaps to revisit

Performance/load at 500+ merchants, long-running browser storage quota, real device reboot, backup restore drill, accessibility audit, and chaos against a deployed multi-replica topology remain pre-production activities.

## Ringkasan keputusan (Bahasa Indonesia)

Test tidak hanya memeriksa happy path. Fake IndexedDB membuktikan atomic local write, PostgreSQL terisolasi membuktikan constraint dan worker, sedangkan Playwright membuktikan delapan alur demo pada production build. Load, backup-restore, quota browser, dan accessibility audit masih perlu sebelum produksi nyata.
