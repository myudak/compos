import { createHash, randomUUID } from "node:crypto"
import type pg from "pg"

import type { AuthIdentity } from "../auth.js"
import type { DatabasePool } from "../db.js"
import { incrementMetric } from "../metrics.js"
import type { SyncResult, SyncTransaction } from "../contracts.js"

function payloadHash(transaction: SyncTransaction) {
  return createHash("sha256").update(JSON.stringify(transaction)).digest("hex")
}

async function findExisting(client: pg.PoolClient, merchantId: string, transactionId: string) {
  const result = await client.query<{ payload_hash: string; received_at_backend: Date }>(
    "SELECT payload_hash, received_at_backend FROM transactions WHERE merchant_id = $1 AND id = $2",
    [merchantId, transactionId],
  )
  return result.rows[0]
}

export async function acceptTransaction(pool: DatabasePool, identity: AuthIdentity, deviceId: string, transaction: SyncTransaction): Promise<SyncResult> {
  const hash = payloadHash(transaction)
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    const existing = await findExisting(client, identity.merchantId, transaction.transactionId)
    if (existing) {
      await client.query("COMMIT")
      if (existing.payload_hash !== hash) {
        incrementMetric("transactions_rejected_total")
        return { transactionId: transaction.transactionId, status: "REJECTED_PERMANENT", reason: "ID_REUSE_PAYLOAD_MISMATCH" }
      }
      incrementMetric("transactions_duplicate_total")
      return { transactionId: transaction.transactionId, status: "ALREADY_PROCESSED", settlementStatus: "SETTLED", receivedAtBackend: existing.received_at_backend.toISOString() }
    }

    const inserted = await client.query<{ received_at_backend: Date }>(
      `INSERT INTO transactions (
        id, merchant_id, device_id, operator_id, invoice_number, transaction_status,
        payment_method, payment_verification_type, payment_reference,
        subtotal, discount, tax, total, created_at_device, payload_hash
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING received_at_backend`,
      [
        transaction.transactionId,
        identity.merchantId,
        deviceId,
        identity.operatorId,
        transaction.invoiceNumber,
        transaction.transactionStatus,
        transaction.paymentMethod,
        transaction.paymentVerificationType,
        transaction.paymentReference ?? null,
        transaction.subtotal,
        transaction.discount,
        transaction.tax,
        transaction.total,
        transaction.createdAtDevice,
        hash,
      ],
    )

    for (const item of transaction.items) {
      await client.query(
        `INSERT INTO transaction_items (merchant_id, transaction_id, product_id, name_snapshot, quantity, unit_price, subtotal)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [identity.merchantId, transaction.transactionId, item.productId, item.name, item.quantity, item.unitPrice, item.subtotal],
      )
    }

    await client.query(
      `INSERT INTO transaction_events (merchant_id, transaction_id, event_type, actor_type, actor_id, payload)
       VALUES ($1,$2,'BACKEND_ACCEPTED','OPERATOR',$3,$4::jsonb)`,
      [identity.merchantId, transaction.transactionId, identity.operatorId, JSON.stringify({ deviceId, batchAccepted: true })],
    )
    await client.query(
      `INSERT INTO backend_outbox_events (id, merchant_id, aggregate_type, aggregate_id, event_type, payload)
       VALUES ($1,$2,'TRANSACTION',$3,'TRANSACTION_SETTLED',$4::jsonb)`,
      [randomUUID(), identity.merchantId, transaction.transactionId, JSON.stringify({ transactionId: transaction.transactionId })],
    )
    await client.query("UPDATE devices SET last_seen_at = now() WHERE id = $1 AND merchant_id = $2", [deviceId, identity.merchantId])
    await client.query("COMMIT")
    incrementMetric("transactions_accepted_total")
    return { transactionId: transaction.transactionId, status: "ACCEPTED", settlementStatus: "SETTLED", receivedAtBackend: inserted.rows[0]!.received_at_backend.toISOString() }
  } catch (error) {
    await client.query("ROLLBACK")
    const databaseError = error as { code?: string }
    if (databaseError.code === "23505") {
      const existing = await pool.query<{ payload_hash: string; received_at_backend: Date }>("SELECT payload_hash, received_at_backend FROM transactions WHERE merchant_id = $1 AND id = $2", [identity.merchantId, transaction.transactionId])
      const row = existing.rows[0]
      if (row?.payload_hash === hash) {
        incrementMetric("transactions_duplicate_total")
        return { transactionId: transaction.transactionId, status: "ALREADY_PROCESSED", settlementStatus: "SETTLED", receivedAtBackend: row.received_at_backend.toISOString() }
      }
    }
    throw error
  } finally {
    client.release()
  }
}
