# AGENTS.md — K-POS Engineering Handoff

Instruksi ini berlaku untuk seluruh repository frontend. Backend canonical berada di sibling
`../k-pos-be`; baca `../k-pos-be/AGENTS.md` kalau file itu tersedia sebelum mengubah backend.

## Produk dan source of truth

K-POS adalah offline-first POS dengan tiga role dan tiga PWA:

- `OPERATOR`: checkout offline dan melihat local/settled history;
- `ENTRY`: catalog, pricing, image, archive, stock adjustment, stock history;
- `OWNER`: user/device administration, sync conflict/failure, payment exception, audit, reporting.

Urutan keputusan: product overview → FRD/NFR → architecture/user flow → backend OpenAPI → code.
Backend `k-pos-be` adalah source of truth HTTP dan database. Snapshot kontrak frontend berada di
`packages/api-client/openapi.json`; jangan mengarang endpoint dari UI.

Mulai dari [docs/README.md](docs/README.md), [docs/system_architecture.md](docs/system_architecture.md),
dan [docs/sync_protocol.md](docs/sync_protocol.md).

## Repository map

```text
apps/operator-web/  React/Vite PWA, root scope, Dexie local-first write path
apps/entry-web/     React/Vite PWA, /entry/, online catalog dan inventory
apps/owner-web/     React/Vite PWA, /owner/, online control/reporting
packages/api-client pinned OpenAPI, generated types, Zod runtime schemas, transport
deployment/         Nginx same-origin routing
../k-pos-be/        NestJS, Prisma/PostgreSQL, RabbitMQ consumer
```

Jangan menambah generic shared/domain/database package tanpa dua consumer nyata. UI boleh berbagi
wire client, bukan business state atau persistence detail.

## Commands

```bash
pnpm install
pnpm stack:up
pnpm dev
pnpm run ci
pnpm test:integration
pnpm test:e2e
pnpm run ci:full
```

`pnpm stack:up` membangun full production-like stack di `http://localhost:8080`. Jangan reset volume
atau database tanpa memastikan target lokal/test dan ada izin eksplisit.

## Invariants yang tidak boleh rusak

### Local checkout

- Transaction, delivery outbox, stock projection, dan draft cleanup commit atomically di IndexedDB.
- Receipt tidak boleh muncul sebelum local commit berhasil.
- Checkout tidak melakukan synchronous backend request.
- Logout, reload, auth expiry, atau network loss tidak menghapus queued sale.
- Offline lease Operator berlaku tujuh hari; data lama tetap readable setelah expiry.

### Idempotency dan sync

- `offline_uuid` stabil untuk semua retry; UUID v4/v7 diterima backend.
- `X-Device-ID` authoritative; jangan kirim `id_device` per item.
- Operator mengirim maksimal 25 item, backend menerima maksimal 100.
- HTTP `200 accepted` berarti durable queued, bukan settled.
- Poll receipt sampai `SYNCED | CONFLICT | FAILED`.
- ID sama/payload beda harus berhenti sebagai integrity error; jangan generate ID baru diam-diam.
- RabbitMQ outage tidak boleh mematikan REST API; queued local data tetap utuh.

### Ledger, payment, dan stock

- Confirmed transaction append-only. Effective void/correction adalah record baru.
- `PaymentStatus` hanya `VERIFIED | FAILED`.
- Cash, static QRIS, dan transfer normal langsung `VERIFIED` setelah Operator mengecek.
- `PaymentReconciliation` hanya exception case: `OPEN | RESOLVED_VALID | RESOLVED_INVALID`.
- Invalid resolution atomically membuat payment `FAILED` dan append-only void/correction.
- Stock conflict tidak menghapus sale; Owner memilih confirm (negative stock + discrepancy) atau void.
- Reporting eventual dan harus menampilkan freshness/lag.

### Auth dan tenant

- Access token 15 menit disimpan in-memory; refresh token rotating ada di HttpOnly cookie.
- Offline lease ditandatangani dan terikat merchant, device, Operator.
- Device adalah shared merchant counter; Operator switch butuh online authentication.
- Semua server authorization merchant-scoped dari authenticated identity.
- UI redirect bukan security boundary.
- Owner hanya dibuat lewat onboarding/provisioning; Owner hanya membuat Entry/Operator.

## Code boundaries

- Page compose feature components/hooks; jangan taruh raw fetch, Dexie query, atau transaction building
  di JSX handler besar.
- Zustand hanya ephemeral UI state. Durable state masuk repository/service.
- Wire tetap `snake_case`; mapper/client mengubahnya ke domain shape bila diperlukan.
- Validasi response runtime; TypeScript cast bukan validation.
- Service worker Operator wajib mengecualikan `/entry/`, `/owner/`, `/api/`, `/health`, `/metrics`.
- Jangan mengubah generated `packages/api-client/src/generated/schema.d.ts` manual.
- Setelah backend contract berubah: generate backend OpenAPI, copy snapshot, generate client, review
  diff, dan jalankan `pnpm openapi:check`.

## Verification minimum

| Area              | Minimum                                              |
| ----------------- | ---------------------------------------------------- |
| Docs/copy         | `pnpm format:check`, `pnpm docs:check`               |
| React UI          | relevant test, typecheck, production build           |
| Dexie/checkout    | unit + fake IndexedDB + Operator build               |
| API client        | OpenAPI drift, client test/typecheck, all PWA builds |
| Sync/auth/payment | backend integration + relevant Playwright scenario   |
| Rabbit/DB schema  | real PostgreSQL/RabbitMQ integration + Docker smoke  |
| Cross-app flow    | full `pnpm test:e2e`                                 |

Sebelum handoff jalankan `git diff --check`, audit untracked/generated files, dan laporkan skipped test
secara jujur. `.agents/`, `.claude/`, dan `skills-lock.json` adalah local tooling; jangan edit/commit.
