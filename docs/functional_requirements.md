# Functional Requirements

| ID    | Requirement                                                     | Acceptance signal                                             |
| ----- | --------------------------------------------------------------- | ------------------------------------------------------------- |
| FR-01 | Owner onboarding membuat merchant + satu primary Owner.         | Transactional provisioning, tenant uniqueness.                |
| FR-02 | Login email/password, rotating refresh, logout/revocation.      | 15m access, 7d refresh, server session invalidation.          |
| FR-03 | Operator dapat membuka last offline session pada paired device. | Signed 7d lease; operator switch tetap online-only.           |
| FR-04 | Owner membuat/deactivate Entry atau Operator.                   | Owner creation dari HTTP ditolak.                             |
| FR-05 | Device adalah shared merchant counter dan bisa di-revoke.       | Server validates merchant/device/session binding.             |
| FR-06 | Operator checkout penuh tanpa network.                          | Atomic IndexedDB transaction + provisional receipt.           |
| FR-07 | Cart/draft survive reload tanpa resurrect stale write.          | Ordered durable draft persistence.                            |
| FR-08 | Sync batch durable dan replay-safe.                             | Receipt + publisher confirm + hash mismatch rejection.        |
| FR-09 | Operator melihat status settlement.                             | Poll `QUEUED/PROCESSING/SYNCED/CONFLICT/FAILED`.              |
| FR-10 | Rabbit transient error retry 5s/30s/120s lalu DLQ.              | Terminal failure visible dan eligible retry Owner-only.       |
| FR-11 | Stale catalog sale diterima dengan item snapshot.               | Same-merchant archived product tetap settle.                  |
| FR-12 | Stock shortage menjadi conflict.                                | Owner confirm negative stock atau void.                       |
| FR-13 | Entry mengelola catalog dan stock.                              | SKU uniqueness, soft archive, adjustment history.             |
| FR-14 | Payment normal langsung verified.                               | Cash/QRIS/transfer menghasilkan `VERIFIED`.                   |
| FR-15 | Reconciliation hanya exception workflow.                        | Open case → resolved valid/invalid.                           |
| FR-16 | Invalid payment resolution append-only.                         | Payment `FAILED` + correction/void atomic; original retained. |
| FR-17 | Owner melihat audit trail merchant.                             | Mutations mencatat actor, action, target, timestamp.          |
| FR-18 | Owner melihat eventual sales dashboard.                         | Gross/net, count, AOV, daily, top products, freshness.        |
| FR-19 | Semua data server merchant-scoped.                              | Cross-tenant integration test menolak akses.                  |
| FR-20 | Tiga PWA punya role isolation.                                  | Wrong-role redirect actionable + server-side 403.             |
