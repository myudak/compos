# Tech Stack

| Layer         | Technology                                | Alasan                                                   |
| ------------- | ----------------------------------------- | -------------------------------------------------------- |
| UI            | React 19 + Vite + TypeScript              | fast PWA iteration, shared web primitives, responsive    |
| Styling       | Tailwind/shadcn-inspired primitives       | accessible consistent controls tanpa framework berat     |
| Local data    | Dexie / IndexedDB                         | browser transaction dan durable queue                    |
| Wire contract | NestJS OpenAPI + openapi-typescript + Zod | generated shape plus runtime validation                  |
| Backend       | NestJS modular monolith                   | canonical team backend, modules/guards/Swagger lifecycle |
| Data          | PostgreSQL + Prisma                       | transactional ledger, constraints, typed persistence     |
| Queue         | RabbitMQ                                  | durable confirm, retry queue, DLQ, backpressure          |
| Test          | Vitest, Jest, Supertest, Playwright       | policy sampai production browser failure flow            |
| Gateway       | Nginx                                     | same-origin routing tiga SPA + API precedence            |
| Tooling       | pnpm workspaces, Oxc                      | fast frontend install/lint/format                        |

## PWA, bukan React Native

Current hardware needs tidak mewajibkan Bluetooth/NFC/native printer/background execution. PWA
memberi satu deploy untuk desktop/tablet/mobile dan IndexedDB cukup untuk foreground offline checkout.
React Native baru dipertimbangkan kalau measured requirement browser tidak bisa dipenuhi.

## RabbitMQ dipakai di boundary yang tepat

Browser tidak berbicara langsung ke Rabbit. API membuat durable receipt, publish dengan confirm, lalu
consumer settle ke PostgreSQL. PostgreSQL tetap source of truth; Rabbit bukan ledger dan tidak dipakai
untuk request/response sederhana.

## Tidak memakai microservices/read replica dulu

Satu NestJS process + satu PostgreSQL + satu Rabbit deployment lebih murah dan mudah dioperasikan.
Split hanya setelah mixed-load evidence menunjukkan contention yang tidak selesai dengan index,
query budget, consumer prefetch, atau independent deployment process.
