# Operator POS

Offline-first React PWA and Fastify/PostgreSQL backend for COMPFEST 18 **Sync Without Signal**. Checkout commits locally before network I/O, then settles through stable-ID idempotent synchronization.

## Quick start

Requirements: Node.js 22+, pnpm 10, and Docker Desktop.

```bash
pnpm install
pnpm db:up
pnpm db:reset
pnpm dev
```

Open `http://localhost:5173`. Demo cashier: `KEDAI-NUSA / RANI / 1234`; Admin: `KEDAI-NUSA / ADMIN / 9999`; device activation: `COMP18-DEMO`.

> `pnpm db:reset` drops the `public` schema and is guarded to databases named `operator_pos` or `operator_pos_*`.

## Project playbook

The canonical product, architecture, requirements, database, testing, operations, and demo documentation starts at [docs/README.md](docs/README.md). Key entry points: [project overview](docs/project_overview.md), [case study](docs/case_study.md), [sync protocol](docs/sync_protocol.md), [traceability](docs/traceability_matrix.md), and [development guide](docs/development_guide.md).

## Verification

```bash
pnpm ci
```

This runs formatting, type-aware lint, strict typecheck, unit tests, isolated PostgreSQL integration tests, production build, and eight Playwright acceptance scenarios.
