# ADR-013: Eventual Reporting Projections

**Status:** Diterima

Owner dashboard membaca daily/product read models yang diisi worker dari reporting event. Projection
idempotent memakai transaction identity dan mengabaikan void. Membaca ledger dengan aggregate query
di setiap dashboard request ditolak karena mencampur analytical scan dengan settlement workload.
Trade-off eventual consistency ditampilkan lewat `dataAsOf` dan `projectionLagSeconds`.
