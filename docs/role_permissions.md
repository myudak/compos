# Role dan Permission

| Capability                                       | Kasir / `OPERATOR` | Merchant `ADMIN` | `OWNER` |
| ------------------------------------------------ | :----------------: | :--------------: | :-----: |
| Login ke COMPOS Operator                         |         Ya         |        Ya        |  Tidak  |
| Offline checkout dan provisional receipt         |         Ya         |        Ya        |  Tidak  |
| Lihat local catalog, transaction, dan sync queue |         Ya         |        Ya        |  Tidak  |
| Void provisional transaction                     |         Ya         |        Ya        |  Tidak  |
| Mengubah settled transaction                     |       Tidak        |      Tidak       |  Tidak  |
| Membuat payment correction                       |       Tidak        |        Ya        |  Tidak  |
| Resolve inventory discrepancy                    |       Tidak        |        Ya        |  Tidak  |
| Membuat/deactivate/reset Operator atau Admin     |       Tidak        |        Ya        |  Tidak  |
| Revoke device merchant                           |       Tidak        |        Ya        |  Tidak  |
| Membuat/edit/archive catalog dan harga           |       Tidak        |        Ya        |  Tidak  |
| Edit stock langsung dari catalog                 |       Tidak        |      Tidak       |  Tidak  |
| Mengakses merchant lain                          |       Tidak        |      Tidak       |  Tidak  |

## Account provisioning

Tidak ada public signup. Merchant Admin membuat akun `OPERATOR` atau `ADMIN`. Final active Admin tidak boleh dinonaktifkan, dan seorang Admin tidak boleh demote/deactivate dirinya sendiri. Reset PIN, account deactivation, role change, dan device revocation menginvalidasi server sessions yang terdampak.

`OWNER` dicadangkan untuk future Owner app. Mempertahankan role ini di vocabulary backend mencegah accidental reuse, sementara contract COMPOS Operator secara eksplisit menolaknya.

## Offline authorization timeline

- Sampai token expiry (12 jam): online API dan local checkout berjalan normal.
- Setelah token expired tetapi offline lease belum habis (maksimal 72 jam): local checkout masih boleh; sync menunggu re-authentication.
- Setelah offline lease habis: existing data tetap readable dan queued, tetapi checkout baru diblokir.

Permission check wajib dilakukan server-side. Menyembunyikan tombol di UI hanya UX guard, bukan security boundary.
