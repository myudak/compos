# System Architecture

## Logical architecture

```mermaid
flowchart LR
  Cashier["Cashier or merchant Admin"] --> Web["Operator Web PWA"]
  subgraph Browser["Browser installation"]
    Web --> Features["Feature application services"]
    Features --> Repositories["Typed local repositories"]
    Repositories --> IDB[("IndexedDB")]
    Features --> Sync["Injected sync service"]
    Scheduler["Connectivity scheduler"] --> Sync
  end
  Sync -->|"JWT · /v1 · camelCase contracts"| API["Fastify API"]
  API --> Modules["Vertical application modules"]
  Modules --> PG[("PostgreSQL")]
  PG --> Outbox["Transactional backend outbox"]
  Outbox --> Worker["Idempotent worker"]
  Worker --> Inventory["Inventory projection"]
  Worker --> Discrepancies["Discrepancy workflow"]
```

## Dependency rule

```mermaid
flowchart TD
  Pages["Routes and pages"] --> Features["Feature UI and hooks"]
  Features --> Services["Application services"]
  Services --> Ports["Repository and transport ports"]
  Infra["API, IndexedDB, browser adapters"] --> Ports
  WebContracts["Web features"] --> Contracts["@operator/contracts"]
  ApiModules["API modules"] --> Contracts
```

Pages compose features; they do not construct transaction records, access Dexie tables, or interpret database-shaped fields. Features depend on narrow ports. Infrastructure implements those ports. The contracts package is the only cross-application runtime dependency and contains no persistence or framework logic.

## Checkout and sync sequence

```mermaid
sequenceDiagram
  actor Cashier
  participant UI as Checkout feature
  participant Sale as confirmSale service
  participant IDB as IndexedDB transaction
  participant Sync as Sync service
  participant API as Fastify API
  participant PG as PostgreSQL transaction

  Cashier->>UI: Confirm payment
  UI->>Sale: Confirm cart snapshot
  Sale->>IDB: transaction + items + outbox + clear draft
  IDB-->>Sale: committed
  Sale-->>UI: provisional receipt
  Note over UI,IDB: Network is not on the checkout critical path
  Sync->>API: schemaVersion 1 batch
  API->>PG: immutable sale + event + backend outbox
  PG-->>API: committed
  API--xSync: response may be lost
  Sync->>API: retry same transaction ID and payload
  API-->>Sync: ALREADY_PROCESSED
  Sync->>IDB: atomically mark settled and remove outbox
```

## Deployment shape

```mermaid
flowchart TB
  CDN["HTTPS static hosting / CDN"] --> Browser["Installed Operator PWA"]
  Browser --> LB["HTTPS load balancer"]
  LB --> API1["API replica"]
  LB --> API2["API replica"]
  API1 --> PG[("Managed PostgreSQL")]
  API2 --> PG
  Worker["Worker replicas"] --> PG
  PG --> Backup["Encrypted backups + PITR"]
  API1 --> Obs["Logs, metrics, alerts"]
  API2 --> Obs
  Worker --> Obs
```

## Ringkasan keputusan (Bahasa Indonesia)

Checkout hanya bergantung pada transaksi IndexedDB lokal; jaringan bukan bagian dari jalur kritis. Halaman UI memakai feature service, bukan Dexie atau SQL langsung. API dipecah per modul vertikal dan PostgreSQL tetap menjadi sumber kebenaran. Worker memproses transactional outbox secara idempoten, sehingga inventori akhirnya konsisten tanpa membuat transaksi kasir menunggu.
