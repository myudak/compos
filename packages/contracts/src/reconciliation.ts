import { z } from "zod"

export const createCorrectionRequestSchema = z.object({
  reason: z.string().trim().min(8).max(500),
  adjustmentAmount: z.number().int(),
  evidenceReference: z.string().max(180).optional(),
})

export const createCorrectionResponseSchema = z.object({
  correctionId: z.string().min(1),
  transactionId: z.string().min(1),
  status: z.literal("RECORDED"),
  originalTransactionMutated: z.literal(false),
})

export const correctionRecordSchema = z.object({
  id: z.string().min(1),
  transactionId: z.string().min(1),
  reason: z.string(),
  adjustmentAmount: z.number().int(),
  evidenceReference: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  adminName: z.string(),
  invoiceNumber: z.string(),
})

export const correctionListResponseSchema = z.object({
  corrections: z.array(correctionRecordSchema),
})

export const inventoryDiscrepancySchema = z.object({
  id: z.string().min(1),
  productId: z.string().min(1),
  productName: z.string(),
  detectedAt: z.iso.datetime({ offset: true }),
  projectedStock: z.number().int(),
  status: z.enum(["OPEN", "RESOLVED"]),
  resolution: z.string().nullable(),
  resolvedAt: z.iso.datetime({ offset: true }).nullable(),
})

export const inventoryDiscrepancyListResponseSchema = z.object({
  discrepancies: z.array(inventoryDiscrepancySchema),
})

export const resolveInventoryDiscrepancyRequestSchema = z.object({
  resolution: z.string().trim().min(8).max(500),
  adjustedStock: z.number().int().optional(),
})

export const resolveInventoryDiscrepancyResponseSchema = z.object({
  id: z.string().min(1),
  status: z.literal("RESOLVED"),
})

export type CreateCorrectionRequest = z.infer<typeof createCorrectionRequestSchema>
export type CorrectionRecord = z.infer<typeof correctionRecordSchema>
export type InventoryDiscrepancy = z.infer<typeof inventoryDiscrepancySchema>
export type ResolveInventoryDiscrepancyRequest = z.infer<
  typeof resolveInventoryDiscrepancyRequestSchema
>
