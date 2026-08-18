# ADR-001 — Scoped PWA sebelum React Native

**Status:** Accepted

K-POS needs desktop/tablet/mobile reach, offline storage, and separate role experiences. Current scope
does not require native Bluetooth/NFC/printer SDK or reliable background execution.

**Decision:** build three React/Vite PWAs with scopes `/`, `/entry/`, `/owner/`. Operator owns Dexie
offline checkout; Entry/Owner are online-first with cacheable shell.

**Consequence:** one web delivery model and faster updates. Re-evaluate React Native only with measured
browser capability gap.
