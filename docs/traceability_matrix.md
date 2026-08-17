# Traceability Matrix

Matrix ini menghubungkan product requirement ke implementation boundary, API, automated evidence, dan langkah demo. Tujuannya biar klaim produk gampang diverifikasi, bukan cuma terdengar meyakinkan.

| Req                      | Implementation / API                                                    | Automated evidence                                 | Demo evidence                                        |
| ------------------------ | ----------------------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------- |
| FR-01 Auth & user admin  | Auth service; `/v1/auth/login`, `/logout`; `/v1/admin/operators`        | Session/login/logout, last-admin, permission tests | Login sebagai Kasir/Admin; create/deactivate cashier |
| FR-02 Device lifecycle   | Persistent device identity; `/v1/devices/register`; `/v1/admin/devices` | Registration dan revocation integration            | Revoke device lalu tunjukkan re-auth requirement     |
| FR-03 Offline checkout   | `confirmSale`; atomic Dexie repository                                  | Atomic checkout + offline Playwright               | Putuskan koneksi lalu confirm sale                   |
| FR-04 Restart recovery   | IndexedDB repositories dan ordered draft persistence                    | Reload/restart integration + E2E                   | Reload; sale/queue tetap ada                         |
| FR-05 Reconnect sync     | Scheduler, health probe, due query, single-flight service               | Reconnect E2E                                      | Klik Hubungkan; queue drain                          |
| FR-06 Idempotency        | Payload hash; merchant/transaction uniqueness; sync API                 | Lost-response + ID mismatch integration/E2E        | Tunjukkan retry `ALREADY_PROCESSED`                  |
| FR-07 Visible status     | Receipt, transaction list/detail, connection status                     | Component/journey assertions                       | Bandingkan provisional vs settled                    |
| FR-08 Multi-device       | Installation ID dan merchant-scoped acceptance                          | Two-context Playwright                             | Jelaskan dua device satu merchant                    |
| FR-09 Payment semantics  | Payment policies dan snapshot contract                                  | Payment unit tests                                 | Cash lalu Static QRIS/Transfer                       |
| FR-10 Lifecycle/void     | Transaction/outbox state transition policy                              | Restart, void, settled immutability tests          | Void provisional; settled tidak editable             |
| FR-11 Correction         | `/v1/admin/transactions/:id/corrections`                                | Correction + immutability integration              | Tambahkan correction dan tunjukkan original          |
| FR-12 Eventual inventory | PostgreSQL backend outbox + worker                                      | Worker replay/idempotency integration              | Tunjukkan stock setelah settlement                   |
| FR-13 Discrepancy        | Inventory module dan Admin resolution API                               | Negative stock/replay/resolution tests             | Resolve physical-count discrepancy                   |
| FR-14 Partial batch      | Batch max 25; ordered per-item result                                   | Partial rejection integration/E2E                  | Tunjukkan mixed result evidence                      |
| FR-15 Catalog admin      | `/v1/admin/products` create/patch/archive/restore                       | SKU/price/archive/tenant tests                     | Edit harga dan archive product                       |
| FR-16 Stale catalog      | Bootstrap refresh + local catalog replacement                           | Catalog replacement + reconnect E2E                | Offline pakai catalog lama, lalu refresh             |
| FR-17 Session lease      | JWT `jti`, server sessions, local 72h lease                             | Expiry/revocation/unit/E2E                         | Expired lease: data ada, checkout blocked            |
| FR-18 Isolation & audit  | Merchant-scoped repositories; audit events                              | Cross-merchant and audit integration               | Buka Admin audit context                             |

## NFR evidence

| NFR                    | Evidence                                                                                        |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| Durability/correctness | Atomic persistence, lost-response, payload mismatch, restart recovery tests.                    |
| Security/isolation     | bcrypt, server-side `jti`, RBAC, merchant-scoped integration tests, log redaction policy.       |
| Maintainability        | Workspace boundaries, canonical contracts, strict typecheck/lint, source-size rules.            |
| Observability          | `/health`, Prometheus-format `/metrics`, request/batch/transaction structured logs.             |
| Recoverability         | Guarded reset untuk prototype; deployment/runbook mendefinisikan backup/PITR dan restore drill. |

## Cara menjaga matrix tetap berguna

Setiap requirement baru harus punya ID, owner implementation, minimal satu test atau alasan kenapa manual, dan demo/operational evidence. Jangan menandai requirement selesai kalau matrix cuma menunjuk nama file tanpa behavior yang bisa diverifikasi.
