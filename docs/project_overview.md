# Gambaran Proyek

COMPOS adalah aplikasi kasir offline-first untuk merchant dengan counter yang koneksinya kadang stabil, kadang ngilang, sementara beberapa device bisa tetap berjualan bersamaan. Prinsip utamanya simpel: transaksi yang sudah dikonfirmasi di device tidak boleh ikut hilang cuma karena internet putus.

## Outcome produk

Kasir bisa login, memuat katalog merchant, checkout dengan Cash, Static QRIS, atau Transfer, lalu menerbitkan provisional receipt walaupun sedang offline. Saat koneksi kembali, COMPOS menyelesaikan queued sales ke backend secara idempotent. Admin merchant mengelola akun kasir, device, katalog dan harga, correction, discrepancy, serta audit history.

## Janji correctness

1. Sebelum receipt tampil, checkout dan outbox intent sudah tersimpan atomically di IndexedDB.
2. Setiap sale punya stable client-generated ID dan maksimal diterima sekali oleh uniqueness boundary milik merchant.
3. Lost HTTP response aman: retry payload yang sama mengembalikan hasil lama tanpa membuat transaksi duplikat.
4. Transaksi yang sudah settled bersifat immutable; perubahan dilakukan lewat append-only correction.
5. Queued data tetap ada melewati logout, token expiry, browser restart, dan connection loss.
6. Inventory adalah eventually consistent projection setelah backend menerima transaksi, bukan reservation system saat checkout.

## Batas aplikasi

Repo ini mengimplementasikan COMPOS Operator sebagai installable React PWA beserta API dan worker-nya. Merchant memakai role `OPERATOR` untuk checkout dan `ADMIN` untuk pengelolaan serta exception workflow.

## Struktur repo

```text
apps/
  operator-web/    React, Vite, PWA, IndexedDB
  api/             Fastify, PostgreSQL, worker
packages/
  contracts/       Runtime Zod schemas dan inferred DTOs
docs/              Product and engineering playbook
```

Sengaja cuma ada satu shared runtime package. PostgreSQL tetap dimiliki API, sedangkan browser persistence tetap menjadi detail COMPOS Operator. Package baru hanya layak dibuat kalau memang ada minimal dua consumer nyata.

## Di luar scope

- Native React Native app atau aplikasi role terpisah.
- Central inventory reservation atau strong consistency lintas device saat offline.
- Public self-signup, payment-gateway verification untuk Static QRIS/Transfer, dan broker seperti RabbitMQ.
- Production multi-region deployment; dokumen deployment menjelaskan jalur menuju sana, bukan mengklaim prototype sudah live-grade.
