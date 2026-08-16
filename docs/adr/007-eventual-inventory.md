# ADR-007 — Eventual Inventory Projection

**Status:** Diterima

## Konteks

Beberapa device offline tidak bisa melakukan globally consistent stock reservation.

## Keputusan

Backend menerima sale lebih dulu, lalu PostgreSQL outbox worker menerapkan inventory movement secara idempotent. Negative stock membuka discrepancy untuk Admin.

## Konsekuensi

Displayed stock bisa sementara stale dan overselling tetap mungkin. Sebagai gantinya, checkout tetap available. Bisnis yang membutuhkan strict reservation harus memilih connectivity dependency atau conflict strategy yang berbeda.
