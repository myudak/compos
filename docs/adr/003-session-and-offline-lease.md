# ADR-003 — Rotating online session dan signed offline lease

**Status:** Accepted

Operator needs offline continuity, but indefinite cached credentials make revoked users/devices unsafe.

**Decision:** access token 15 minutes in memory, rotating refresh session 7 days in secure HttpOnly
cookie, and signed Operator offline lease 7 days bound to merchant/device/operator. Offline opens only
last authenticated Operator; switching requires online login.

**Consequence:** revocation affects online access immediately while queued sale stays durable. After
lease expiry local history remains readable but new checkout is blocked.
