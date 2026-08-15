# ADR-006: Last-Known Catalog Remains Sellable Offline

**Status:** Accepted

## Decision

Devices replace their active local catalog after login, startup/reconnect, and manual refresh. While offline, a device may sell the last-known product and price snapshot. The backend accepts that immutable historical snapshot.

## Rationale and consequences

Rejecting a legitimate offline sale because a price changed elsewhere would violate checkout continuity. Temporary price divergence is explicit and auditable. Product administration is online-only, archive is soft-delete, and historical transaction items never point back to mutable catalog values.

## Ringkasan keputusan (Bahasa Indonesia)

Perangkat offline boleh memakai katalog/harga terakhir. Backend menerima snapshot historis tersebut agar penjualan tidak hilang. Perbedaan sementara adalah trade-off eventual consistency yang terlihat di audit.
