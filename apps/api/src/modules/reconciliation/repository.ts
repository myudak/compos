import { randomUUID } from "node:crypto"

import type { DatabaseClient, DatabasePool } from "../../db.js"

export class ReconciliationRepository {
  constructor(private readonly pool: DatabasePool) {}

  async lockSettledTransaction(client: DatabaseClient, merchantId: string, transactionId: string) {
    const result = await client.query<{ id: string }>(
      `SELECT id FROM transactions
       WHERE merchant_id = $1 AND id = $2 AND settlement_status = 'SETTLED'
       FOR SHARE`,
      [merchantId, transactionId],
    )
    return Boolean(result.rows[0])
  }

  async insertCorrection(
    client: DatabaseClient,
    input: {
      id: string
      merchantId: string
      transactionId: string
      adminId: string
      reason: string
      adjustmentAmount: number
      evidenceReference?: string | undefined
    },
  ) {
    await client.query(
      `INSERT INTO corrections (
        id, merchant_id, transaction_id, admin_id,
        reason, adjustment_amount, evidence_reference
      ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        input.id,
        input.merchantId,
        input.transactionId,
        input.adminId,
        input.reason,
        input.adjustmentAmount,
        input.evidenceReference ?? null,
      ],
    )
    await client.query(
      `INSERT INTO transaction_events (
        merchant_id, transaction_id, event_type, actor_type, actor_id, payload
      ) VALUES ($1,$2,'CORRECTION_CREATED','ADMIN',$3,$4::jsonb)`,
      [
        input.merchantId,
        input.transactionId,
        input.adminId,
        JSON.stringify({ correctionId: input.id, reason: input.reason }),
      ],
    )
    await client.query(
      `INSERT INTO backend_outbox_events (
        id, merchant_id, aggregate_type, aggregate_id, event_type, payload
      ) VALUES ($1,$2,'CORRECTION',$3,'TRANSACTION_CORRECTED',$4::jsonb)`,
      [
        randomUUID(),
        input.merchantId,
        input.id,
        JSON.stringify({ correctionId: input.id, transactionId: input.transactionId }),
      ],
    )
    await this.insertAudit(client, {
      merchantId: input.merchantId,
      actorId: input.adminId,
      action: "CORRECTION_CREATED",
      targetType: "TRANSACTION",
      targetId: input.transactionId,
      metadata: { correctionId: input.id },
    })
  }

  async listCorrections(merchantId: string) {
    const result = await this.pool.query<{
      id: string
      transaction_id: string
      reason: string
      adjustment_amount: number
      evidence_reference: string | null
      created_at: Date
      admin_name: string
      invoice_number: string
    }>(
      `SELECT c.id, c.transaction_id, c.reason, c.adjustment_amount,
              c.evidence_reference, c.created_at, o.name AS admin_name,
              t.invoice_number
       FROM corrections c
       JOIN operators o ON o.id = c.admin_id
       JOIN transactions t
         ON t.merchant_id = c.merchant_id AND t.id = c.transaction_id
       WHERE c.merchant_id = $1
       ORDER BY c.created_at DESC LIMIT 100`,
      [merchantId],
    )
    return result.rows.map((row) => ({
      id: row.id,
      transactionId: row.transaction_id,
      reason: row.reason,
      adjustmentAmount: row.adjustment_amount,
      evidenceReference: row.evidence_reference,
      createdAt: row.created_at.toISOString(),
      adminName: row.admin_name,
      invoiceNumber: row.invoice_number,
    }))
  }

  async listDiscrepancies(merchantId: string) {
    const result = await this.pool.query<{
      id: string
      product_id: string
      product_name: string
      detected_at: Date
      projected_stock: number
      status: "OPEN" | "RESOLVED"
      resolution: string | null
      resolved_at: Date | null
    }>(
      `SELECT d.id, d.product_id, p.name AS product_name, d.detected_at,
              d.projected_stock, d.status, d.resolution, d.resolved_at
       FROM inventory_discrepancies d
       JOIN products p ON p.merchant_id = d.merchant_id AND p.id = d.product_id
       WHERE d.merchant_id = $1
       ORDER BY d.detected_at DESC LIMIT 100`,
      [merchantId],
    )
    return result.rows.map((row) => ({
      id: row.id,
      productId: row.product_id,
      productName: row.product_name,
      detectedAt: row.detected_at.toISOString(),
      projectedStock: row.projected_stock,
      status: row.status,
      resolution: row.resolution,
      resolvedAt: row.resolved_at?.toISOString() ?? null,
    }))
  }

  async lockOpenDiscrepancy(client: DatabaseClient, merchantId: string, id: string) {
    const result = await client.query<{ product_id: string }>(
      `SELECT product_id FROM inventory_discrepancies
       WHERE id = $1 AND merchant_id = $2 AND status = 'OPEN'
       FOR UPDATE`,
      [id, merchantId],
    )
    return result.rows[0]?.product_id
  }

  async resolveDiscrepancy(
    client: DatabaseClient,
    input: {
      id: string
      merchantId: string
      productId: string
      adminId: string
      resolution: string
      adjustedStock?: number | undefined
    },
  ) {
    if (input.adjustedStock !== undefined) {
      await client.query(
        `UPDATE products SET stock_projection = $1, updated_at = now()
         WHERE merchant_id = $2 AND id = $3`,
        [input.adjustedStock, input.merchantId, input.productId],
      )
    }
    await client.query(
      `UPDATE inventory_discrepancies
       SET status = 'RESOLVED', resolution = $1, resolved_by = $2, resolved_at = now()
       WHERE id = $3 AND merchant_id = $4`,
      [input.resolution, input.adminId, input.id, input.merchantId],
    )
    await this.insertAudit(client, {
      merchantId: input.merchantId,
      actorId: input.adminId,
      action: "INVENTORY_DISCREPANCY_RESOLVED",
      targetType: "INVENTORY_DISCREPANCY",
      targetId: input.id,
      metadata: { adjustedStock: input.adjustedStock },
    })
  }

  private async insertAudit(
    client: DatabaseClient,
    input: {
      merchantId: string
      actorId: string
      action: string
      targetType: string
      targetId: string
      metadata: unknown
    },
  ) {
    await client.query(
      `INSERT INTO admin_audit_events (
        id, merchant_id, actor_operator_id, action, target_type, target_id, metadata
      ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
      [
        randomUUID(),
        input.merchantId,
        input.actorId,
        input.action,
        input.targetType,
        input.targetId,
        JSON.stringify(input.metadata),
      ],
    )
  }
}
