# Project Overview

Operator POS is an offline-first cashier application for the COMPFEST SEA 18 **Sync Without Signal** case study. It is designed for Indonesian SME counters where connectivity is intermittent, multiple devices may sell concurrently, and a completed local sale must never disappear merely because the network fails.

## Product outcome

A cashier can authenticate, load a merchant catalog, complete Cash, Static QRIS, or bank-transfer checkout, issue a provisional receipt, and continue selling offline. The application later settles queued sales through an idempotent backend. A merchant Admin manages cashier accounts, devices, catalog and pricing, corrections, discrepancies, and audit history.

## Correctness promises

1. A confirmed checkout is atomically persisted with its outbox intent before a receipt is shown.
2. Every sale has a stable client-generated identifier and is accepted at most once by a merchant-scoped backend uniqueness boundary.
3. A lost HTTP response is safe: retrying the same payload returns the existing result without creating a duplicate.
4. Backend-settled transactions are immutable. Corrections are append-only Admin workflows.
5. Queued data survives logout, token expiry, browser restart, and connectivity loss.
6. Inventory is an eventually consistent projection after backend acceptance, not a checkout reservation system.

## Application boundary

This repository implements the Operator application as an installable React PWA and its API/worker. The separate Entry and Owner applications mentioned by the case study are out of scope. `OWNER` remains a reserved backend role so this client cannot accidentally become the Owner application.

## Repository target

```text
apps/
  operator-web/    React, Vite, PWA, IndexedDB
  api/             Fastify, PostgreSQL, worker
packages/
  contracts/       Runtime Zod wire contracts and inferred DTOs
docs/              Product and engineering playbook
```

The repository deliberately has only one shared runtime package. Database ownership stays inside the API; browser persistence stays inside the web application.

## Ringkasan keputusan (Bahasa Indonesia)

Produk ini memprioritaskan transaksi kasir yang tetap aman ketika internet putus. Penjualan disimpan secara atomik di perangkat lalu dikirim ulang dengan ID tetap sampai backend menerima tepat satu transaksi. Scope implementasi hanya aplikasi Operator, API, dan worker; aplikasi Entry dan Owner tidak dibuat. Admin toko mengelola pengguna, perangkat, katalog, koreksi, dan rekonsiliasi dalam batas merchant yang sama.
