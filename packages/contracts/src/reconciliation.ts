import { z } from "zod"

import { paymentMethodSchema } from "./primitives.js"

export const correctionRequestSchema = z.object({
  replacementPaymentMethod: paymentMethodSchema,
  replacementPaymentReference: z.string().max(160).optional(),
  reason: z.string().trim().min(4).max(500),
})

export const correctionSchema = correctionRequestSchema.extend({
  id: z.string().min(1),
  transactionId: z.string().min(1),
  adminOperatorId: z.string().min(1),
  createdAt: z.iso.datetime({ offset: true }),
})

export const discrepancySchema = z.object({
  id: z.string().min(1),
  productId: z.string().min(1),
  productName: z.string(),
  projectedStock: z.number().int(),
  status: z.enum(["OPEN", "RESOLVED"]),
  reason: z.string(),
  createdAt: z.iso.datetime({ offset: true }),
  resolvedAt: z.iso.datetime({ offset: true }).nullable(),
})

export const resolveDiscrepancyRequestSchema = z.object({
  correctedStock: z.number().int().nonnegative(),
  note: z.string().trim().min(3).max(500),
})

export type CorrectionRequest = z.infer<typeof correctionRequestSchema>
export type Correction = z.infer<typeof correctionSchema>
export type Discrepancy = z.infer<typeof discrepancySchema>
export type ResolveDiscrepancyRequest = z.infer<typeof resolveDiscrepancyRequestSchema>
