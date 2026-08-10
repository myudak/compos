# Operator POS

Offline-first point-of-sale prototype for the COMPFEST 18 "Sync Without Signal" case study. The app prioritizes a durable local checkout path: transactions are committed to IndexedDB first, queued in a local outbox, and synchronized without changing their client-generated identity.

## Run locally

```bash
pnpm install
pnpm dev
```

Production verification:

```bash
pnpm build
pnpm lint
```

## Demo the critical flow

1. Click **Coba offline** in the top bar.
2. Add products and confirm a Cash, Static QRIS, or Transfer payment.
3. The receipt shows **Provisional** and **Pending Sync** after the local commit.
4. Click **Hubungkan**. The outbox is processed in the background and the transaction becomes **Settled**.
5. Open **Sync & Data** to inspect or retry failed entries.

The seeded failed transaction is intentional so the retry and reconciliation UI can be demonstrated immediately.

## Architecture represented in the prototype

```text
React UI
  -> Dexie / IndexedDB
  -> local transaction + outbox (atomic write)
  -> explicit sync engine
  -> idempotent backend acceptance simulator
```

- `src/lib/db.ts` owns the local schema and offline bootstrap data.
- `src/lib/sync-engine.ts` models stable-ID batch acceptance and safe retry.
- `src/pages/checkout-page.tsx` keeps network calls out of the critical checkout commit.
- Vite PWA/Workbox precaches the app shell for offline startup.

The backend boundary is simulated in-browser for this product prototype. A production implementation would replace that acceptance simulator with the specified Fastify + PostgreSQL batch endpoint while preserving the same local transaction and outbox contract.

## Design system

Built from shadcn preset `b1s9brESu`: Nova style, Zinc base, Cyan theme/chart color, Inter, Tabler Icons, and medium radius.
