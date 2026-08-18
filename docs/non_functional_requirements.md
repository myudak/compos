# Non-Functional Requirements

| ID                     | Target                                                                                  |
| ---------------------- | --------------------------------------------------------------------------------------- |
| NFR-01 Durability      | Confirmed local checkout survive reload, logout, auth expiry, dan network loss.         |
| NFR-02 Integrity       | Zero duplicate/lost business effect untuk accepted valid receipt.                       |
| NFR-03 Local latency   | Offline checkout p95 `< 500 ms` pada supported browser/device profile.                  |
| NFR-04 Backend latency | Enqueue p95 `< 500 ms`; settlement p95 `< 750 ms` pada baseline load.                   |
| NFR-05 Reporting       | Dashboard p95 `< 1.5 s`; projection lag p95 `< 30 s`.                                   |
| NFR-06 Availability    | REST tetap hidup saat Rabbit unavailable; health status `degraded`.                     |
| NFR-07 Security        | Password bcrypt; rotating HttpOnly refresh; tenant/device/role enforcement server-side. |
| NFR-08 Privacy         | Tidak mengirim PIN/password/token/raw transaction ke third-party analytics.             |
| NFR-09 Maintainability | OpenAPI drift gate; bounded modules; no duplicated wire contract.                       |
| NFR-10 Observability   | Request ID, DB/Rabbit health, queue/DLQ visibility, projection freshness.               |
| NFR-11 Compatibility   | Chromium-class PWA; responsive desktop/tablet/mobile layout.                            |
| NFR-12 Recovery        | Persistent Rabbit/PostgreSQL volumes; documented backup/PITR and restore drill.         |

Angka latency adalah acceptance target untuk environment yang metadata-nya dicatat. Bukan klaim
universal untuk setiap laptop atau cloud tier.
