# Render Demo Deployment

Jalur ini dibuat untuk siapa pun yang ingin mencoba COMPOS tanpa menyiapkan Node.js, pnpm, dan
PostgreSQL sendiri. Hasilnya adalah sandbox terisolasi di akun Render masing-masing—bukan shared
production environment.

## Resource yang dibuat

| Resource                   | Render plan | Fungsi                                                       |
| -------------------------- | ----------- | ------------------------------------------------------------ |
| `compos-demo`              | `free`      | Fastify API sekaligus host Operator `/` dan Owner `/owner/`. |
| `compos-background-worker` | `starter`   | Continuous inventory, reporting, dan insight lanes.          |
| `compos-demo-db`           | `free`      | PostgreSQL canonical ledger, session, audit, dan outbox.     |

Web dan API sengaja memakai origin yang sama supaya Blueprint tidak membutuhkan wiring public URL
lintas service. Worker tetap process independen agar settlement dan inventory projection tidak
disamarkan sebagai request-side effect.

> [!CAUTION]
> Worker `starter` adalah resource berbayar. Free Render PostgreSQL kedaluwarsa 30 hari setelah
> dibuat, tidak punya backup, dan bukan tempat menyimpan data penting. Selalu cek pricing terbaru di
> [Render](https://render.com/pricing) sebelum approve.

## Deploy

1. Klik tombol berikut dan login ke Render.
2. Review tiga resource, region Singapore, dan estimasi biaya worker.
3. Approve Blueprint. `JWT_SECRET` dibuat random oleh Render; demo activation code tetap
   `COMPOS-DEMO`.
4. Tunggu web service healthy dan initial deploy hook selesai melakukan deterministic seed.
5. Buka URL `compos-demo` yang diberikan Render.

<a href="https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2Fmyudak%2Fcompos">
  <img src="https://render.com/images/deploy-to-render-button.svg" alt="Deploy COMPOS to Render" />
</a>

Blueprint mematikan auto-deploy pada instance hasil tombol. Push ke upstream repository tidak akan
diam-diam mengubah sandbox yang sudah dibuat.

## Demo identity

| Role  | Merchant     | Operator | PIN    |
| ----- | ------------ | -------- | ------ |
| Kasir | `KEDAI-NUSA` | `RANI`   | `1234` |
| Admin | `KEDAI-NUSA` | `ADMIN`  | `9999` |
| Owner | `KEDAI-NUSA` | `OWNER`  | `7777` |

Device activation code: `COMPOS-DEMO`.

Credential ini sengaja publik untuk isolated demo. Jangan reuse credential atau seed tersebut
di environment yang memegang data merchant nyata.

## Smoke test

Ganti host di bawah dengan URL web service yang diberikan Render.

```bash
export COMPOS_URL=https://compos-demo.onrender.com
curl "$COMPOS_URL/health"
curl -H "Accept: text/plain" "$COMPOS_URL/metrics"
```

Expected minimum:

- `/`, `/owner/`, dan deep route masing-masing mengembalikan PWA yang benar, bukan 404;
- `/health` mengembalikan `status: ok` dan `database: reachable`;
- login RANI berhasil setelah device activation;
- offline checkout tetap ada setelah reload;
- setelah reconnect, status berubah settled dan backend outbox akhirnya kosong;
- Admin dapat melihat transaction dan inventory result yang sama.

## First boot dan migration

API dan worker sama-sama menjalankan built migration runner sebelum start. PostgreSQL advisory lock
memastikan hanya satu process yang menerapkan migration pada waktu yang sama. Web service kemudian
menjalankan seed melalui `initialDeployHook`, jadi redeploy biasa tidak me-reset PIN, catalog, atau
stock projection.

Kalau first boot gagal:

1. Cek log API dan worker untuk `Applied 001_initial.sql` atau database connection error.
2. Pastikan `DATABASE_URL` berasal dari `compos-demo-db`, bukan external URL yang diketik manual.
3. Pastikan web service sudah selesai menjalankan initial deploy hook.
4. Redeploy service yang gagal; migration dan event processing aman diulang.

## Meniru hosted profile secara lokal

```bash
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm build
SERVE_WEB=true pnpm start:hosted
```

Hosted API tersedia di `http://localhost:3001`; browser request memakai same-origin `/v1` dan tidak
membutuhkan `VITE_API_URL`. Worker bisa dijalankan terpisah dengan `pnpm worker:hosted`.

## Kenapa bukan satu tombol Vercel atau Cloudflare?

- [Vercel mendukung Fastify](https://vercel.com/docs/frameworks/backend/fastify), tetapi app menjadi
  Vercel Function. Continuous PostgreSQL outbox worker COMPOS tidak bisa dipindahkan apa adanya ke
  function yang memiliki execution duration.
- Cloudflare cocok untuk PWA hosting, tetapi full-stack migration membutuhkan Workers adapter,
  request-scoped database client/Hyperdrive, dan Queue consumer. Itu architecture change, bukan
  deployment config kecil.
- Render Blueprint bisa menyatakan Node web service, continuous worker, dan managed PostgreSQL tanpa
  mengubah business flow yang sedang didemokan.

Vercel atau Cloudflare masih valid sebagai frontend-only hosting kalau API, worker, database, CORS,
dan `VITE_API_URL` dikelola terpisah.

## Teardown

Setelah evaluasi selesai, hapus seluruh Render project dari dashboard supaya web service, paid
worker, dan database ikut berhenti. Export data yang memang perlu disimpan sebelum menghapus project;
free database tidak punya recovery guarantee.

Untuk production topology, backup expectation, dan security checklist, lanjut ke
[Deployment Plan](deployment_plan.md) dan [Operations Runbook](operations_runbook.md).
