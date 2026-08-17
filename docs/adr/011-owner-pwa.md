# ADR-011: Separate Owner PWA

**Status:** Diterima

Owner memakai `apps/owner-web`, online-first PWA terpisah di `/owner/`. Operator tetap mengutamakan
latency checkout dan offline durability; Owner mengutamakan aggregate reporting, freshness, dan
insight history. Role enforcement ada di API, sementara redirect UI hanya guard. Satu React bundle
untuk dua workflow ditolak karena memperbesar coupling dan membuat permission mudah bocor.
