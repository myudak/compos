import { createHash } from "node:crypto"

import type { SyncResult, SyncTransaction } from "@operator/contracts"

import type { AuthIdentity } from "../../auth.js"
import type { DatabasePool } from "../../db.js"
import { withTransaction } from "../../database/transaction.js"
import { incrementMetric, observeMetric } from "../../metrics.js"
import { TransactionAcceptanceRepository } from "./acceptance-repository.js"

export class TransactionAcceptanceService {
  private readonly repository: TransactionAcceptanceRepository

  constructor(private readonly pool: DatabasePool) {
    this.repository = new TransactionAcceptanceRepository(pool)
  }

  async accept(
    identity: AuthIdentity,
    deviceId: string,
    transaction: SyncTransaction,
  ): Promise<SyncResult> {
    const startedAt = performance.now()
    const hash = payloadHash(transaction)
    try {
      return await withTransaction(this.pool, async (client) => {
        const existing = await this.repository.findExisting(
          client,
          identity.merchantId,
          transaction.transactionId,
        )
        if (existing) return duplicateResult(transaction.transactionId, hash, existing)

        const receivedAt = await this.repository.insertTransaction(
          client,
          identity.merchantId,
          identity.operatorId,
          deviceId,
          transaction,
          hash,
        )
        await this.repository.insertItems(
          client,
          identity.merchantId,
          transaction.transactionId,
          transaction.items,
        )
        await this.repository.appendAcceptanceEvents(
          client,
          identity.merchantId,
          identity.operatorId,
          deviceId,
          transaction.transactionId,
        )
        await this.repository.touchDevice(client, identity.merchantId, deviceId)
        incrementMetric("transactions_accepted_total")
        return {
          transactionId: transaction.transactionId,
          status: "ACCEPTED",
          settlementStatus: "SETTLED",
          receivedAtBackend: receivedAt.toISOString(),
        }
      })
    } catch (error) {
      if ((error as { code?: string }).code === "23505") {
        const existing = await this.repository.findExistingOutsideTransaction(
          identity.merchantId,
          transaction.transactionId,
        )
        if (existing) return duplicateResult(transaction.transactionId, hash, existing)
      }
      throw error
    } finally {
      observeMetric(
        "database_transaction_latency_ms",
        Math.round((performance.now() - startedAt) * 100) / 100,
      )
    }
  }
}

function payloadHash(transaction: SyncTransaction) {
  return createHash("sha256").update(JSON.stringify(transaction)).digest("hex")
}

function duplicateResult(
  transactionId: string,
  incomingHash: string,
  existing: { payloadHash: string; receivedAtBackend: Date },
): SyncResult {
  if (existing.payloadHash !== incomingHash) {
    incrementMetric("transactions_rejected_total")
    return {
      transactionId,
      status: "REJECTED_PERMANENT",
      reason: "ID_REUSE_PAYLOAD_MISMATCH",
    }
  }
  incrementMetric("transactions_duplicate_total")
  return {
    transactionId,
    status: "ALREADY_PROCESSED",
    settlementStatus: "SETTLED",
    receivedAtBackend: existing.receivedAtBackend.toISOString(),
  }
}
