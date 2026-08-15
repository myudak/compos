# Requirements Traceability Matrix

| Requirement                     | Implementation                               | API / persistence                                    | Automated evidence                            | Demo                  |
| ------------------------------- | -------------------------------------------- | ---------------------------------------------------- | --------------------------------------------- | --------------------- |
| FR-01 User/session management   | Auth, Admin Users features; session services | `/v1/auth/*`, `/v1/admin/operators`; `auth_sessions` | Policy unit + isolated Admin scenario + E2E 6 | Admin user flow       |
| FR-02 Device lifecycle          | Stable device repo, Admin Device panel       | register/list/revoke; `devices`                      | Integration revocation; E2E contexts          | Device list/revoke    |
| FR-03 Offline checkout          | `confirmSale`, atomic repository             | IndexedDB sale + outbox                              | fake-IDB + E2E 1/8                            | Coba offline          |
| FR-04 Restart durability        | IndexedDB initialization/recovery            | `operator-pos-v3`                                    | fake-IDB + E2E reload                         | Browser reload        |
| FR-05 Reconnect sync            | scheduler + injected sync service            | `/health`, `/v1/sync/transactions`                   | sync unit + E2E 2                             | Hubungkan             |
| FR-06 No duplicate/loss         | stable UUID, payload hash                    | unique transaction PK/hash                           | isolated lost response + E2E 3                | Sync evidence         |
| FR-07 Provisional/settled       | status badges/receipt/ledger                 | local vs backend timestamps                          | E2E 1/2                                       | Receipt transition    |
| FR-08 Multi-device              | installation identity                        | merchant/device scope                                | integration + E2E 4                           | Two profiles          |
| FR-09 Payment methods           | payment rules/dialog                         | payment enums/snapshots                              | payment unit tests                            | Cash/QRIS/Transfer    |
| FR-10 Void lifecycle            | provisional action service                   | local transaction/outbox update                      | fake-IDB void test                            | Void provisional      |
| FR-11 Admin correction          | reconciliation feature                       | correction route/table/events/audit                  | integration immutable correction              | Reconciliation desk   |
| FR-12 Inventory after accept    | worker handlers                              | backend outbox/movements                             | integration worker replay                     | Explain worker        |
| FR-13 Discrepancy               | Inventory panel/resolution                   | discrepancy route/table                              | integration resolution                        | Resolve stock         |
| FR-14 Partial/mass batch        | pure sync policy/batch 25                    | ordered per-item response                            | integration 25+5 + E2E 5                      | Test output           |
| FR-15 Catalog pricing           | Admin Catalog feature                        | `/v1/admin/products`; soft archive                   | integration isolation + E2E 7                 | Edit/archive          |
| FR-16 Catalog refresh/staleness | login/start/reconnect/manual refresh         | bootstrap/products                                   | E2E catalog + API integration                 | Refresh catalog       |
| FR-17 Offline lease             | session repository/checkout guard            | login lease response                                 | session unit + E2E 8                          | Expire lease evidence |
| FR-18 Isolation/audit           | role routes/repositories                     | tenant predicates/audit table                        | integration other merchant                    | Explain boundary      |

## NFR evidence

| NFR                    | Evidence                                                                                       |
| ---------------------- | ---------------------------------------------------------------------------------------------- |
| Correctness/durability | Database constraints, atomic repositories, lost-response and reload tests.                     |
| Security               | bcrypt, JWT `jti`, DB revocation, role and merchant predicates, PIN/token log redaction.       |
| Scalability            | Stateless API, tenant indexes, batch 25, worker outbox, reconnect burst.                       |
| Maintainability        | pnpm workspaces, canonical Zod contracts, feature/API modules, source limits, type-aware lint. |
| Observability/recovery | request IDs, structured logs, metrics, health, operations runbook.                             |

## Ringkasan keputusan (Bahasa Indonesia)

Setiap FR case study ditautkan ke implementasi, endpoint/persistence, automated test, dan langkah demo. Matrix ini mencegah fitur terlihat “ada” hanya di dokumentasi atau UI tanpa invariant dan bukti test yang sesuai.
