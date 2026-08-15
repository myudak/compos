# ADR-010: Typed PostgreSQL Repositories Before an ORM

**Status:** Accepted

## Decision

Keep raw parameterized PostgreSQL queries behind typed vertical-module repositories and explicit row mappers. Use one canonical `withTransaction` helper. Do not introduce an ORM during this refactor.

## Rationale and consequences

The current domain needs precise transactions, conflict clauses, and worker row locking. Typed repositories remove route-level SQL and `SELECT *` without adding migration/runtime abstraction cost. Reconsider an ORM when query repetition or team onboarding cost becomes measurable across more applications.

## Ringkasan keputusan (Bahasa Indonesia)

SQL tetap dipakai karena kontrol transaksi, conflict, dan locking penting untuk offline sync. Namun SQL hanya ada di repository bertipe; route tidak boleh berisi query atau boilerplate transaksi.
