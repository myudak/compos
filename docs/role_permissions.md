# Role dan Permission

| Capability                                        | `OPERATOR` | `ADMIN` | `OWNER` |
| ------------------------------------------------- | :--------: | :-----: | :-----: |
| Login COMPOS Operator                             |     Ya     |   Ya    |  Tidak  |
| Offline checkout dan provisional receipt          |     Ya     |   Ya    |  Tidak  |
| Lihat local catalog, transaction, dan sync queue  |     Ya     |   Ya    |  Tidak  |
| Void provisional transaction                      |     Ya     |   Ya    |  Tidak  |
| Mengubah settled transaction                      |   Tidak    |  Tidak  |  Tidak  |
| Payment correction dan inventory reconciliation   |   Tidak    |   Ya    |  Tidak  |
| Kelola Operator/Admin, device, catalog, dan harga |   Tidak    |   Ya    |  Tidak  |
| Login COMPOS Owner                                |   Tidak    |  Tidak  |   Ya    |
| Lihat dashboard dan product performance           |   Tidak    |  Tidak  |   Ya    |
| Generate dan lihat insight history                |   Tidak    |  Tidak  |   Ya    |
| Mengakses merchant lain                           |   Tidak    |  Tidak  |  Tidak  |

## Provisioning akun

Tidak ada public signup. Merchant Admin hanya dapat membuat `OPERATOR` atau `ADMIN`. Final active
Admin tidak boleh dinonaktifkan, dan Admin tidak boleh demote/deactivate dirinya sendiri. Reset PIN,
account deactivation, role change, dan device revocation menginvalidasi server sessions terdampak.

`OWNER` adalah role produk, tetapi ownership tidak dikelola dari HTTP Admin API. Onboarding memakai
`pnpm --filter @operator/api owner:provision` dengan merchant/operator identity dan `OWNER_PIN`
melalui environment. Command melakukan bcrypt hashing, tenant uniqueness, dan SYSTEM audit tanpa
mencetak PIN.

## Boundary aplikasi

- `/v1/owner/*` hanya menerima Owner.
- Sync, bootstrap, catalog operasional, dan transaction query hanya menerima Operator/Admin.
- Admin mutation tetap Admin-only.
- Operator UI mengarahkan Owner ke `/owner/`; Owner UI memberi link kembali untuk akun counter.
- UI guard adalah UX. Enforcement utama selalu server-side lewat session identity.

## Offline authorization timeline

- Sampai token expiry (12 jam): online API dan local checkout berjalan normal.
- Setelah token expired tetapi offline lease belum habis (maksimal 72 jam): local checkout masih
  boleh; sync menunggu re-authentication.
- Setelah offline lease habis: existing data tetap readable dan queued, tetapi checkout baru
  diblokir.

Owner PWA online-first. Cached shell atau last rendered report tidak berarti analytics fresh tanpa
koneksi; UI selalu menampilkan `dataAsOf` dan `projectionLagSeconds`.
