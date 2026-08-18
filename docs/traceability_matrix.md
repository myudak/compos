# Traceability Matrix

| Requirement               | Implementation/API                               | Automated evidence                        | Demo                                 |
| ------------------------- | ------------------------------------------------ | ----------------------------------------- | ------------------------------------ |
| FR-01–05 auth/user/device | Nest auth/users/devices, sessions, offline lease | backend role/tenant/device integration    | login 3 role, revoke device          |
| FR-06–07 local checkout   | Operator checkout service + Dexie repositories   | fake IndexedDB and reload tests           | offline pay + reload                 |
| FR-08–10 durable sync     | `/api/v1/sync`, receipts, Rabbit retry/DLQ       | PostgreSQL/Rabbit E2E + lost response     | queue/replay/degraded broker         |
| FR-11 stale catalog       | immutable item/catalog snapshot                  | backend archived-product and browser flow | Entry archives, Operator sells cache |
| FR-12 conflict            | receipt conflict + Owner resolution              | conflict confirm/void integration/E2E     | Owner sync desk                      |
| FR-13 catalog/stock       | Entry product and stock endpoints/PWA            | role/tenant + browser scenario            | edit/archive/adjust                  |
| FR-14 payment verified    | settlement payment policy                        | payment policy/unit + integration         | inspect normal sale                  |
| FR-15–16 exception case   | payments reconciliation endpoint/tables          | valid/invalid atomic flow                 | invalid reconciliation               |
| FR-17 audit               | merchant audit events + Owner page               | mutation audit assertions                 | audit trail                          |
| FR-18 reporting           | backend outbox + daily/product projections       | replay/timezone/convergence tests         | freshness dashboard                  |
| FR-19 tenant isolation    | guards + merchant predicates                     | cross-merchant integration                | API 403/not-found proof              |
| FR-20 app isolation       | role gate + separate PWA scopes                  | Playwright role isolation                 | wrong-role login                     |

OpenAPI snapshot maps public endpoint schema to frontend client. `pnpm openapi:check` prevents silent
backend/client drift.
