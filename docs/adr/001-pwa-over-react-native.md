# ADR-001 — Responsive PWA Sebelum React Native

**Status:** Diterima

## Konteks

COMPOS harus cepat tersedia di desktop, tablet, dan mobile, mampu menyimpan data offline, dan mudah didemokan. Belum ada kebutuhan wajib untuk native printer, Bluetooth, NFC, atau background execution yang kuat.

## Keputusan

Bangun COMPOS Operator sebagai installable React PWA. Jangan membuat React Native app paralel sebelum ada kebutuhan native yang terukur.

## Kenapa begini?

Satu codebase memberi delivery dan QA surface yang lebih kecil. IndexedDB cukup untuk durable queue dan Vite PWA mudah didistribusikan tanpa app-store flow.

## Konsekuensi dan revisit trigger

Background sync mengikuti batas browser dan hardware integration lebih terbatas. Evaluasi React Native atau native wrapper kalau printer/Bluetooth/NFC, OS kiosk control, atau guaranteed background processing sudah menjadi requirement nyata.
