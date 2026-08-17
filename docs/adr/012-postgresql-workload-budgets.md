# ADR-012: PostgreSQL Workload Budgets

**Status:** Diterima

COMPOS tetap memakai satu PostgreSQL, tetapi pool operational, Admin, reporting, dan worker memiliki
connection serta statement-timeout budget terpisah. Ini memberi bulkhead murah tanpa replica. Empat
database atau microservice ditolak karena belum ada evidence yang membayar complexity tersebut.
