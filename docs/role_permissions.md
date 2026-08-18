# Role & Permission Matrix

| Capability                             | `OPERATOR` | `ENTRY` |  `OWNER`  |
| -------------------------------------- | :--------: | :-----: | :-------: |
| Login Operator PWA / offline checkout  |     Ya     |  Tidak  |   Tidak   |
| Submit/poll own device sync            |     Ya     |  Tidak  |   Tidak   |
| View transaction history               |     Ya     |  Tidak  |    Ya     |
| Create/edit/archive product            |   Tidak    |   Ya    |   Tidak   |
| Stock adjustment/history               |   Tidak    |   Ya    | Ya (read) |
| Create/deactivate Entry/Operator       |   Tidak    |  Tidak  |    Ya     |
| Pair/revoke merchant device            |   Tidak    |  Tidak  |    Ya     |
| Resolve stock conflict / retry failure |   Tidak    |  Tidak  |    Ya     |
| Open/resolve payment exception         |   Tidak    |  Tidak  |    Ya     |
| Audit trail dan reporting              |   Tidak    |  Tidak  |    Ya     |

Owner account tidak dibuat oleh Owner management API. Primary Owner berasal dari onboarding;
controlled provisioning menangani recovery/additional Owner bila policy bisnis mengizinkan. UI guard
hanya usability; endpoint tetap wajib enforce role dan merchant.
