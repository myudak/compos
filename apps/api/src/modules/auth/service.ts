import { randomUUID } from "node:crypto"

import type { LoginRequest } from "@operator/contracts"
import bcrypt from "bcryptjs"

import { signAccessToken, type AuthIdentity } from "../../auth.js"
import type { DatabasePool } from "../../db.js"
import { withTransaction } from "../../database/transaction.js"
import { HttpError } from "../../http/errors.js"
import { AuthRepository } from "./repository.js"

const ACCESS_TOKEN_MS = 12 * 60 * 60 * 1_000
const OFFLINE_LEASE_MS = 72 * 60 * 60 * 1_000

export class AuthService {
  private readonly repository: AuthRepository

  constructor(private readonly pool: DatabasePool) {
    this.repository = new AuthRepository(pool)
  }

  async login(input: LoginRequest) {
    const record = await this.repository.findLoginRecord(input)
    if (!record || record.role === "OWNER" || !(await bcrypt.compare(input.pin, record.pinHash))) {
      throw new HttpError(
        401,
        "INVALID_CREDENTIALS",
        "Merchant, operator, PIN, or device is invalid",
      )
    }
    const now = Date.now()
    const jti = randomUUID()
    const expiresAt = new Date(now + ACCESS_TOKEN_MS)
    const identity: AuthIdentity = {
      operatorId: record.operatorId,
      operatorName: record.operatorName,
      merchantId: record.merchantId,
      role: record.role,
      deviceId: input.deviceId,
      sessionId: jti,
    }
    await withTransaction(this.pool, (client) =>
      this.repository.createSession(client, {
        jti,
        merchantId: record.merchantId,
        operatorId: record.operatorId,
        deviceId: input.deviceId,
        expiresAt,
      }),
    )
    return {
      token: await signAccessToken(identity, expiresAt),
      expiresInSeconds: ACCESS_TOKEN_MS / 1_000,
      offlineLeaseExpiresAt: new Date(now + OFFLINE_LEASE_MS).toISOString(),
      merchantId: record.merchantId,
      operator: {
        id: record.operatorId,
        name: record.operatorName,
        role: record.role,
      },
    }
  }

  async logout(identity: AuthIdentity) {
    await this.repository.revokeSession(identity.sessionId, "LOGOUT")
    return { success: true as const }
  }
}
