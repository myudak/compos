# ADR-001: Responsive PWA Before React Native

**Status:** Accepted

## Decision

Ship the Operator client as a responsive, installable React PWA. Keep sync contracts client-agnostic so a future native adapter can reuse them.

## Rationale and consequences

The case requires desktop, tablet, and mobile usability plus offline storage; IndexedDB and a cached app shell satisfy those needs with one deployment surface. React Native becomes justified when printer SDKs, managed kiosk APIs, or guaranteed background execution are proven requirements. Browser background sync is best-effort, so this PWA synchronizes while open and clearly exposes queue state.

## Ringkasan keputusan (Bahasa Indonesia)

PWA dipilih karena satu codebase sudah mencakup laptop, tablet, mobile, IndexedDB, dan instalasi offline. React Native baru layak jika ada kebutuhan hardware/kiosk yang browser tidak dapat penuhi.
