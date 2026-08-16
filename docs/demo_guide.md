# Panduan Demo

## Persiapan

```bash
pnpm install
pnpm db:up
pnpm db:reset
pnpm dev
```

Buka `http://localhost:5173` di clean browser profile. Kasir: `KEDAI-NUSA / RANI / 1234`; Admin: `KEDAI-NUSA / ADMIN / 9999`; activation code: `COMP18-DEMO`.

## Alur presentasi 8–10 menit

1. **Problem (45 detik):** koneksi UMKM tidak stabil, provisional vs settled, dan multi-device.
2. **Architecture (60 detik):** buka [system diagram](system_architecture.md); jelaskan local commit, stable ID, PostgreSQL acceptance, dan worker.
3. **Offline sale (90 detik):** login, klik **Coba offline**, tambah item, pilih Cash/QRIS, confirm. Tunjukkan provisional receipt dan pending outbox.
4. **Durability (30 detik):** reload browser; transaction, cart/catalog, dan queue tetap ada.
5. **Reconnect (60 detik):** klik **Hubungkan**; receipt menjadi settled dan queue berkurang.
6. **Lost response (45 detik):** tunjukkan test/evidence bahwa commit pertama sukses, response hilang, retry menghasilkan `ALREADY_PROCESSED`.
7. **Admin (90 detik):** masuk sebagai Admin; buat/deactivate cashier, edit harga, lalu soft-archive product.
8. **Exception flow (60 detik):** tampilkan payment correction dan inventory discrepancy; original transaction tetap immutable.
9. **Evidence (45 detik):** tunjukkan `pnpm run ci`, traceability matrix, test, dan CI artifacts.
10. **Trade-off (45 detik):** PWA vs React Native, PostgreSQL outbox vs RabbitMQ, stale catalog, dan eventual inventory.

## Command berguna

```bash
pnpm test:integration
pnpm test:e2e
curl -H "Accept: text/plain" http://localhost:3001/metrics
```

## Kalau live demo bermasalah

- Browser data memang durable; pakai profile baru untuk clean run.
- Kalau port bentrok, stop dev process lama. Jangan asal clear production-like data.
- Kalau fixture PostgreSQL berubah, jalankan guarded `pnpm db:reset`, lalu restart `pnpm dev`.
- Siapkan screenshot, Playwright trace, dan integration output sebagai fallback evidence.

Demo yang kuat bukan cuma happy path. Fokuskan narasi ke bukti bahwa sale tidak hilang, retry tidak menduplikasi transaksi, dan Admin tetap punya controlled recovery flow.
