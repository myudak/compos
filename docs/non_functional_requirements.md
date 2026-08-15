# Non-Functional Requirements

| ID     | Quality                | Target / measure                                                                                      |
| ------ | ---------------------- | ----------------------------------------------------------------------------------------------------- |
| NFR-01 | Local checkout latency | Local commit and receipt target p95 < 500 ms on supported hardware.                                   |
| NFR-02 | Durability             | No receipt before atomic sale + outbox commit; recovery after browser restart.                        |
| NFR-03 | Correctness            | At-most-one backend row per merchant/transaction ID; altered reuse is rejected.                       |
| NFR-04 | Availability           | Checkout remains available throughout a valid 72-hour offline lease.                                  |
| NFR-05 | Scalability            | 500+ merchants; stateless API replicas; bounded batches; indexed tenant queries.                      |
| NFR-06 | Security               | bcrypt PIN hashes, 12-hour JWT with server-side `jti`, RBAC, tenant scope, revocation, redaction.     |
| NFR-07 | Observability          | Structured request/sync logs, request IDs, health and Prometheus-format metrics.                      |
| NFR-08 | Maintainability        | Three workspaces, canonical contracts, feature boundaries, typed repositories, 350-line source limit. |
| NFR-09 | Recoverability         | PostgreSQL backup/PITR expectation; local queue never deleted on auth failure/logout.                 |
| NFR-10 | UX                     | Responsive desktop/tablet/mobile PWA, visible connection/settlement state, actionable failures.       |

## Availability nuance

Backend uptime does not determine checkout availability because the critical write is local. Backend/API production target is 99.9%, while offline lease and durable queue protect the counter during an outage. After lease expiry, reads remain available but new checkout is blocked until online re-authentication.

## Maintainability gates

CI enforces formatting, type-aware lint, strict TypeScript, unit tests, isolated PostgreSQL integration, production build, and eight Playwright scenarios. Feature pages cannot import API/Dexie infrastructure directly except type-only imports.

## Ringkasan keputusan (Bahasa Indonesia)

Target kualitas memisahkan availability checkout dari availability server. Transaksi lokal ditargetkan cepat dan durable; server tetap perlu 99,9%, backup, monitoring, dan tenant isolation. Maintainability dijaga oleh contracts tunggal, batas feature, limit ukuran source, strict typecheck, dan CI berlapis.
