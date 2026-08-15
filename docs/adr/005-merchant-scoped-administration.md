# ADR-005: Merchant-Scoped Administration

**Status:** Accepted

## Decision

Admin authority is limited to the authenticated merchant. It covers operators, devices, products, prices, reconciliation, and audit history for that merchant only.

## Rationale and consequences

Merchant scope is derived from the validated session rather than accepted from request bodies. Repositories include merchant predicates, and integration tests prove cross-merchant isolation.

## Ringkasan keputusan (Bahasa Indonesia)

Admin hanya boleh mengelola data merchant tempat akunnya terdaftar. `merchantId` selalu berasal dari sesi tervalidasi, bukan input klien.
