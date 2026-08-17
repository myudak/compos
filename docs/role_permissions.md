# Role dan Permission

| Capability                                       | Kasir / `OPERATOR` | Merchant `ADMIN` |
| ------------------------------------------------ | :----------------: | :--------------: |
| Login ke COMPOS Operator                         |         Ya         |        Ya        |
| Offline checkout dan provisional receipt         |         Ya         |        Ya        |
| Lihat local catalog, transaction, dan sync queue |         Ya         |        Ya        |
| Void provisional transaction                     |         Ya         |        Ya        |
| Mengubah settled transaction                     |       Tidak        |      Tidak       |
| Membuat payment correction                       |       Tidak        |        Ya        |
| Resolve inventory discrepancy                    |       Tidak        |        Ya        |
| Membuat/deactivate/reset Operator atau Admin     |       Tidak        |        Ya        |
| Revoke device merchant                           |       Tidak        |        Ya        |
| Membuat/edit/archive catalog dan harga           |       Tidak        |        Ya        |
| Edit stock langsung dari catalog                 |       Tidak        |      Tidak       |
| Mengakses merchant lain                          |       Tidak        |      Tidak       |

## Account provisioning

Tidak ada public signup. Merchant Admin membuat akun `OPERATOR` atau `ADMIN`. Final active Admin tidak boleh dinonaktifkan, dan seorang Admin tidak boleh demote/deactivate dirinya sendiri. Reset PIN, account deactivation, role change, dan device revocation menginvalidasi server sessions yang terdampak.

COMPOS hanya mengenal role `OPERATOR` dan `ADMIN`. Menambah role baru membutuhkan contract,
permission matrix, tenant boundary, migration, dan test yang eksplisit.

## Offline authorization timeline

- Sampai token expiry (12 jam): online API dan local checkout berjalan normal.
- Setelah token expired tetapi offline lease belum habis (maksimal 72 jam): local checkout masih boleh; sync menunggu re-authentication.
- Setelah offline lease habis: existing data tetap readable dan queued, tetapi checkout baru diblokir.

Permission check wajib dilakukan server-side. Menyembunyikan tombol di UI hanya UX guard, bukan security boundary.
