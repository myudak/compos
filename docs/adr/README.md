# Architecture Decision Records

ADR menyimpan alasan di balik keputusan yang punya trade-off besar. Status **Diterima** berarti keputusan ini berlaku sekarang, bukan berarti permanen; revisit trigger ditulis supaya tim tahu kapan harus mengevaluasinya lagi.

| ADR                                             | Keputusan                                 |
| ----------------------------------------------- | ----------------------------------------- |
| [001](001-pwa-over-react-native.md)             | Responsive PWA sebelum React Native       |
| [002](002-postgresql-outbox-before-rabbitmq.md) | PostgreSQL outbox sebelum RabbitMQ        |
| [003](003-offline-session-lease.md)             | Offline checkout lease 72 jam             |
| [004](004-controlled-account-provisioning.md)   | Account provisioning dikontrol Admin      |
| [005](005-merchant-scoped-administration.md)    | Semua Admin action merchant-scoped        |
| [006](006-stale-catalog-policy.md)              | Last-known catalog boleh dipakai offline  |
| [007](007-eventual-inventory.md)                | Inventory diproyeksikan secara eventual   |
| [008](008-camel-case-api.md)                    | Wire API canonical `camelCase`            |
| [009](009-clean-baseline-reset.md)              | Clean reset hanya selama prototype        |
| [010](010-typed-postgresql-repositories.md)     | Explicit typed SQL repository sebelum ORM |
| [011](011-owner-pwa.md)                         | Separate online-first Owner PWA           |
| [012](012-postgresql-workload-budgets.md)       | Pool dan timeout per access pattern       |
| [013](013-reporting-projections.md)             | Eventual reporting read models            |
| [014](014-insight-provider-fallback.md)         | Aggregate-only provider + local fallback  |
