# Demo Guide

Start `pnpm stack:up`, then use production-like origin `http://localhost:8080`.

| Role     | Credentials                                                     |
| -------- | --------------------------------------------------------------- |
| Operator | `operator@kedai-nusa.test` / `operator123` / `KPOS-DEMO-DEVICE` |
| Entry    | `entry@kedai-nusa.test` / `entry123`                            |
| Owner    | `owner@kedai-nusa.test` / `owner123`                            |

## 8-minute walkthrough

1. **Offline atomic checkout:** login Operator online, matikan browser network, add items dan bayar.
   Tunjukkan receipt `PROVISIONAL`, reload, sale masih ada.
2. **Durable sync:** hidupkan network. Status bergerak `QUEUED` lalu `SETTLED`; tunjukkan receipt
   canonical dan Rabbit Management activity.
3. **Exactly-once:** replay request identik atau jalankan dropped-response E2E. Ledger tetap satu.
4. **Entry staleness:** Entry archive/ubah product sementara Operator offline. Cached product masih bisa
   dijual dengan snapshot lama dan backend tidak reprice history.
5. **Stock conflict:** buat oversell, buka Owner sync desk, pilih confirm atau void.
6. **Payment exception:** buka case untuk verified transfer, resolve invalid. Tunjukkan payment
   `FAILED`, original transaction masih ada, effective status void.
7. **Reporting:** tunggu projection lalu tunjukkan freshness dan totals converge.
8. **Degraded broker:** stop Rabbit; `/health` degraded tetapi Owner login/REST tetap hidup dan local
   checkout tidak hilang. Start Rabbit dan tunjukkan recovery.

## Demo principles

Jangan menyebut enqueue sebagai settlement. Jangan clear browser data untuk “memperbaiki” queue.
Tunjukkan failure/recovery evidence, bukan hanya happy path UI.
