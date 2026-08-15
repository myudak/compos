# Role and Permission Matrix

| Capability                                   | Cashier / OPERATOR | Merchant ADMIN | OWNER |
| -------------------------------------------- | :----------------: | :------------: | :---: |
| Login to Operator Web                        |        Yes         |      Yes       |  No   |
| Offline checkout and provisional receipt     |        Yes         |      Yes       |  No   |
| View local catalog, transactions, sync queue |        Yes         |      Yes       |  No   |
| Void provisional transaction                 |        Yes         |      Yes       |  No   |
| Modify settled transaction                   |         No         |       No       |  No   |
| Append payment correction                    |         No         |      Yes       |  No   |
| Resolve inventory discrepancy                |         No         |      Yes       |  No   |
| Create/deactivate/reset Operator/Admin       |         No         |      Yes       |  No   |
| Revoke merchant device                       |         No         |      Yes       |  No   |
| Create/edit/archive catalog and price        |         No         |      Yes       |  No   |
| Directly edit stock in catalog               |         No         |       No       |  No   |
| Access another merchant                      |         No         |       No       |  No   |

## Provisioning policy

There is no public signup. A merchant Admin creates `OPERATOR` or `ADMIN` accounts. The final active Admin cannot be removed, and an Admin cannot demote/deactivate itself. PIN reset, account deactivation, role change, and device revocation invalidate affected server sessions.

`OWNER` is reserved for the future Owner app. Keeping it in the backend role vocabulary prevents accidental reuse while the Operator contracts explicitly exclude it.

## Offline authorization

- Up to token expiry (12 hours): online API and local checkout work.
- After token expiry but before offline lease expiry (72 hours): local checkout works; sync waits for re-authentication.
- After lease expiry: existing data is readable and queued, but new checkout is blocked.

## Ringkasan keputusan (Bahasa Indonesia)

Kasir hanya menjalankan checkout dan melihat data operasional. Admin toko mendapat user/device, katalog, correction, dan reconciliation dalam merchant yang sama. OWNER sengaja tidak dapat masuk aplikasi Operator. Aturan last-admin dan invalidasi sesi mencegah merchant kehilangan kontrol atau sesi lama tetap aktif.
