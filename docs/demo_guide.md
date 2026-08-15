# Demo Guide

## Preparation

```bash
pnpm install
pnpm db:up
pnpm db:reset
pnpm dev
```

Open `http://localhost:5173` in a clean browser profile. Cashier: `KEDAI-NUSA / RANI / 1234`; Admin: `KEDAI-NUSA / ADMIN / 9999`; activation: `COMP18-DEMO`.

## 8–10 minute presentation

1. **Problem (45s):** unstable SME connectivity; provisional versus settled; multiple devices.
2. **Architecture (60s):** show [system diagram](system_architecture.md) and explain local commit, stable ID, PostgreSQL acceptance, worker.
3. **Offline sale (90s):** login, click **Coba offline**, add item, Cash/QRIS, confirm. Point out provisional receipt and pending outbox.
4. **Durability (30s):** reload browser; show transaction and cart/catalog remain.
5. **Reconnect (60s):** click **Hubungkan**; receipt/ledger becomes settled and queue clears.
6. **Lost response (45s):** explain/show Playwright or integration output: first commit succeeds, response drops, retry returns `ALREADY_PROCESSED`.
7. **Admin (90s):** logout/switch to Admin; create/deactivate cashier, open catalog, edit/soft archive price.
8. **Exceptions (60s):** show payment correction and inventory discrepancy; stress immutable original.
9. **Evidence (45s):** run or show `pnpm ci`, traceability matrix, tests, and CI artifacts.
10. **Trade-offs (45s):** PWA over React Native, PostgreSQL outbox before RabbitMQ, eventual stock, stale catalog.

## Useful live commands

```bash
pnpm test:integration
pnpm test:e2e
curl -H "Accept: text/plain" http://localhost:3001/metrics
```

## Recovery if live demo fails

- Browser data is intentionally durable; use a new profile for a clean run.
- If port conflict exists, stop the existing dev process; do not clear production-like data blindly.
- If PostgreSQL fixtures changed, run the guarded `pnpm db:reset` and restart `pnpm dev`.
- Keep screenshots/Playwright trace and recorded integration output as evidence fallback.

## Ringkasan keputusan (Bahasa Indonesia)

Demo dimulai dari problem, lalu membuktikan offline checkout, reload, reconnect, dan exactly-once. Setelah itu tunjukkan Admin user/katalog serta correction/discrepancy. Tutup dengan automated evidence dan trade-off PWA, PostgreSQL outbox, stale catalog, dan inventori eventual.
