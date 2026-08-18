# K-POS Product & Engineering Playbook

Dokumentasi ini Indonesian-first; istilah technical English dipakai kalau lebih presisi. Backend
OpenAPI tetap normative untuk wire contract.

## Mulai di sini

1. [Project overview](project_overview.md)
2. [Product principles](product_principles.md)
3. [Functional requirements](functional_requirements.md) dan
   [non-functional requirements](non_functional_requirements.md)
4. [Role permissions](role_permissions.md) dan [user stories](user_stories.md)
5. [System architecture](system_architecture.md) dan [sync protocol](sync_protocol.md)
6. [Database design](database_design.md) dan [tech stack](tech_stack.md)
7. [Testing strategy](testing_strategy.md) dan [traceability](traceability_matrix.md)
8. [Development guide](development_guide.md), [deployment](deployment_plan.md),
   [runbook](operations_runbook.md), dan [demo](demo_guide.md)
9. [Scaling strategy](scaling_strategy.md) dan [ADR index](adr/README.md)

## Source precedence

Kalau dokumen dan code berkontradiksi, resolve memakai urutan:

1. project overview dan product principles;
2. FRD/NFR;
3. architecture dan user flow;
4. backend generated OpenAPI;
5. current implementation.

Contradiction yang ditemukan harus diperbaiki di source lebih tinggi dan ditrace ke implementation,
bukan disembunyikan dengan adapter UI.
