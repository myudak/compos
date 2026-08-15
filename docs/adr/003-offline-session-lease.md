# ADR-003: Twelve-Hour Token and 72-Hour Offline Lease

**Status:** Accepted

## Decision

Online access tokens expire after 12 hours and reference a server-side session by JWT `jti`. A successful online login grants a local checkout lease for 72 hours. Token expiry pauses synchronization; lease expiry blocks new checkout but never deletes readable or queued data.

## Rationale and consequences

An offline POS cannot revalidate every action, but unlimited offline authorization would retain access indefinitely after revocation. The split policy keeps short online sessions while providing a bounded continuity window. Logout, PIN reset, account deactivation, and device revocation invalidate relevant server sessions at once when online.

## Ringkasan keputusan (Bahasa Indonesia)

Token online berlaku 12 jam, sedangkan hak checkout offline berlaku maksimal 72 jam sejak login online terakhir. Setelah lease habis data tetap aman dan dapat dibaca, tetapi transaksi baru menunggu autentikasi ulang.
