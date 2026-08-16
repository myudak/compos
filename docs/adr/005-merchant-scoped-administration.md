# ADR-005 — Merchant-Scoped Administration

**Status:** Diterima

## Konteks

Satu backend melayani banyak merchant. Admin toko tidak boleh menjadi platform-wide superuser.

## Keputusan

Semua Admin query dan mutation mengambil merchant dari authenticated session, bukan request body. Repository selalu menerapkan tenant predicate.

## Konsekuensi

Cross-merchant support membutuhkan future platform role/tool terpisah. Setiap endpoint Admin wajib punya isolation test; menyembunyikan data di UI tidak dianggap security boundary.
