import { randomUUID } from "node:crypto"

import type { AuthIdentity } from "../../auth.js"
import type { DatabasePool } from "../../db.js"
import { withTransaction } from "../../database/transaction.js"
import { HttpError } from "../../http/errors.js"
import { incrementMetric } from "../../metrics.js"
import { ReconciliationRepository } from "./repository.js"

export class ReconciliationService {
  private readonly repository: ReconciliationRepository

  constructor(private readonly pool: DatabasePool) {
    this.repository = new ReconciliationRepository(pool)
  }

  async createCorrection(
    identity: AuthIdentity,
    transactionId: string,
    input: { reason: string; adjustmentAmount: number; evidenceReference?: string | undefined },
  ) {
    const correctionId = randomUUID()
    await withTransaction(this.pool, async (client) => {
      const exists = await this.repository.lockSettledTransaction(
        client,
        identity.merchantId,
        transactionId,
      )
      if (!exists) throw new HttpError(404, "NOT_FOUND", "Settled transaction not found")
      await this.repository.insertCorrection(client, {
        id: correctionId,
        merchantId: identity.merchantId,
        transactionId,
        adminId: identity.operatorId,
        ...input,
      })
    })
    incrementMetric("corrections_created_total")
    return {
      correctionId,
      transactionId,
      status: "RECORDED" as const,
      originalTransactionMutated: false,
    }
  }

  listCorrections(merchantId: string) {
    return this.repository.listCorrections(merchantId)
  }

  listDiscrepancies(merchantId: string) {
    return this.repository.listDiscrepancies(merchantId)
  }

  async resolveDiscrepancy(
    identity: AuthIdentity,
    id: string,
    input: { resolution: string; adjustedStock?: number | undefined },
  ) {
    await withTransaction(this.pool, async (client) => {
      const productId = await this.repository.lockOpenDiscrepancy(client, identity.merchantId, id)
      if (!productId) throw new HttpError(404, "NOT_FOUND", "Open discrepancy not found")
      await this.repository.resolveDiscrepancy(client, {
        id,
        merchantId: identity.merchantId,
        productId,
        adminId: identity.operatorId,
        ...input,
      })
    })
    return { id, status: "RESOLVED" as const }
  }
}
