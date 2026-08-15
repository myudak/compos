# ADR-002: PostgreSQL Outbox Before RabbitMQ

**Status:** Accepted

## Decision

Commit each accepted transaction and downstream event in one PostgreSQL transaction. Workers claim the outbox idempotently. Do not place RabbitMQ on the acceptance path.

## Rationale and consequences

The transactional outbox closes the dual-write failure window without adding another service. A broker may later receive events from an outbox publisher when independent consumers, routing, backpressure, or measured database load justify it. PostgreSQL remains the durable acceptance boundary either way.

## Ringkasan keputusan (Bahasa Indonesia)

RabbitMQ belum diperlukan. Transaksi dan event disimpan atomik di PostgreSQL, lalu worker memproses outbox. Broker dapat ditambahkan setelah ada kebutuhan scaling yang terukur.
