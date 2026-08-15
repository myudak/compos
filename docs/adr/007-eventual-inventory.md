# ADR-007: Inventory Is an Eventual Projection

**Status:** Accepted

## Decision

Checkout does not reserve server stock. Inventory is deducted idempotently after transaction acceptance, and negative projections create discrepancies for Admin reconciliation.

## Rationale and consequences

Concurrent offline devices cannot share a real-time reservation boundary. Preserving accepted sales is more important than pretending stock is strongly consistent. Catalog editing cannot directly change stock; corrections remain an explicit reconciliation workflow.

## Ringkasan keputusan (Bahasa Indonesia)

Stok bukan pengunci checkout. Setelah backend menerima transaksi, worker mengurangi stok secara idempoten. Stok negatif menjadi discrepancy untuk ditangani Admin, bukan alasan menghapus penjualan.
