# ADR-004 — Controlled Account Provisioning

**Status:** Diterima

## Konteks

Public signup tidak cocok untuk akun kasir yang harus berada di merchant dan role tertentu.

## Keputusan

Hanya merchant Admin yang boleh membuat `OPERATOR` atau `ADMIN`, mengubah role/name, reset PIN, dan activate/deactivate account. `OWNER` tidak bisa dibuat dari COMPOS Operator.

## Konsekuensi

Onboarding membutuhkan active Admin. Last-admin dan self-demotion guard mencegah merchant terkunci tanpa administrator. PIN reset dan account deactivation menginvalidasi session terkait.
