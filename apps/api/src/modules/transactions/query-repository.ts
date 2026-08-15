import type { PaymentMethod, PaymentVerificationType } from "@operator/contracts"

import type { DatabasePool } from "../../db.js"

type TransactionListRow = {
  id: string
  invoice_number: string
  transaction_status: "CONFIRMED" | "VOIDED"
  settlement_status: "SETTLED"
  payment_method: PaymentMethod
  payment_verification_type: PaymentVerificationType
  total: number
  created_at_device: Date
  received_at_backend: Date
  operator_id: string
  operator_name: string
  correction_total: number
}

export class TransactionQueryRepository {
  constructor(private readonly pool: DatabasePool) {}

  async list(merchantId: string, limit: number, paymentRiskOnly: boolean) {
    const result = await this.pool.query<TransactionListRow>(
      `SELECT t.id, t.invoice_number, t.transaction_status, t.settlement_status,
              t.payment_method, t.payment_verification_type, t.total,
              t.created_at_device, t.received_at_backend, t.operator_id,
              o.name AS operator_name,
              COALESCE((
                SELECT sum(c.adjustment_amount)
                FROM corrections c
                WHERE c.merchant_id = t.merchant_id AND c.transaction_id = t.id
              ), 0)::int AS correction_total
       FROM transactions t
       JOIN operators o ON o.id = t.operator_id
       WHERE t.merchant_id = $1
         AND ($2::boolean = false OR t.payment_verification_type = 'OPERATOR_ASSERTED')
       ORDER BY t.received_at_backend DESC
       LIMIT $3`,
      [merchantId, paymentRiskOnly, limit],
    )
    return result.rows.map(mapTransactionListRow)
  }

  async detail(merchantId: string, transactionId: string) {
    const transaction = await this.pool.query<
      TransactionListRow & {
        device_id: string
        device_name: string
        payment_reference: string | null
        subtotal: number
        discount: number
        tax: number
      }
    >(
      `SELECT t.id, t.invoice_number, t.transaction_status, t.settlement_status,
              t.payment_method, t.payment_verification_type, t.payment_reference,
              t.subtotal, t.discount, t.tax, t.total, t.created_at_device,
              t.received_at_backend, t.operator_id, o.name AS operator_name,
              t.device_id, d.name AS device_name, 0::int AS correction_total
       FROM transactions t
       JOIN operators o ON o.id = t.operator_id
       JOIN devices d ON d.id = t.device_id
       WHERE t.merchant_id = $1 AND t.id = $2`,
      [merchantId, transactionId],
    )
    const row = transaction.rows[0]
    if (!row) return null
    const [items, events, corrections] = await Promise.all([
      this.pool.query<{
        product_id: string
        name_snapshot: string
        quantity: number
        unit_price: number
        subtotal: number
      }>(
        `SELECT product_id, name_snapshot, quantity, unit_price, subtotal
         FROM transaction_items WHERE merchant_id = $1 AND transaction_id = $2`,
        [merchantId, transactionId],
      ),
      this.pool.query<{
        event_type: string
        actor_type: string
        actor_id: string
        payload: unknown
        event_timestamp: Date
      }>(
        `SELECT event_type, actor_type, actor_id, payload, event_timestamp
         FROM transaction_events
         WHERE merchant_id = $1 AND transaction_id = $2
         ORDER BY event_timestamp`,
        [merchantId, transactionId],
      ),
      this.pool.query<{
        id: string
        reason: string
        adjustment_amount: number
        evidence_reference: string | null
        created_at: Date
      }>(
        `SELECT id, reason, adjustment_amount, evidence_reference, created_at
         FROM corrections
         WHERE merchant_id = $1 AND transaction_id = $2
         ORDER BY created_at`,
        [merchantId, transactionId],
      ),
    ])
    return {
      transaction: {
        ...mapTransactionListRow(row),
        deviceId: row.device_id,
        deviceName: row.device_name,
        paymentReference: row.payment_reference,
        subtotal: row.subtotal,
        discount: row.discount,
        tax: row.tax,
      },
      items: items.rows.map((item) => ({
        productId: item.product_id,
        name: item.name_snapshot,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        subtotal: item.subtotal,
      })),
      events: events.rows.map((event) => ({
        eventType: event.event_type,
        actorType: event.actor_type,
        actorId: event.actor_id,
        payload: event.payload,
        eventTimestamp: event.event_timestamp.toISOString(),
      })),
      corrections: corrections.rows.map((correction) => ({
        id: correction.id,
        reason: correction.reason,
        adjustmentAmount: correction.adjustment_amount,
        evidenceReference: correction.evidence_reference,
        createdAt: correction.created_at.toISOString(),
      })),
    }
  }
}

function mapTransactionListRow(row: TransactionListRow) {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    transactionStatus: row.transaction_status,
    settlementStatus: row.settlement_status,
    paymentMethod: row.payment_method,
    paymentVerificationType: row.payment_verification_type,
    total: row.total,
    createdAtDevice: row.created_at_device.toISOString(),
    receivedAtBackend: row.received_at_backend.toISOString(),
    operatorId: row.operator_id,
    operatorName: row.operator_name,
    correctionTotal: row.correction_total,
  }
}
