# Non-Functional Requirements

| ID     | Quality                | Target / ukuran                                                                                      |
| ------ | ---------------------- | ---------------------------------------------------------------------------------------------------- |
| NFR-01 | Local checkout latency | Local commit sampai receipt target p95 < 500 ms pada supported hardware.                             |
| NFR-02 | Durability             | Receipt tidak tampil sebelum atomic sale + outbox commit; pulih setelah browser restart.             |
| NFR-03 | Correctness            | Maksimal satu backend row per merchant/transaction ID; altered reuse ditolak.                        |
| NFR-04 | Availability           | Checkout tersedia selama offline lease 72 jam masih valid.                                           |
| NFR-05 | Scalability            | 500+ merchant; stateless API replicas; bounded batch; indexed tenant query.                          |
| NFR-06 | Security               | bcrypt PIN hash, JWT 12 jam dengan server-side `jti`, RBAC, tenant scope, revocation, redaction.     |
| NFR-07 | Observability          | Structured request/sync log, request ID, health endpoint, Prometheus-format metrics.                 |
| NFR-08 | Maintainability        | Tiga workspace, canonical contracts, feature boundaries, typed repositories, source limit 350 baris. |
| NFR-09 | Recoverability         | Ekspektasi PostgreSQL backup/PITR; local queue tidak dihapus saat auth failure/logout.               |
| NFR-10 | UX                     | Responsive desktop/tablet/mobile PWA, status connection/settlement terlihat, error actionable.       |

## Nuansa availability

Server down tidak otomatis membuat kasir berhenti, karena critical write dilakukan secara lokal. Target production API adalah 99,9%, sementara offline lease dan durable queue menjaga counter saat outage. Setelah lease habis, data lama tetap readable dan queued, tetapi checkout baru diblokir sampai online re-authentication.

## Maintainability gates

CI memaksa formatting, type-aware lint, strict TypeScript, unit test, isolated PostgreSQL integration, production build, dan Playwright scenarios. Page tidak boleh mengakses Dexie/API infrastructure secara langsung kecuali type-only import. Durable state tidak boleh disimpan di Zustand.

Angka di atas adalah target engineering, bukan hasil benchmark production. Sebelum go-live, ukur ulang memakai device kasir nyata, volume merchant representatif, dan failure injection.

Mixed workload target menambahkan settlement p95 `<750 ms`, Owner dashboard p95 `<1.5 s`, zero
lost/duplicate settlement, dan reporting convergence ke canonical ledger. Reporting/provider failure
tidak boleh mengambil operational connection budget atau menaikkan settlement melewati target.
