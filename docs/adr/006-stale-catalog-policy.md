# ADR-006 — Stale Catalog Boleh Dipakai Offline

**Status:** Diterima

## Konteks

Device offline tidak bisa tahu perubahan harga/archive terbaru. Memblokir checkout akan menabrak jaminan availability utama produk.

## Keputusan

Device boleh menjual dari last-known active catalog dan menyimpan item/price snapshot pada transaction. Backend menerima historical snapshot yang valid secara contract. Catalog refresh dilakukan saat login, startup/reconnect, dan manual refresh.

## Konsekuensi

Merchant menerima temporary price/catalog divergence. Histori tetap jujur karena snapshot immutable. Kalau bisnis nanti menuntut strict price freshness, dibutuhkan policy versioning atau online authorization yang mengurangi offline availability.
