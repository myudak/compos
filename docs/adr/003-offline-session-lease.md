# ADR-003 — Offline Checkout Lease 72 Jam

**Status:** Diterima

## Konteks

Kasir perlu tetap jualan saat token online 12 jam sudah expired, tetapi unlimited offline authority akan memperbesar risiko akun/device yang dicabut masih dipakai.

## Keputusan

Successful online authentication membuat local offline lease maksimal 72 jam. Setelah token expired tetapi lease valid, checkout lokal boleh lanjut dan sync pause. Setelah lease habis, data tetap readable/queued tetapi checkout baru diblokir sampai online login.

## Konsekuensi dan revisit trigger

Revocation tidak selalu langsung diketahui device offline. Merchant mendapat continuity tiga hari dengan bounded risk. Durasi harus ditinjau lagi berdasarkan fraud policy, pola outage, dan kemampuan remote device management production.
