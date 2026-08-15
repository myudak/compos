# Technology Stack and Trade-offs

| Layer      | Choice                                               | Why                                                                      |
| ---------- | ---------------------------------------------------- | ------------------------------------------------------------------------ |
| Web        | React 19, TypeScript, Vite, PWA                      | Fast responsive installable app; one codebase for desktop/tablet/mobile. |
| UI         | Tailwind CSS, shadcn-style primitives, Radix, Tabler | Accessible primitives and requested Nova/Zinc/Cyan visual system.        |
| Local data | Dexie over IndexedDB                                 | Durable browser transactions, indexes, fake-IDB testing.                 |
| UI state   | Zustand                                              | Ephemeral cart/connection state only; not durable business storage.      |
| Contracts  | Zod + inferred TypeScript                            | Runtime request/response validation and one camelCase DTO source.        |
| API        | Fastify                                              | Typed, low-overhead REST modules with lifecycle/error hooks.             |
| Database   | PostgreSQL 17 + `pg`                                 | Transactions, constraints, row locks, outbox, mature operations.         |
| Auth       | bcryptjs, JOSE JWT + DB sessions                     | Hashing, short-lived portable token, immediate server revocation.        |
| Tests      | Vitest, fake-indexeddb, Playwright                   | Pure/local integration, real PostgreSQL, production-browser acceptance.  |

## Rejected or deferred alternatives

- **React Native:** no device-native requirement offsets a second UI/persistence/release stack. PWA service-worker shell + IndexedDB meets the case.
- **RabbitMQ:** PostgreSQL outbox preserves acceptance atomicity with fewer moving parts. Introduce a broker only for measured consumer/throughput needs.
- **ORM during this refactor:** typed repositories and explicit SQL make tenant predicates, locks, and idempotency visible. An ORM migration would add risk without solving two-app reuse.
- **GraphQL:** resource/action REST endpoints and sync envelopes are simpler to cache, observe, and validate here.
- **LocalStorage:** lacks transactions, indexing, and appropriate capacity for transaction/outbox data.

See the [ADR index](adr/README.md) for individual decisions.

## Ringkasan keputusan (Bahasa Indonesia)

Stack dipilih untuk menjamin transaksi lokal dan backend, bukan mengejar jumlah teknologi. PWA + IndexedDB memenuhi offline desktop/mobile. PostgreSQL outbox lebih sederhana dan atomik daripada RabbitMQ untuk tahap ini. Raw typed SQL sengaja dipertahankan agar tenant scope, lock, dan idempotency mudah diaudit.
