# ADR-010 — Typed PostgreSQL Repositories Sebelum ORM

**Status:** Diterima

## Konteks

COMPOS bergantung pada exact SQL transaction, unique constraint, payload hash lookup, tenant predicate, dan worker locking. Memasukkan ORM saat refactor akan memperluas perubahan tanpa menghilangkan aturan tersebut.

## Keputusan

Gunakan `pg`, explicit column list, typed row, mapper, repository, dan satu `withTransaction` helper. SQL tidak boleh berada di HTTP route.

## Konsekuensi dan revisit trigger

Tim menulis SQL/mapping lebih eksplisit tetapi correctness boundary mudah diaudit. Evaluasi query builder/ORM kalau schema tumbuh signifikan, migration ergonomics menjadi bottleneck, atau tim mendapat manfaat type-safety yang terukur tanpa menyembunyikan transaction semantics.
