# ADR-002 — PostgreSQL Outbox Sebelum RabbitMQ

**Status:** Diterima

## Konteks

Accepted transaction harus memicu inventory processing tanpa celah antara database commit dan event publication.

## Keputusan

Tulis backend event ke `backend_outbox` dalam PostgreSQL transaction yang sama dengan sale, lalu proses memakai worker terpisah.

## Kenapa begini?

Atomicity tersedia tanpa distributed transaction dan dependency operasional baru. Unique movement/event constraint membuat replay aman.

## Konsekuensi dan revisit trigger

Worker perlu polling/claiming dan database menanggung event traffic. Tambahkan RabbitMQ atau broker lain hanya ketika independent consumer, long retention/replay, atau measured throughput membuktikan PostgreSQL outbox sudah menjadi bottleneck.
