# Development Guide

## Setup lokal

Butuh Node.js 22+, pnpm 10, dan Docker Desktop/Compose.

```bash
pnpm install
pnpm db:up
pnpm db:reset
pnpm dev
```

`pnpm dev` menjalankan COMPOS Operator di `5173`, COMPOS Owner di `5174`, API di `3001`, dan worker.
Reset menghapus schema `public` dan menolak database yang namanya bukan `operator_pos` atau
`operator_pos_*`.

## Environment variables

| Variable                    | Default / fungsi                                                                             |
| --------------------------- | -------------------------------------------------------------------------------------------- |
| `DATABASE_URL`              | `postgres://operator:operator@localhost:5432/operator_pos`                                   |
| `JWT_SECRET`                | Local-only default; wajib secret nyata saat deploy.                                          |
| `DEVICE_ACTIVATION_CODE`    | `COMPOS-DEMO`; ganti secara aman di luar demo.                                               |
| `CORS_ORIGIN`               | Daftar web origin yang diizinkan, dipisahkan koma.                                           |
| `PORT`, `HOST`, `LOG_LEVEL` | API runtime configuration.                                                                   |
| `VITE_API_URL`              | Browser API base; local dev default `http://localhost:3001`, production default same-origin. |
| `VITE_DEMO_MODE`            | Local fixture mode hanya saat eksplisit `true`.                                              |
| `SERVE_WEB`                 | `false`; aktifkan untuk menyajikan production PWA lewat Fastify.                             |
| `WEB_DIST_PATH`             | Optional override lokasi `operator-web/dist`; default di-resolve dari API module.            |

## Hosted demo profile

Render demo dan production-like local smoke memakai hasil build PWA pada origin Fastify yang sama.
Development sehari-hari tetap memakai Vite dan API terpisah supaya HMR cepat.

```bash
pnpm build
SERVE_WEB=true pnpm start:hosted
```

`start:hosted` menjalankan built migration runner sebelum built API. Jalankan built worker secara
terpisah dengan `pnpm worker:hosted`. Kedua process boleh start bersamaan karena migration runner
memakai PostgreSQL advisory lock.

Detail resource, biaya, smoke test, dan teardown ada di
[Render Demo Deployment](render_demo_deployment.md).

### Cloudflare Tunnel untuk `compos.myudak.com`

Build lalu jalankan hosted profile dengan exact public origin:

```powershell
pnpm build
$env:SERVE_WEB = "true"
$env:CORS_ORIGIN = "https://compos.myudak.com"
pnpm start:hosted
```

Jalankan worker melalui terminal terpisah dengan `pnpm worker:hosted`, lalu arahkan Cloudflare
Tunnel hostname `compos.myudak.com` ke `http://localhost:3001`. Jangan arahkan tunnel ke Vite port
`5173`: production build sengaja memakai same-origin `/v1`, sehingga tidak mengekspos localhost API
ke browser pengunjung.

## Workspace boundaries

- `packages/contracts`: wire schemas dan DTO saja.
- `apps/operator-web/features`: UI, query, hook, dan application service per feature.
- `apps/operator-web/infrastructure`: API, Dexie, dan browser adapters.
- `apps/api/modules`: vertical service, repository, dan mapper.
- Route mengurus auth/parse/call/serialize; SQL tetap di repository.

Feature page tidak boleh import persistence/API infrastructure langsung kecuali type-only model import. Durable state tidak boleh masuk Zustand. Demo seed juga tidak boleh bocor ke production path.

## Quality workflow

```bash
pnpm format
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm build
pnpm test:e2e
```

Jalankan seluruh gate berurutan dengan `pnpm run ci`. Gunakan bentuk `pnpm run` karena `ci` adalah
built-in pnpm command, bukan shorthand yang otomatis menjalankan package script.

`pnpm lint` memakai Oxlint dengan native type-aware rules dari `oxlint-tsgolint`; warning tetap
memblokir CI. `pnpm format` dan `pnpm format:check` memakai Oxfmt sebagai canonical formatter.

Buat commit kecil yang tetap buildable per subsystem. Jangan commit `.agents`, `.claude`, secret, database dump, atau local tool config ke product history.
