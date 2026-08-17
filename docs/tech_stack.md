# Tech Stack dan Trade-off

| Area            | Pilihan                                            | Kenapa dipakai                                                             |
| --------------- | -------------------------------------------------- | -------------------------------------------------------------------------- |
| Web             | React 19, Vite, TypeScript                         | Cepat untuk PWA, ecosystem matang, strict typing.                          |
| Owner web       | Separate React/Vite PWA                            | Reporting lifecycle terpisah dari offline checkout runtime.                |
| UI              | shadcn/ui, Tailwind CSS, Tabler Icons              | Accessible primitives, mudah di-theme, tidak mengunci ke component vendor. |
| Local data      | Dexie + IndexedDB                                  | Transactional durable storage yang native di browser.                      |
| UI state        | Zustand                                            | Ringan untuk ephemeral interaction state; bukan durable storage.           |
| Contracts       | Zod + inferred TypeScript                          | Runtime validation dan compile-time DTO dari satu sumber.                  |
| API             | Fastify                                            | Typed-friendly, ringan, lifecycle/plugin jelas.                            |
| Database        | PostgreSQL + `pg` typed repositories               | Constraint dan transaction kuat tanpa menambah ORM abstraction saat ini.   |
| Background work | PostgreSQL outbox, tiga independent worker lanes   | Reliable handoff tanpa broker; provider wait tidak memblokir projection.   |
| Test            | Vitest, fake-indexeddb, Fastify inject, Playwright | Mencakup pure policy sampai browser failure scenario.                      |
| Tooling         | pnpm workspaces, Oxlint, Oxfmt, GitHub Actions     | Native-speed quality gate dengan type-aware linting.                       |

## Kenapa PWA, bukan React Native?

COMPOS harus tersedia di desktop/tablet/mobile dan memakai offline browser storage tanpa bergantung pada native hardware integration. Satu responsive PWA lebih cepat dibangun, dipasang, di-update, dan dioperasikan. React Native baru masuk akal kalau kebutuhan berubah ke printer/Bluetooth/NFC/background sync yang memang tidak cukup reliable di browser.

## Kenapa belum RabbitMQ?

PostgreSQL outbox sudah memberi atomic handoff antara accepted sale dan inventory event. RabbitMQ akan menambah deployment, monitoring, retry semantics, dan failure surface sebelum ada throughput atau multi-consumer need yang terbukti. Broker layak ditambahkan nanti kalau independent consumers, replay, atau load test menunjukkan bottleneck nyata.

## Kenapa raw typed repositories, bukan ORM?

Domain ini sensitif ke exact constraint, transaction boundary, locking, dan idempotency. Explicit SQL + mapper membuat behavior tersebut kelihatan saat review. ORM bukan anti-pattern, tapi migrasi sekarang memberi churn besar tanpa menghilangkan kompleksitas inti. Keputusan ini bisa dievaluasi lagi saat schema dan tim tumbuh.

## Prinsip pemilihan teknologi

COMPOS memilih dependency berdasarkan problem hari ini. Abstraction atau infrastructure baru harus punya measured benefit, clear owner, failure model, dan test strategy—bukan sekadar terdengar production-grade.
