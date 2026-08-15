# Functional Requirements

| ID    | Requirement                                                                             | Acceptance boundary                                                         |
| ----- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| FR-01 | Controlled login, logout, account creation, PIN reset, role, and activation management. | Auth and Admin APIs plus UI.                                                |
| FR-02 | Device registration and Admin revocation.                                               | Stable installation ID; revoked sessions fail.                              |
| FR-03 | Offline transaction creation and confirmation.                                          | Network absent from local commit path.                                      |
| FR-04 | Durable restart recovery.                                                               | IndexedDB retains draft, sale, outbox, catalog, session lease, and device.  |
| FR-05 | Automatic reconnect synchronization.                                                    | Health probe, online event, timer, due query.                               |
| FR-06 | Duplicate/lost-response prevention.                                                     | Stable ID, payload hash, merchant-scoped unique constraints.                |
| FR-07 | Explicit provisional and settled UI/state.                                              | Receipt, list, detail, queue.                                               |
| FR-08 | Multi-device concurrent operation.                                                      | Independent device identities; same merchant accepted safely.               |
| FR-09 | Cash, Static QRIS, and Transfer handling.                                               | Cash system-verifiable; QRIS/Transfer operator-asserted.                    |
| FR-10 | Pending/confirmed/void lifecycle.                                                       | Void allowed only before settlement; settled is immutable.                  |
| FR-11 | Admin-only append-only correction.                                                      | Original transaction is never updated.                                      |
| FR-12 | Inventory deduction after acceptance.                                                   | Backend outbox worker applies idempotent movements.                         |
| FR-13 | Negative-stock discrepancy and Admin resolution.                                        | One open discrepancy/product; audited resolution.                           |
| FR-14 | Partial batch results and bounded reconnect.                                            | Maximum 25; response order preserved per candidate.                         |
| FR-15 | Catalog and price administration.                                                       | Merchant SKU uniqueness, soft archive, historical snapshots.                |
| FR-16 | Catalog refresh and stale-catalog operation.                                            | Login/start/reconnect/manual refresh; backend accepts historical snapshots. |
| FR-17 | Session and offline-lease policy.                                                       | 12-hour online token, 72-hour checkout lease, data preserved after expiry.  |
| FR-18 | Merchant isolation and audit history.                                                   | Every query/mutation is merchant-scoped; Admin mutations audited.           |

## Business rules

- PIN is numeric and 4–8 digits. Admin cannot demote/deactivate itself or remove the last active Admin.
- `OWNER` cannot be created or enter Operator Web.
- Logout clears the active cart/session but preserves device, catalog, confirmed sales, and outbox.
- Catalog administration is online-only. Stock changes belong to reconciliation.
- Offline catalog and price may be stale; the transaction item snapshot is authoritative history.

## Ringkasan keputusan (Bahasa Indonesia)

Requirement mencakup user management wajib Academy dan seluruh inti case study: persistence offline, sync idempoten, multi-device, payment semantics, immutable settlement, correction Admin, serta inventori eventual. Katalog stale tetap boleh dijual karena availability kasir lebih penting; snapshot item/harga menjaga histori.
