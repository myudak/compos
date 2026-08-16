# COMPOS

![COMPOS — Sync Without Signal](apps/operator-web/public/brand/compos-sync-without-signal.png)

**COMPFEST Point of Sale** — aplikasi kasir offline-first untuk case study COMPFEST 18 _Sync Without Signal_. COMPOS tetap bisa mencatat penjualan saat internet putus, menyimpan antrean transaksi di device, lalu melakukan sync yang idempotent ketika koneksi balik.

Repo ini berisi:

- `apps/operator-web` — COMPOS Operator, React PWA untuk kasir dan Admin merchant.
- `apps/api` — Fastify API, PostgreSQL persistence, dan inventory worker.
- `packages/contracts` — kontrak Zod/TypeScript yang dipakai web dan API.
- `docs` — product and engineering playbook lengkap.

## Mulai cepat

Butuh Node.js 22+, pnpm 10, dan Docker Desktop/Compose.

```bash
pnpm install
pnpm db:up
pnpm db:reset
pnpm dev
```

Buka `http://localhost:5173`. Demo account:

| Role  | Merchant     | Operator | PIN    |
| ----- | ------------ | -------- | ------ |
| Kasir | `KEDAI-NUSA` | `RANI`   | `1234` |
| Admin | `KEDAI-NUSA` | `ADMIN`  | `9999` |

Device activation code: `COMP18-DEMO`.

> `pnpm db:reset` menghapus schema PostgreSQL lokal. Command ini punya guard dan hanya boleh jalan untuk database `operator_pos` atau `operator_pos_*`.

## Quality check

```bash
pnpm ci
```

Command tersebut menjalankan format check, lint, typecheck, unit test, integration test, dan production build. End-to-end test tersedia lewat `pnpm test:e2e`.

Mulai baca dokumentasi dari [COMPOS Project Playbook](docs/README.md), atau langsung buka [panduan demo](docs/demo_guide.md).
