import type { DatabasePool } from "../../db.js"

export class BootstrapRepository {
  constructor(private readonly pool: DatabasePool) {}

  async merchant(merchantId: string) {
    const result = await this.pool.query<{ id: string; name: string }>(
      `SELECT id, name FROM merchants WHERE id = $1`,
      [merchantId],
    )
    return result.rows[0]
  }

  async device(merchantId: string, deviceId: string) {
    const result = await this.pool.query<{
      id: string
      name: string
      revoked_at: Date | null
    }>(
      `SELECT id, name, revoked_at
       FROM devices WHERE id = $1 AND merchant_id = $2`,
      [deviceId, merchantId],
    )
    const row = result.rows[0]
    return row ? { id: row.id, name: row.name, revokedAt: row.revoked_at } : undefined
  }
}
