# AGENTS.md — COMPOS Engineering Handoff

Dokumen ini berlaku untuk seluruh repository. Baca sebelum mengubah code, test, database, assets, atau docs. Kalau ada `AGENTS.md` yang lebih dekat ke file yang sedang dikerjakan, instruksi file tersebut lebih spesifik dan menang untuk subtree-nya.

## 1. Kenali produknya dulu

COMPOS (**COMPFEST Point of Sale**) adalah offline-first POS untuk case study COMPFEST 18 **Sync Without Signal**. Kasir harus tetap bisa menyelesaikan transaksi ketika internet putus. Sale disimpan secara durable di device, masuk local outbox, lalu di-settle ke backend secara idempotent ketika koneksi kembali.

Mulai dari dokumen ini:

1. [Project overview](docs/project_overview.md)
2. [Case study](docs/case_study.md)
3. [System architecture](docs/system_architecture.md)
4. [Sync protocol](docs/sync_protocol.md)
5. [Development guide](docs/development_guide.md)
6. [Testing strategy](docs/testing_strategy.md)
7. [Traceability matrix](docs/traceability_matrix.md)

Bahasa dokumentasi adalah Indonesian-first dengan technical English yang natural. Jangan membuat section English dan “ringkasan Bahasa Indonesia” yang menduplikasi isi.

## 2. Repository map

```text
apps/
  operator-web/             React 19 + Vite PWA
    src/app/                routing, shell, composition root, ephemeral UI store
    src/features/           feature UI, hooks, queries, application services
    src/infrastructure/     API transport, Dexie, browser persistence
    src/shared/             reusable UI dan domain-neutral helpers
    e2e/                    Playwright production-build scenarios
    public/brand/           official COMPOS icon dan banner
  api/                      Fastify API + PostgreSQL worker
    src/modules/            vertical business modules, services, repositories, mappers
    src/routes/             thin HTTP adapters
    src/database/           transaction helper dan database infrastructure
    src/http/               auth/error/request infrastructure
    src/scripts/            migrate, seed, smoke, dan acceptance scenarios
    migrations/             clean prototype baseline
packages/
  contracts/                canonical Zod wire contracts dan inferred DTOs
docs/                       product and engineering playbook + ADR
```

Jangan membuat `packages/shared`, `packages/database`, generic domain framework, atau package baru tanpa minimal dua consumer nyata.

## 3. Setup dan commands

Requirements: Node.js 22+, pnpm 10, Docker Desktop/Compose.

```bash
pnpm install
pnpm db:up
pnpm db:reset
pnpm dev
```

`pnpm dev` menjalankan web (`5173`), API (`3001`), dan worker.

Quality commands:

```bash
pnpm format
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm build
pnpm ci
```

Gunakan command paling kecil yang relevan selama iterasi, lalu verifikasi sebanding dengan risiko sebelum handoff. Perubahan docs-only minimal menjalankan `pnpm format:check` dan link check. Perubahan sync, persistence, auth, database, atau contracts membutuhkan test terkait dan build.

## 4. Invariants yang tidak boleh rusak

### Atomic local checkout

- Receipt tidak boleh muncul sebelum transaction + local outbox tersimpan atomically di IndexedDB.
- Confirm sale juga meng-update local stock projection dan membersihkan draft dalam transaction boundary yang sama.
- Checkout offline tidak boleh bergantung pada network request.
- Rapid draft writes harus ordered; write lama tidak boleh menimpa cart baru atau menghidupkan draft yang sudah cleared.

### Stable identity dan idempotency

- Setiap sale memakai stable client-generated UUIDv7.
- Retry selalu memakai transaction ID dan canonical payload yang sama.
- Backend uniqueness boundary adalah `(merchant_id, transaction_id)`.
- ID sama + payload sama menghasilkan `ALREADY_PROCESSED`.
- ID sama + payload berbeda menghasilkan `ID_REUSE_PAYLOAD_MISMATCH`; jangan overwrite history.
- Transport bersifat at-least-once, tetapi business effect harus exactly-once.

### Durable queue

- Logout, auth failure, token expiry, browser restart, dan network loss tidak boleh menghapus confirmed sales atau outbox.
- Auth error mem-pause sync dan meminta re-authentication.
- Startup harus memulihkan abandoned `SYNCING` record.
- `retryCount` hanya bertambah setelah failure.
- Sync hanya mengambil due records, maksimal 25 candidate per batch, dan menjaga response order.

### Immutable settlement

- Settled transaction tidak boleh diedit atau dihapus.
- Payment correction bersifat append-only dan Admin-only.
- Transaction items menyimpan name/price/payment snapshot supaya perubahan catalog tidak mengubah history.

### Eventual inventory

- Inventory bukan cross-device reservation system.
- Backend menerima sale dahulu; PostgreSQL outbox worker menerapkan stock movement secara idempotent.
- Negative stock membuka discrepancy; stock correction dilakukan lewat reconciliation, bukan catalog editor.

### Tenant dan session safety

- Semua query/mutation business data harus merchant-scoped dari authenticated identity, bukan merchant ID bebas dari body.
- Online JWT berlaku 12 jam dan memiliki server-side session `jti`.
- Local offline checkout lease berlaku maksimal 72 jam dari successful online authentication.
- Setelah lease habis, existing data tetap readable/queued tetapi checkout baru diblokir.
- Admin tidak boleh deactivate/demote dirinya sendiri atau menghapus final active Admin.
- `OWNER` reserved untuk future Owner app dan tidak boleh masuk COMPOS Operator.

