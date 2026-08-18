# ADR-004 — Reconciliation hanya untuk payment exception

**Status:** Accepted

Making every QRIS/transfer `PENDING` creates unnecessary Owner approval work. Operator already checks
payment evidence during checkout.

**Decision:** `PaymentStatus` is `VERIFIED | FAILED`; all normal methods settle `VERIFIED`.
`PaymentReconciliation` is separate `OPEN | RESOLVED_VALID | RESOLVED_INVALID`. Valid resolution closes
case unchanged. Invalid resolution atomically marks payment `FAILED` and adds append-only void/correction.

**Consequence:** happy path simple, exception auditable, original transaction immutable. UI must not
present reconciliation as routine non-cash verification.
