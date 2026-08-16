# ADR-008 — Canonical `camelCase` API

**Status:** Diterima

## Konteks

PostgreSQL memakai `snake_case`, sedangkan TypeScript client natural-nya `camelCase`. Membiarkan dua format bocor membuat contracts mudah drift.

## Keputusan

Semua `/v1` request/response memakai canonical `camelCase` yang divalidasi Zod. Repository mapper mengubah database rows secara eksplisit. Error memakai `{ code, message, details?, requestId }`.

## Konsekuensi

Mapper menambah sedikit boilerplate, tetapi wire contract konsisten dan `SELECT *` tidak diperlukan. Perubahan casing menjadi versioned API change.