## 5. Code boundaries

### Contracts

- `packages/contracts` adalah satu-satunya sumber wire schema dan DTO lintas web/API.
- Tambahkan atau ubah Zod schema di contracts sebelum mengubah producer dan consumer.
- API `/v1` memakai canonical `camelCase`; database rows tetap `snake_case` dan diubah lewat explicit mapper.
- Standard error envelope: `{ code, message, details?, requestId }`.
- Web client wajib memvalidasi API response; jangan memakai generic cast untuk “membuat TypeScript diam”.

### Operator web

- Page/route hanya compose feature components dan hooks.
- Jangan query Dexie atau memanggil raw API client langsung dari page component.
- Business use case seperti checkout berada di application service, bukan JSX event handler besar.
- Zustand hanya untuk ephemeral UI state. Durable state harus masuk repository/persistence service.
- Demo fixtures hanya boleh aktif saat `VITE_DEMO_MODE=true`.
- Gunakan shadcn primitives/theme yang sudah ada. Hindari decorative eyebrow copy, generic AI marketing copy, dan visual yang mengganggu speed kasir.

### API dan worker

- Route hanya authenticate, parse contract, call service, dan serialize response.
- SQL tinggal di typed repository; jangan taruh SQL di route atau pakai `SELECT *`.
- Gunakan canonical `withTransaction`; jangan duplikasi manual `BEGIN/COMMIT/ROLLBACK`.
- Backend batch boleh diproses concurrently dalam bounded batch, tetapi result order harus sama dengan input.
- Worker entrypoint, processor, dan event handlers tetap terpisah.
- Event baru wajib punya explicit handler, idempotency rule, retry behavior, dan test.

## 6. Cara mengerjakan perubahan

1. Baca file terkait dan `git status` sebelum edit. Worktree mungkin berisi perubahan milik user.
2. Temukan contract, caller, persistence boundary, dan test yang terdampak; jangan patch satu layer secara buta.
3. Buat perubahan terkecil yang menyelesaikan root cause.
4. Jangan refactor area lain kecuali memang diperlukan untuk correctness atau diminta user.
5. Update docs/ADR/traceability bila behavior, policy, API, setup, atau trade-off berubah.
6. Jalankan formatter dan test yang proporsional.
7. Review `git diff --check`, changed files, dan generated/untracked files sebelum commit.
8. Buat commit kecil, buildable, dan fokus. Jangan amend/rewrite commit user tanpa permintaan eksplisit.

Gunakan `apply_patch` untuk source/docs edits. Jangan menghapus, reset, atau overwrite file user untuk “membersihkan” worktree.

## 7. Verification matrix

| Area berubah                 | Minimum verification                                         |
| ---------------------------- | ------------------------------------------------------------ |
| Docs/Markdown                | `pnpm format:check`, local link check                        |
| React UI/copy                | web typecheck, relevant test, production web build           |
| Checkout/Dexie               | unit + fake IndexedDB integration + web build                |
| Sync policy/service          | sync unit/integration, lost-response/partial-batch coverage  |
| Contracts                    | contracts build/test, API + web typecheck/build              |
| API route/service/repository | API typecheck, isolated PostgreSQL integration               |
| Auth/admin/catalog           | permission + merchant-isolation integration tests            |
| Worker/inventory             | worker replay/idempotency integration tests                  |
| Cross-layer critical flow    | relevant Playwright scenario; full `pnpm ci` sebelum release |

Jangan menyatakan “production-ready” hanya karena build hijau. Production membutuhkan secrets management, monitoring, backup/PITR, restore drill, security/accessibility/load testing, dan additive migrations seperti dijelaskan di docs.

## 8. Database safety

- `pnpm db:reset` menghapus schema `public`; gunakan hanya untuk local/test prototype database.
- Reset script harus tetap menolak nama database selain `operator_pos` atau `operator_pos_*`.
- Jangan menjalankan reset pada production atau database yang targetnya tidak terverifikasi.
- Setelah live customer data ada, gunakan additive, reviewed, reversible migrations. Clean baseline policy tidak lagi berlaku.
- Seed credentials dan `COMP18-DEMO` hanya untuk demo/local environment.

## 9. Git dan local tooling

- Preserve perubahan user yang tidak terkait.
- Jangan commit secret, `.env`, database dump, `dist`, `node_modules`, coverage, Playwright output, atau temporary image files.
- `.agents/`, `.claude/`, dan `skills-lock.json` adalah local agent tooling milik user. Jangan edit atau commit kecuali user meminta secara eksplisit.
- Official brand assets berada di `apps/operator-web/public/brand/`.
- Git tidak track empty directories. Jangan membuat placeholder folder tanpa file/owner yang jelas.

## 10. Handoff yang bagus

Final report harus singkat dan evidence-based:

- Outcome yang berubah.
- File atau subsystem utama yang disentuh.
- Command/test yang dijalankan beserta hasilnya.
- Warning, trade-off, atau pekerjaan tersisa yang nyata.
- Commit hash jika perubahan di-commit.

Jangan menyembunyikan skipped test, existing warning, atau asumsi penting. Jangan menuliskan step-by-step panjang kalau outcome dan evidence sudah cukup.
