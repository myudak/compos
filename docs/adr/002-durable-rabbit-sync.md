# ADR-002 — Durable receipt sebelum Rabbit settlement

**Status:** Accepted

Direct browser-to-database settlement makes lost HTTP response ambiguous. In-memory queue loses work
on process restart.

**Decision:** API upserts PostgreSQL `SyncReceipt`, publishes persistent Rabbit message with confirm,
and reports `QUEUED`. Consumer commits canonical transaction before ACK. Retry queues use 5/30/120
seconds and exhausted/permanent failures enter DLQ.

**Consequence:** transport at-least-once, business effect exactly-once. Rabbit adds operational cost;
health, persistent storage, retry, DLQ, and degraded REST behavior are mandatory.
