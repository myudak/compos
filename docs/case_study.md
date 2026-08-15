# Case Study: Sync Without Signal

## Problem

Application K is a POS and BI platform for Indonesian SMEs. Its Operator application is business-critical and must keep checking out customers through prolonged or intermittent outages. Cash is system-verifiable, while Static QRIS and bank transfer depend on an operator observing an external payment signal.

An offline-confirmed sale is **provisional** until backend acceptance. Reconnection must neither lose nor duplicate it. Several devices may sell for one merchant while disconnected, backend-confirmed history is immutable, and inventory is deducted after acceptance as an eventually consistent projection.

## Case-study obligations

- Create and confirm transactions offline; survive browser restart.
- Synchronize automatically after reconnection with no normal manual reconciliation.
- Prevent lost and duplicate transactions, including a lost successful HTTP response.
- Show provisional versus settled state explicitly.
- Support Cash, Static QRIS, and Transfer confirmation semantics.
- Support multiple devices and operators under one merchant.
- Permit provisional void; forbid Operator mutation after settlement.
- Provide Admin-only append-only payment correction.
- Deduct inventory after acceptance and expose negative projections as discrepancies.
- Handle interrupted, concurrent, partial, and mass-reconnect synchronization.
- Provide login, logout, controlled account creation, and permissions.

## Chosen consistency model

Checkout is locally strongly consistent: sale, item snapshots, stock projection, outbox intent, and draft removal commit in one IndexedDB transaction. Cross-device data is eventually consistent. Backend acceptance is strongly consistent per `(merchant_id, transaction_id)` and payload hash. Inventory is deliberately eventual and may temporarily become negative.

This preserves availability at the counter while placing hard consistency at the acceptance boundary where PostgreSQL can enforce it.

## In scope

- Installable Operator PWA for cashier and merchant Admin.
- Fastify API, PostgreSQL, and inventory/outbox worker.
- Controlled Admin provisioning of Operator/Admin users and registered devices.
- Merchant catalog/pricing management and local catalog snapshots.
- Transaction, payment-risk correction, inventory discrepancy, and audit workflows.

## Out of scope

- Entry and Owner applications; `OWNER` is a reserved backend role only.
- Public self-signup, self-serve merchant onboarding, and Owner access in this UI.
- React Native clients, real-time stock reservation, supplier restocking, payment-gateway verification, accounting, refunds, and fiscal receipt integration.
- RabbitMQ before measured scale requires independent delivery infrastructure.

## Success evidence

The demo and automated suite prove offline reload, reconnect settlement, lost-response retry, multi-device sales, partial batch acceptance, session/device revocation, immutable correction, inventory replay, merchant isolation, and offline-lease expiry.

## Ringkasan keputusan (Bahasa Indonesia)

Masalah inti bukan sekadar UI offline, tetapi konsistensi transaksi ketika respons hilang dan beberapa device bekerja sendiri. Solusi memilih transaksi lokal atomik, ID stabil, acceptance PostgreSQL yang idempoten, dan inventori eventual. PWA mencakup Operator/Admin; aplikasi Entry, Owner, React Native, reservasi stok real-time, dan RabbitMQ belum termasuk scope.
