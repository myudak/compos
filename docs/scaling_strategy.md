# Scaling Strategy

Scale per access pattern, not by drawing more services.

| Workload         | Shape                      | Consistency/budget response                      |
| ---------------- | -------------------------- | ------------------------------------------------ |
| Offline checkout | local interactive write    | IndexedDB, no network dependency                 |
| Sync enqueue     | bursty write               | bounded batch, receipt insert, publisher confirm |
| Settlement       | async ordered-ish consumer | prefetch/backpressure, transactional idempotency |
| Entry mutation   | low-volume online write    | merchant-scoped strong DB commit                 |
| Owner dashboard  | read-heavy aggregates      | projection tables, bounded date range            |
| Reconciliation   | rare exception write       | serializable/transactional policy                |

## Current cost-aware topology

One NestJS deployable, one PostgreSQL, one RabbitMQ. Independent consumers run without making browser
request wait. Connection pool, Rabbit prefetch, statement timeout, API rate limit, and query indexes
are first tuning levers.

Supported single-process profile memakai PostgreSQL pool 32, Rabbit prefetch 8, reporting batch 100, dan reporting concurrency 4. Background path memakai maksimal 12 koneksi bersamaan dan menyisakan 20 untuk HTTP/control reads. Connection budget minimum adalah `(replica × 32) + migration/operations + safety margin`; replica tidak boleh ditambah tanpa mengecek PostgreSQL `max_connections` dan pool wait.

## Mixed-load gate

CI smoke targets 50 merchants for 15–30 seconds. Explicit capacity profile targets 500 merchants for five minutes, satu sale per counter per 30 detik atau steady-state 16,67 sale/detik. Dalam profile ini, 20% counter juga menguji duplicate retry/catalog read, 10% Owner dashboard read, dan 5% Owner control read plus Entry stock mutation. Arrival diberi deterministic phase agar tidak menjadi synthetic thundering herd. Collect enqueue/settlement/dashboard p50/p95/p99, DB pool wait, Rabbit ready/unacked, DLQ, projection lag, dan duplicate/lost effects.

## Adoption triggers

- split consumer process when provider/CPU work impacts HTTP event loop despite queue isolation;
- read replica when indexed projection reads saturate primary and measured replica staleness is okay;
- Redis only when concrete shared cache/rate-limit need appears;
- additional Rabbit cluster capacity when disk/network/queue lag remains bottleneck after prefetch and
  consumer scaling;
- microservice split only with independent ownership/deploy/SLO need and tested failure contract.

No component is added merely to look “production-grade.” Every dependency needs owner, cost model,
failure behavior, metrics, and recovery test.
