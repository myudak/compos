import type { AuthIdentity } from "../../auth.js"
import { config } from "../../config.js"
import type { DatabasePool } from "../../db.js"
import { withTransaction } from "../../database/transaction.js"
import { HttpError } from "../../http/errors.js"
import { DeviceRepository } from "./repository.js"

export class DeviceService {
  private readonly repository: DeviceRepository

  constructor(private readonly pool: DatabasePool) {
    this.repository = new DeviceRepository(pool)
  }

  async register(input: {
    merchantCode: string
    activationCode: string
    deviceId: string
    deviceName: string
  }) {
    if (input.activationCode !== config.DEVICE_ACTIVATION_CODE) {
      throw new HttpError(403, "FORBIDDEN", "Invalid activation code")
    }
    const merchantId = await this.repository.merchantIdByCode(input.merchantCode)
    if (!merchantId) throw new HttpError(404, "NOT_FOUND", "Merchant not found")
    const registered = await this.repository.register({
      id: input.deviceId,
      merchantId,
      name: input.deviceName,
    })
    if (!registered) throw new HttpError(409, "CONFLICT", "Device cannot be registered")
    return { deviceId: input.deviceId, merchantId, status: "REGISTERED" as const }
  }

  list(merchantId: string) {
    return this.repository.list(merchantId)
  }

  async revoke(identity: AuthIdentity, deviceId: string) {
    await withTransaction(this.pool, async (client) => {
      if (!(await this.repository.revoke(client, identity.merchantId, deviceId))) {
        throw new HttpError(404, "NOT_FOUND", "Device not found")
      }
      await this.repository.revokeSessions(client, identity.merchantId, deviceId)
      await this.repository.audit(client, {
        merchantId: identity.merchantId,
        actorId: identity.operatorId,
        deviceId,
      })
    })
    return { deviceId, status: "REVOKED" as const }
  }
}
