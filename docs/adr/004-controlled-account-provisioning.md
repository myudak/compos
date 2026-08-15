# ADR-004: Controlled Account Provisioning

**Status:** Accepted

## Decision

There is no public self-signup. A merchant Admin creates `OPERATOR` or `ADMIN` accounts, changes roles and names, resets PINs, and activates or deactivates accounts. `OWNER` is reserved and cannot authenticate into this UI.

## Rationale and consequences

The case mandates offline-first onboarding with no self-serve fallback. Controlled provisioning keeps every identity merchant-scoped and auditable. The API prevents self-demotion/deactivation and removal of the final active Admin.

## Ringkasan keputusan (Bahasa Indonesia)

Akun dibuat oleh Admin merchant, bukan registrasi publik. OWNER hanya role cadangan untuk aplikasi lain. Sistem menjaga agar selalu ada minimal satu Admin aktif.
