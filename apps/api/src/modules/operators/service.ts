import type {
  CreateOperatorRequest,
  ResetPinRequest,
  UpdateOperatorRequest,
} from "@operator/contracts"
import bcrypt from "bcryptjs"

import type { AuthIdentity } from "../../auth.js"
import type { DatabasePool } from "../../db.js"
import { withTransaction } from "../../database/transaction.js"
import { HttpError } from "../../http/errors.js"
import { OperatorRepository } from "./repository.js"
import { assertOperatorUpdateAllowed } from "./policy.js"

export class OperatorService {
  private readonly repository: OperatorRepository

  constructor(private readonly pool: DatabasePool) {
    this.repository = new OperatorRepository(pool)
  }

  list(merchantId: string) {
    return this.repository.list(merchantId)
  }

  async create(identity: AuthIdentity, input: CreateOperatorRequest) {
    const pinHash = await bcrypt.hash(input.pin, 10)
    try {
      return await withTransaction(this.pool, async (client) => {
        const operator = await this.repository.create(client, {
          merchantId: identity.merchantId,
          code: input.code.toUpperCase(),
          name: input.name,
          role: input.role,
          pinHash,
        })
        await this.repository.audit(client, {
          merchantId: identity.merchantId,
          actorId: identity.operatorId,
          action: "OPERATOR_CREATED",
          targetId: operator.id,
          metadata: { code: operator.code, name: operator.name, role: operator.role },
        })
        return operator
      })
    } catch (error) {
      if ((error as { code?: string }).code === "23505") {
        throw new HttpError(409, "CONFLICT", "Operator code already exists for this merchant")
      }
      throw error
    }
  }

  async update(identity: AuthIdentity, operatorId: string, input: UpdateOperatorRequest) {
    return withTransaction(this.pool, async (client) => {
      const target = await this.repository.lock(client, identity.merchantId, operatorId)
      if (!target) throw new HttpError(404, "NOT_FOUND", "Operator not found")
      const next = {
        name: input.name ?? target.name,
        role: input.role ?? target.role,
        active: input.active ?? target.active,
      }
      assertOperatorUpdateAllowed({
        actorId: identity.operatorId,
        target,
        nextRole: next.role,
        nextActive: next.active,
        activeAdminCount: await this.repository.activeAdminCount(client, identity.merchantId),
      })
      const operator = await this.repository.update(client, identity.merchantId, operatorId, next)
      if (!next.active || next.role !== target.role) {
        await this.repository.revokeOperatorSessions(
          client,
          identity.merchantId,
          operatorId,
          !next.active ? "ACCOUNT_DEACTIVATED" : "ROLE_CHANGED",
        )
      }
      await this.repository.audit(client, {
        merchantId: identity.merchantId,
        actorId: identity.operatorId,
        action: "OPERATOR_UPDATED",
        targetId: operatorId,
        metadata: { name: next.name, role: next.role, active: next.active },
      })
      return operator
    })
  }

  async resetPin(identity: AuthIdentity, operatorId: string, input: ResetPinRequest) {
    const pinHash = await bcrypt.hash(input.pin, 10)
    await withTransaction(this.pool, async (client) => {
      const target = await this.repository.lock(client, identity.merchantId, operatorId)
      if (!target) {
        throw new HttpError(404, "NOT_FOUND", "Operator not found")
      }
      await this.repository.updatePin(client, identity.merchantId, operatorId, pinHash)
      await this.repository.revokeOperatorSessions(
        client,
        identity.merchantId,
        operatorId,
        "PIN_RESET",
      )
      await this.repository.audit(client, {
        merchantId: identity.merchantId,
        actorId: identity.operatorId,
        action: "OPERATOR_PIN_RESET",
        targetId: operatorId,
        metadata: {},
      })
    })
    return { success: true as const }
  }
}
