# Product Principles

## 1. Local commit adalah keberhasilan checkout pertama

Operator tidak menunggu cloud. Receipt lokal hanya dibuat setelah transaction dan delivery outbox
tersimpan atomically di device.

## 2. Queued bukan settled

API hanya menyatakan message sudah durable setelah receipt commit dan Rabbit publisher confirm.
Canonical transaction baru ada setelah consumer PostgreSQL commit. UI harus menunjukkan perbedaan
`PROVISIONAL`, `QUEUED`, dan terminal status.

## 3. Exactly-once adalah business effect

Transport boleh mengirim ulang. Unique idempotency key, payload hash, transactional settlement, dan
idempotent event projection mencegah duplicate ledger/stock/reporting effect.

## 4. History tidak diedit

Confirmed sale, item name/SKU/price snapshot, dan original payment tetap auditable. Void/correction
adalah append-only records yang membentuk effective status.

## 5. Payment trusted by Operator, reconciliation by exception

Normal payment langsung `VERIFIED`. Reconciliation hanya dibuka ketika ada bukti payment bermasalah.
Invalid resolution mengubah payment ke `FAILED` dan membuat append-only void dalam satu database
transaction.

## 6. Inventory bersifat eventual

Tidak ada distributed reservation antar counter. Stock shortage menghasilkan `CONFLICT`; Owner dapat
confirm dengan negative stock/discrepancy atau void tanpa stock movement.

## 7. Degraded mode adalah behavior yang didesain

RabbitMQ down tidak menjatuhkan auth/catalog/reporting REST. Local checkout lanjut, sync retryable,
dan health endpoint jujur menyatakan dependency degraded.
