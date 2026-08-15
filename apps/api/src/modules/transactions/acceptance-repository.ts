import { randomUUID } from "node:crypto"

import type { SyncTransaction } from "@operator/contracts"

import type { DatabaseClient, DatabasePool } from "../../db.js"

export type ExistingTransaction = {
  payloadHash: string
  receivedAtBackend: Date
}

type ExistingRow = { payload_hash: string; received_at_backend: Date }

export class TransactionAcceptanceRepository {
  constructor(private readonly pool: DatabasePool) {}

  async findExisting(
    client: DatabaseClient,
    merchantId: string,
    transactionId: string,
  ): Promise<ExistingTransaction | undefined> {
    const result = await client.query<ExistingRow>(
      `SELECT payload_hash, received_at_backend
       FROM transactions
       WHERE merchant_id = $1 AND id = $2`,
      [merchantId, transactionId],
    )
    return mapExisting(result.rows[0])
  }

  async findExistingOutsideTransaction(merchantId: string, transactionId: string) {
    const result = await this.pool.query<ExistingRow>(
      `SELECT payload_hash, received_at_backend
       FROM transactions
       WHERE merchant_id = $1 AND id = $2`,
      [merchantId, transactionId],
    )
    return mapExisting(result.rows[0])
  }

  async insertTransaction(
    client: DatabaseClient,
    merchantId: string,
    operatorId: string,
    deviceId: string,
    transaction: SyncTransaction,
    payloadHash: string,
  ) {
    const result = await client.query<{ received_at_backend: Date }>(
      `INSERT INTO transactions (
        id, merchant_id, device_id, operator_id, invoice_number, transaction_status,
        payment_method, payment_verification_type, payment_reference,
        subtotal, discount, tax, total, created_at_device, payload_hash
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING received_at_backend`,
      [
        transaction.transactionId,
        merchantId,
        deviceId,
        operatorId,
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
        payloadHash,
      ],
    )
    return result.rows[0]!.received_at_backend
  }

  async insertItems(
    client: DatabaseClient,
    merchantId: string,
    transactionId: string,
    items: SyncTransaction["items"],
  ) {
    await Promise.all(
      items.map((item) =>
        client.query(
          `INSERT INTO transaction_items (
            merchant_id, transaction_id, product_id, name_snapshot, quantity, unit_price, subtotal
          ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [
            merchantId,
            transactionId,
            item.productId,
            item.name,
            item.quantity,
            item.unitPrice,
            item.subtotal,
          ],
        ),
      ),
    )
  }

  async appendAcceptanceEvents(
    client: DatabaseClient,
    merchantId: string,
    operatorId: string,
    deviceId: string,
    transactionId: string,
  ) {
    await client.query(
      `INSERT INTO transaction_events (
        merchant_id, transaction_id, event_type, actor_type, actor_id, payload
      ) VALUES ($1,$2,'BACKEND_ACCEPTED','OPERATOR',$3,$4::jsonb)`,
      [merchantId, transactionId, operatorId, JSON.stringify({ deviceId })],
    )
    await client.query(
      `INSERT INTO backend_outbox_events (
        id, merchant_id, aggregate_type, aggregate_id, event_type, payload
      ) VALUES ($1,$2,'TRANSACTION',$3,'TRANSACTION_SETTLED',$4::jsonb)`,
      [randomUUID(), merchantId, transactionId, JSON.stringify({ transactionId })],
    )
  }

  async touchDevice(client: DatabaseClient, merchantId: string, deviceId: string) {
    await client.query(
      `UPDATE devices SET last_seen_at = now()
       WHERE id = $1 AND merchant_id = $2`,
      [deviceId, merchantId],
    )
  }
}

function mapExisting(row?: ExistingRow): ExistingTransaction | undefined {
  return row
    ? { payloadHash: row.payload_hash, receivedAtBackend: row.received_at_backend }
    : undefined
}
