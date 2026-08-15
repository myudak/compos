import type { OperatorAppRole } from "@operator/contracts"

import type { DatabaseClient, DatabasePool } from "../../db.js"

export type LoginRecord = {
  operatorId: string
  operatorName: string
  merchantId: string
  role: OperatorAppRole | "OWNER"
  pinHash: string
}

export class AuthRepository {
  constructor(private readonly pool: DatabasePool) {}

  async findLoginRecord(input: {
    merchantCode: string
    operatorCode: string
    deviceId: string
  }): Promise<LoginRecord | undefined> {
    const result = await this.pool.query<{
      operator_id: string
      operator_name: string
      merchant_id: string
      role: OperatorAppRole | "OWNER"
      pin_hash: string
    }>(
      `SELECT o.id AS operator_id, o.name AS operator_name, o.merchant_id,
              o.role, o.pin_hash
       FROM operators o
       JOIN merchants m ON m.id = o.merchant_id
       JOIN devices d ON d.id = $3 AND d.merchant_id = o.merchant_id
       WHERE m.code = $1 AND o.code = $2 AND o.active = true
         AND d.revoked_at IS NULL`,
      [input.merchantCode, input.operatorCode, input.deviceId],
    )
    const row = result.rows[0]
    return row
      ? {
          operatorId: row.operator_id,
          operatorName: row.operator_name,
          merchantId: row.merchant_id,
          role: row.role,
          pinHash: row.pin_hash,
        }
      : undefined
  }

  async createSession(
    client: DatabaseClient,
    input: {
      jti: string
      merchantId: string
      operatorId: string
      deviceId: string
      expiresAt: Date
    },
  ) {
    await client.query(
      `INSERT INTO auth_sessions (
        jti, merchant_id, operator_id, device_id, expires_at
      ) VALUES ($1,$2,$3,$4,$5)`,
      [input.jti, input.merchantId, input.operatorId, input.deviceId, input.expiresAt],
    )
    await client.query(
      `UPDATE devices SET last_seen_at = now()
       WHERE id = $1 AND merchant_id = $2`,
      [input.deviceId, input.merchantId],
    )
  }

  async validateSession(jti: string) {
    const result = await this.pool.query<{
      operator_id: string
      operator_name: string
      merchant_id: string
      role: OperatorAppRole | "OWNER"
      device_id: string
    }>(
      `SELECT s.operator_id, o.name AS operator_name, s.merchant_id,
              o.role, s.device_id
       FROM auth_sessions s
       JOIN operators o ON o.id = s.operator_id AND o.merchant_id = s.merchant_id
       JOIN devices d ON d.id = s.device_id AND d.merchant_id = s.merchant_id
       WHERE s.jti = $1 AND s.revoked_at IS NULL AND s.expires_at > now()
         AND o.active = true AND d.revoked_at IS NULL`,
      [jti],
    )
    const row = result.rows[0]
    if (!row) return null
    await this.pool.query(`UPDATE auth_sessions SET last_seen_at = now() WHERE jti = $1`, [jti])
    return {
      operatorId: row.operator_id,
      operatorName: row.operator_name,
      merchantId: row.merchant_id,
      role: row.role,
      deviceId: row.device_id,
      sessionId: jti,
    }
  }

  async revokeSession(jti: string, reason: string) {
    await this.pool.query(
      `UPDATE auth_sessions
       SET revoked_at = COALESCE(revoked_at, now()), revoke_reason = COALESCE(revoke_reason, $2)
       WHERE jti = $1`,
      [jti, reason],
    )
  }
}
