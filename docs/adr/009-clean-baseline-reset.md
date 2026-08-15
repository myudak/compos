# ADR-009: Clean Baseline Reset

**Status:** Accepted for this prototype refactor

## Decision

Replace the demo PostgreSQL migration history with one clean baseline and use a new IndexedDB database name/schema. Provide guarded project reset commands and deterministic seeds.

## Rationale and consequences

No production data exists and a full reset was explicitly authorized. A clean baseline communicates the intended schema better than transitional migrations. The reset is destructive to this project's local app data and is documented prominently; future post-release changes must use forward migrations.

## Ringkasan keputusan (Bahasa Indonesia)

Karena masih prototype dan reset penuh telah diizinkan, schema PostgreSQL dan IndexedDB dimulai dari baseline bersih. Perintah reset harus guard-railed dan hanya menghapus data lokal proyek ini.
