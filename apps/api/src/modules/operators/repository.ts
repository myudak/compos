import { randomUUID } from "node:crypto"

import type { AdminOperator, OperatorAppRole } from "@operator/contracts"

import type { DatabaseClient, DatabasePool } from "../../db.js"

type OperatorRow = {
  id: string
  code: string
  name: string
  role: OperatorAppRole
  active: boolean
  created_at: Date
  updated_at: Date
}

export class OperatorRepository {
  constructor(private readonly pool: DatabasePool) {}

  async list(merchantId: string): Promise<AdminOperator[]> {
    const result = await this.pool.query<OperatorRow>(
      `SELECT id, code, name, role, active, created_at, updated_at
       FROM operators
       WHERE merchant_id = $1
       ORDER BY active DESC, role, name`,
      [merchantId],
    )
    return result.rows.map(mapOperator)
  }

  async lock(client: DatabaseClient, merchantId: string, operatorId: string) {
    const result = await client.query<OperatorRow>(
      `SELECT id, code, name, role, active, created_at, updated_at
       FROM operators
       WHERE merchant_id = $1 AND id = $2
       FOR UPDATE`,
      [merchantId, operatorId],
    )
    return result.rows[0]
  }

  async activeAdminCount(client: DatabaseClient, merchantId: string) {
    const result = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count
       FROM operators
       WHERE merchant_id = $1 AND role = 'ADMIN' AND active = true`,
      [merchantId],
    )
    return Number(result.rows[0]?.count ?? 0)
  }

  async create(
    client: DatabaseClient,
    input: {
      merchantId: string
      code: string
      name: string
      role: OperatorAppRole
      pinHash: string
    },
  ) {
    const id = randomUUID()
    const result = await client.query<OperatorRow>(
      `INSERT INTO operators (id, merchant_id, code, name, role, pin_hash)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, code, name, role, active, created_at, updated_at`,
      [id, input.merchantId, input.code, input.name, input.role, input.pinHash],
    )
    return mapOperator(result.rows[0]!)
  }

  async update(
    client: DatabaseClient,
    merchantId: string,
    operatorId: string,
    input: { name: string; role: OperatorAppRole; active: boolean },
  ) {
    const result = await client.query<OperatorRow>(
      `UPDATE operators
       SET name = $1, role = $2, active = $3, updated_at = now()
       WHERE merchant_id = $4 AND id = $5
       RETURNING id, code, name, role, active, created_at, updated_at`,
      [input.name, input.role, input.active, merchantId, operatorId],
    )
    return mapOperator(result.rows[0]!)
  }

  async updatePin(client: DatabaseClient, merchantId: string, operatorId: string, pinHash: string) {
    await client.query(
      `UPDATE operators SET pin_hash = $1, updated_at = now()
       WHERE merchant_id = $2 AND id = $3`,
      [pinHash, merchantId, operatorId],
    )
  }

  async revokeOperatorSessions(
    client: DatabaseClient,
    merchantId: string,
    operatorId: string,
    reason: string,
  ) {
    await client.query(
      `UPDATE auth_sessions
       SET revoked_at = COALESCE(revoked_at, now()), revoke_reason = COALESCE(revoke_reason, $3)
       WHERE merchant_id = $1 AND operator_id = $2 AND revoked_at IS NULL`,
      [merchantId, operatorId, reason],
    )
  }

  async audit(
    client: DatabaseClient,
    input: {
      merchantId: string
      actorId: string
      action: string
      targetId: string
      metadata: unknown
    },
  ) {
    await client.query(
      `INSERT INTO admin_audit_events (
        id, merchant_id, actor_operator_id, action, target_type, target_id, metadata
      ) VALUES ($1,$2,$3,$4,'OPERATOR',$5,$6::jsonb)`,
      [
        randomUUID(),
        input.merchantId,
        input.actorId,
        input.action,
        input.targetId,
        JSON.stringify(input.metadata),
      ],
    )
  }
}

function mapOperator(row: OperatorRow): AdminOperator {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    role: row.role,
    active: row.active,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}
