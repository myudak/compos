# Functional Requirements

| ID    | Requirement                                                             | Acceptance boundary                                                              |
| ----- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| FR-01 | Login/logout terkontrol, pembuatan akun, reset PIN, role, dan aktivasi. | Auth/Admin API dan UI.                                                           |
| FR-02 | Device registration dan revocation oleh Admin.                          | Installation ID stabil; revoked session ditolak.                                 |
| FR-03 | Membuat dan mengonfirmasi transaksi tanpa internet.                     | Network tidak ada di local commit path.                                          |
| FR-04 | Recovery setelah restart.                                               | IndexedDB menyimpan draft, sale, outbox, catalog, session lease, dan device.     |
| FR-05 | Automatic sync ketika reconnect.                                        | Health probe, online event, timer, dan due query.                                |
| FR-06 | Mencegah duplicate/lost-response.                                       | Stable ID, payload hash, dan merchant-scoped unique constraint.                  |
| FR-07 | Status provisional dan settled terlihat jelas.                          | Receipt, list, detail, dan sync queue.                                           |
| FR-08 | Operasi concurrent multi-device.                                        | Identity per device; backend menerima transaksi satu merchant dengan aman.       |
| FR-09 | Cash, Static QRIS, dan Transfer.                                        | Cash system-verifiable; QRIS/Transfer operator-asserted.                         |
| FR-10 | Lifecycle pending/confirmed/void.                                       | Void hanya sebelum settlement; settled immutable.                                |
| FR-11 | Append-only correction khusus Admin.                                    | Original transaction tidak pernah di-update.                                     |
| FR-12 | Stock deduction setelah acceptance.                                     | Backend outbox worker membuat movement secara idempotent.                        |
| FR-13 | Negative-stock discrepancy dan resolution.                              | Maksimal satu open discrepancy per product; resolution diaudit.                  |
| FR-14 | Partial batch result dan bounded reconnect.                             | Maksimal 25 item; response order sama dengan candidate order.                    |
| FR-15 | Administrasi catalog dan pricing.                                       | SKU unik per merchant, soft archive, historical snapshot.                        |
| FR-16 | Catalog refresh dan stale-catalog operation.                            | Refresh saat login/start/reconnect/manual; historical snapshot diterima backend. |
| FR-17 | Session dan offline lease.                                              | Token 12 jam, checkout lease 72 jam, data tetap ada setelah expiry.              |
| FR-18 | Merchant isolation dan audit history.                                   | Semua query/mutation scoped ke merchant; Admin mutation diaudit.                 |

## Business rules

- PIN harus numerik, panjang 4–8 digit.
- Admin tidak boleh demote/deactivate dirinya sendiri atau menghapus final active Admin.
- Role yang didukung hanya `OPERATOR` dan `ADMIN`; semua permission tetap divalidasi server-side.
- Logout membersihkan active cart dan session setelah konfirmasi, tetapi device identity, catalog, confirmed sales, dan outbox tetap aman.
- Catalog administration online-only. Perubahan stock hanya lewat reconciliation.
- Harga/catalog offline boleh stale; item and price snapshot pada transaksi menjadi historical truth.
- Authentication failure mem-pause sync, bukan menghapus queued sales.

## Definition of done

Sebuah requirement dianggap selesai kalau behavior-nya ada, contract tervalidasi, failure mode tertangani, test relevan lulus, dan traceability matrix menunjuk ke evidence yang bisa didemokan.
