# Development Guide

## Prerequisites and setup

- Node.js 22+, pnpm 10, Docker Desktop/Compose.

```bash
pnpm install
pnpm db:up
pnpm db:reset
pnpm dev
```

`pnpm dev` runs Operator Web (`5173`), API (`3001`), and worker. The reset command drops the `public` schema and refuses any database not named `operator_pos` or `operator_pos_*`.

## Environment

| Variable                    | Default / purpose                                          |
| --------------------------- | ---------------------------------------------------------- |
| `DATABASE_URL`              | `postgres://operator:operator@localhost:5432/operator_pos` |
| `JWT_SECRET`                | Local-only default; set a secret in deployment.            |
| `DEVICE_ACTIVATION_CODE`    | `COMP18-DEMO`; replace securely outside demo.              |
| `CORS_ORIGIN`               | Comma-separated allowed web origins.                       |
| `PORT`, `HOST`, `LOG_LEVEL` | API runtime.                                               |
| `VITE_API_URL`              | Browser API base; default `http://localhost:3001`.         |
| `VITE_DEMO_MODE`            | Explicit local fixture mode only when `true`.              |

## Workspace boundaries

- `packages/contracts`: wire schemas/DTOs only.
- `apps/operator-web/features`: UI, queries, hooks, application services.
- `apps/operator-web/infrastructure`: API, Dexie, browser adapters.
- `apps/api/modules`: vertical services/repositories/mappers.
- HTTP routes authenticate, parse, invoke, serialize; SQL stays in repositories.

Feature pages may not import persistence/API infrastructure directly except type-only model imports. Durable data never belongs in Zustand.

## Quality workflow

```bash
pnpm format
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm build
pnpm test:e2e
```

Commit buildable subsystems. Do not include `.agents`, `.claude`, or local tool configuration in product commits.

## Ringkasan keputusan (Bahasa Indonesia)

Setup lokal cukup Docker PostgreSQL, reset guarded, lalu `pnpm dev`. Contracts adalah satu-satunya package runtime bersama. Page menggunakan feature layer; Dexie/API ada di infrastructure; SQL ada di repository API. Semua perubahan sebaiknya melewati format, lint type-aware, strict typecheck, test, dan build.
