# ADR-009 — Clean Baseline Reset untuk Prototype

**Status:** Diterima

## Konteks

Refactor besar mengubah sessions, audit, catalog archive, dan local IndexedDB schema. Belum ada customer data yang harus dipertahankan.

## Keputusan

Consolidate PostgreSQL menjadi clean baseline dan gunakan IndexedDB database baru. `db:reset` diberi guard nama database dan seed deterministic demo scenario.

## Konsekuensi dan expiry

Developer harus reset local data setelah perubahan ini. Keputusan otomatis berakhir sebelum live customer data: setelah itu hanya additive, reviewed, reversible migrations yang boleh dipakai dan reset production dilarang.
