# COMPOS Project Playbook

Ini adalah sumber utama product dan engineering knowledge untuk COMPOS. Mulai dari [Project Overview](project_overview.md), lalu pilih topik sesuai kebutuhan. Bahasa utamanya Indonesia, sementara istilah teknis tetap memakai English saat itu lebih presisi dan natural.

| Mau cari apa?                | Dokumen                                                                             |
| ---------------------------- | ----------------------------------------------------------------------------------- |
| Scope dan gambaran produk    | [Project Overview](project_overview.md) · [Case Study](case_study.md)               |
| Aktor dan journey            | [User Stories](user_stories.md)                                                     |
| Functional scope             | [Functional Requirements](functional_requirements.md)                               |
| Quality target               | [Non-Functional Requirements](non_functional_requirements.md)                       |
| Role dan authorization       | [Role & Permissions](role_permissions.md)                                           |
| Mapping requirement ke bukti | [Traceability Matrix](traceability_matrix.md)                                       |
| Arsitektur dan boundary      | [System Architecture](system_architecture.md)                                       |
| Offline sync                 | [Sync Protocol](sync_protocol.md)                                                   |
| Data model                   | [Database Design](database_design.md)                                               |
| Pilihan teknologi            | [Tech Stack](tech_stack.md)                                                         |
| Setup dan kontribusi         | [Development Guide](development_guide.md)                                           |
| Strategi verifikasi          | [Testing Strategy](testing_strategy.md)                                             |
| Presentasi case study        | [Demo Guide](demo_guide.md)                                                         |
| Deploy dan operasi           | [Deployment Plan](deployment_plan.md) · [Operations Runbook](operations_runbook.md) |
| Alasan keputusan arsitektur  | [ADR Index](adr/README.md)                                                          |

## Cara pakai playbook ini

- Peserta atau reviewer: mulai dari overview, case study, architecture, lalu demo guide.
- Developer baru: baca development guide, contracts, database design, dan testing strategy.
- Presenter: pakai traceability matrix buat menjawab “requirement ini dibuktikan di mana?”.
- Operator insiden: buka operations runbook; jangan hapus browser data ketika queue belum settled.

Kalau behavior code dan docs berbeda, anggap itu bug dokumentasi atau implementasi—bukan alasan untuk menebak. Update keduanya dalam perubahan yang sama.
