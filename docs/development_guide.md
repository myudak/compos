# Development Guide

## Setup lokal

Butuh Node.js 22+, pnpm 10, dan Docker Desktop/Compose.

```bash
pnpm install
pnpm db:up
pnpm db:reset
pnpm dev
```

`pnpm dev` menjalankan COMPOS Operator di port `5173`, API di `3001`, dan worker. Reset menghapus schema `public` dan menolak database yang namanya bukan `operator_pos` atau `operator_pos_*`.

## Environment variables

| Variable                    | Default / fungsi                                           |
| --------------------------- | ---------------------------------------------------------- |
| `DATABASE_URL`              | `postgres://operator:operator@localhost:5432/operator_pos` |
| `JWT_SECRET`                | Local-only default; wajib secret nyata saat deploy.        |
| `DEVICE_ACTIVATION_CODE`    | `COMP18-DEMO`; ganti secara aman di luar demo.             |
| `CORS_ORIGIN`               | Daftar web origin yang diizinkan, dipisahkan koma.         |
| `PORT`, `HOST`, `LOG_LEVEL` | API runtime configuration.                                 |
| `VITE_API_URL`              | Browser API base; default `http://localhost:3001`.         |
| `VITE_DEMO_MODE`            | Local fixture mode hanya saat eksplisit `true`.            |

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

Buat commit kecil yang tetap buildable per subsystem. Jangan commit `.agents`, `.claude`, secret, database dump, atau local tool config ke product history.
