import { randomUUID } from "node:crypto"

import type { AdminDevice } from "@operator/contracts"

import type { DatabaseClient, DatabasePool } from "../../db.js"

export class DeviceRepository {
  constructor(private readonly pool: DatabasePool) {}

  async merchantIdByCode(code: string) {
    const result = await this.pool.query<{ id: string }>(
      `SELECT id FROM merchants WHERE code = $1`,
      [code],
    )
    return result.rows[0]?.id
  }

  async register(input: { id: string; merchantId: string; name: string }) {
    const result = await this.pool.query<{ id: string }>(
      `INSERT INTO devices (id, merchant_id, name) VALUES ($1,$2,$3)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
       WHERE devices.merchant_id = EXCLUDED.merchant_id
         AND devices.revoked_at IS NULL
       RETURNING id`,
      [input.id, input.merchantId, input.name],
    )
    return Boolean(result.rows[0])
  }

  async list(merchantId: string): Promise<AdminDevice[]> {
    const result = await this.pool.query<{
      id: string
      name: string
      registered_at: Date
      revoked_at: Date | null
    }>(
      `SELECT id, name, registered_at, revoked_at
       FROM devices WHERE merchant_id = $1
       ORDER BY registered_at DESC`,
      [merchantId],
    )
    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      registeredAt: row.registered_at.toISOString(),
      revokedAt: row.revoked_at?.toISOString() ?? null,
    }))
  }

  async revoke(client: DatabaseClient, merchantId: string, deviceId: string) {
    const result = await client.query(
      `UPDATE devices SET revoked_at = now()
       WHERE id = $1 AND merchant_id = $2 AND revoked_at IS NULL`,
      [deviceId, merchantId],
    )
    return Boolean(result.rowCount)
  }

  async revokeSessions(client: DatabaseClient, merchantId: string, deviceId: string) {
    await client.query(
      `UPDATE auth_sessions
       SET revoked_at = COALESCE(revoked_at, now()),
           revoke_reason = COALESCE(revoke_reason, 'DEVICE_REVOKED')
       WHERE merchant_id = $1 AND device_id = $2 AND revoked_at IS NULL`,
      [merchantId, deviceId],
    )
  }

  async audit(
    client: DatabaseClient,
    input: { merchantId: string; actorId: string; deviceId: string },
  ) {
    await client.query(
      `INSERT INTO admin_audit_events (
        id, merchant_id, actor_operator_id, action, target_type, target_id, metadata
      ) VALUES ($1,$2,$3,'DEVICE_REVOKED','DEVICE',$4,'{}'::jsonb)`,
      [randomUUID(), input.merchantId, input.actorId, input.deviceId],
    )
  }
}
