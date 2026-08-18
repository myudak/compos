# Project Overview

K-POS adalah multi-actor offline-first point of sale untuk merchant dengan satu atau lebih counter.
Target utamanya operational continuity: Operator tetap bisa checkout ketika internet atau backend
tidak tersedia, tanpa mengorbankan auditability saat data kembali online.

## Actor dan aplikasi

| Role       | PWA       | Fokus                                                  |
| ---------- | --------- | ------------------------------------------------------ |
| `OPERATOR` | `/`       | cart, payment verification, local receipt, sync status |
| `ENTRY`    | `/entry/` | product, price, archive, stock adjustment/history      |
| `OWNER`    | `/owner/` | users, devices, exceptions, audit, sales reporting     |

Satu account punya satu role dan satu merchant context. Owner registration/onboarding membuat merchant
dan primary Owner; Owner berikutnya tidak dibuat dari public API. Owner dapat membuat Entry atau
Operator.

## Data ownership

- IndexedDB adalah durability boundary untuk checkout yang belum settle.
- NestJS backend repository `k-pos-be` adalah canonical service implementation.
- PostgreSQL adalah source of truth untuk identity, ledger, payment, stock, audit, dan reporting.
- RabbitMQ adalah durable asynchronous transport dari accepted receipt ke settlement worker.
- OpenAPI backend adalah normative wire contract; frontend pin snapshot dan generate types.

## Scope

Termasuk offline checkout, shared device, idempotent sync, retry/DLQ, stock conflict resolution,
payment exception reconciliation, append-only correction, catalog/inventory administration, audit,
dan eventual Owner reporting.

Tidak termasuk dynamic QR payment gateway, cross-device real-time stock reservation, accounting/ERP,
customer loyalty, native printer SDK, multi-currency, payroll, dan external AI insight.
