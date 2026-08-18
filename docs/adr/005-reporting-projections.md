# ADR-005 — Idempotent eventual reporting projections

**Status:** Accepted

Owner dashboard queries should not scan/aggregate the operational ledger during sync bursts.

**Decision:** committed/voided transaction events update merchant daily and product daily read models.
`reporting_applied_transactions` is the idempotency boundary. Dashboard uses merchant timezone,
bounded 90-day range, and exposes `data_as_of` plus lag.

**Consequence:** reports are fast but eventual. Projection replay must converge without duplicate
aggregate; UI communicates freshness honestly.
