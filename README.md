# Operator POS

Production-shaped offline-first POS for the COMPFEST 18 **Sync Without Signal** case study. Checkout commits to IndexedDB first, queues an outbox record in the same local transaction, and later synchronizes to an idempotent Fastify/PostgreSQL backend.

## What is implemented

- Responsive React 19 + Vite PWA using the requested shadcn `b1s9brESu` visual preset (Nova, Zinc, Cyan, Inter, Tabler Icons).
- Durable catalog, cart draft, transactions, device identity, sync queue, and audit history in Dexie/IndexedDB.
- Cash, Static QRIS, and transfer checkout with explicit provisional/settled semantics.
- Bounded batches of 25, per-item partial results, retry classification, exponential backoff, jitter, backend reachability probe, and manual retry.
- Fastify API with JWT operator sessions, merchant scope, device registration/revocation, bootstrap, product, transaction, correction, and discrepancy endpoints.
- PostgreSQL atomic acceptance, stable-ID idempotency, payload conflict protection, immutable settled records, and a transactional backend outbox.
- Idempotent inventory worker, negative-stock discrepancy creation, admin correction/reconciliation UI, metrics, and structured sync logs.

## Run locally

Requirements: Node.js 22+, pnpm, Docker Desktop.

```bash
pnpm install
pnpm db:up
pnpm db:migrate
pnpm db:seed
```

Run these in separate terminals:

```bash
pnpm dev:api
pnpm worker
pnpm dev:web
```

Open `http://localhost:5173`.

Demo identities:

| Role | Merchant | Operator | PIN | Activation code |
|---|---|---|---|---|
| Cashier | `KEDAI-NUSA` | `RANI` | `1234` | `COMP18-DEMO` |
| Admin | `KEDAI-NUSA` | `ADMIN` | `9999` | `COMP18-DEMO` |

The browser installation receives and persists its own device ID. Use **Ganti operator** in Settings to enter the admin reconciliation desk.

## Verify

```bash
pnpm lint
pnpm build
pnpm test
pnpm test:integration
```

`test:integration` expects PostgreSQL to be seeded and the API to be listening on port 3001. It verifies lost-response retry, cross-device idempotency, ID/payload conflicts, partial batch success, a bounded reconnect burst, append-only correction, inventory reconciliation, and revoked-device enforcement.

Useful runtime checks:

```bash
curl http://localhost:3001/health
curl -H "Accept: text/plain" http://localhost:3001/metrics
```

## Critical demo

1. Activate and log in, then click **Coba offline**.
2. Add products, open the mobile/desktop cart, and confirm a payment.
3. The receipt is immediately **Provisional / Pending Sync** and survives reload because the sale and outbox were committed locally.
4. Click **Hubungkan**. The scheduler probes the backend, syncs in the background, and marks the record **Settled**.
5. In **Sync & Data**, inspect failed records and retry safely with the same UUIDv7.
6. Log in as admin to create append-only payment corrections or resolve inventory discrepancies.

## Architecture decisions

This is intentionally a responsive PWA, not a React Native app. The case study targets a cashier surface that works on desktop, tablet, and mobile; IndexedDB + service-worker app-shell caching already satisfy the offline requirement without a second client codebase.

RabbitMQ is intentionally absent from V1. PostgreSQL transactional outbox + an idempotent worker keeps transaction acceptance simple and correct. Add a broker later only when reconnect volume, independent consumers, or worker scaling creates measured pressure.

See [architecture and operations](docs/architecture.md) and the [failure runbook](docs/failure-runbook.md).
