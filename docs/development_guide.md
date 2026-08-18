# Development Guide

## Prerequisites

Node.js 22+, pnpm 10, npm, Docker Desktop/Compose. Clone frontend dan backend sebagai sibling:

```text
workspace/project_COMPPOS
workspace/k-pos-be
```

## Production-like local stack

```bash
cd project_COMPPOS
pnpm install
pnpm stack:up
```

Routes:

- Operator `http://localhost:8080/`
- Entry `http://localhost:8080/entry/`
- Owner `http://localhost:8080/owner/`
- health `http://localhost:8080/health`
- Rabbit Management `http://localhost:15672` (`guest/guest`)

`pnpm stack:down` stops containers without deleting volumes. Do not add `-v` unless local data
destruction is intended and verified.

## Hot reload

From backend: `npm install`, `npm run db:up`, `npm run db:migrate`, `npm run seed`, then
`npm run start:dev`. From frontend: `pnpm dev`.

Ports are Operator `5173`, Entry `5174`, Owner `5175`, API `3001`, PostgreSQL `5432`, Rabbit AMQP
`5672`, Rabbit Management `15672`.

## Contract workflow

```bash
cd ../k-pos-be
npm run openapi:generate
cd ../project_COMPPOS
Copy-Item ../k-pos-be/openapi.json packages/api-client/openapi.json
pnpm openapi:generate
pnpm openapi:check
```

Review endpoint/schema diff and update runtime Zod/domain mappers. Generated types alone do not
validate hostile runtime response.

## Database safety

Backend `npm run db:reset` has a local/test name guard. Prefer migrations. Never point reset commands
at managed/staging/production URLs. Existing Docker named volumes are persistent by default.
