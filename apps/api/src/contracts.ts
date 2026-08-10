import { z } from "zod"

export const paymentMethodSchema = z.enum(["CASH", "STATIC_QRIS", "TRANSFER"])

export const syncTransactionSchema = z.object({
  transactionId: z.string().min(8).max(128),
  invoiceNumber: z.string().min(4).max(64),
  operatorId: z.string().min(1),
  transactionStatus: z.enum(["CONFIRMED", "VOIDED"]),
  paymentMethod: paymentMethodSchema,
  paymentVerificationType: z.enum(["SYSTEM_VERIFIABLE", "OPERATOR_ASSERTED"]),
  paymentReference: z.string().max(160).optional(),
  subtotal: z.number().int().nonnegative(),
  discount: z.number().int().nonnegative(),
  tax: z.number().int().nonnegative().default(0),
  total: z.number().int().nonnegative(),
  createdAtDevice: z.iso.datetime({ offset: true }),
  items: z.array(z.object({
    productId: z.string().min(1),
    name: z.string().min(1).max(160),
    quantity: z.number().int().positive(),
    unitPrice: z.number().int().nonnegative(),
    subtotal: z.number().int().nonnegative(),
  })).min(1).max(100),
}).superRefine((value, ctx) => {
  const itemTotal = value.items.reduce((sum, item) => sum + item.subtotal, 0)
  if (itemTotal !== value.subtotal) ctx.addIssue({ code: "custom", message: "Subtotal does not match item sum", path: ["subtotal"] })
  if (value.subtotal - value.discount + value.tax !== value.total) ctx.addIssue({ code: "custom", message: "Total calculation is invalid", path: ["total"] })
  if (value.paymentMethod === "CASH" && value.paymentVerificationType !== "SYSTEM_VERIFIABLE") ctx.addIssue({ code: "custom", message: "Cash must be system-verifiable", path: ["paymentVerificationType"] })
  if (value.paymentMethod !== "CASH" && value.paymentVerificationType !== "OPERATOR_ASSERTED") ctx.addIssue({ code: "custom", message: "QRIS and Transfer must be operator-asserted", path: ["paymentVerificationType"] })
})

export const syncEnvelopeSchema = z.object({
  merchantId: z.string().min(1),
  deviceId: z.string().min(1),
  batchId: z.string().min(8),
  transactions: z.array(z.unknown()).min(1).max(25),
})

export type SyncTransaction = z.infer<typeof syncTransactionSchema>

export type SyncResult = {
  transactionId: string
  status: "ACCEPTED" | "ALREADY_PROCESSED" | "REJECTED_PERMANENT" | "RETRYABLE_ERROR"
  settlementStatus?: "SETTLED"
  receivedAtBackend?: string
  reason?: string
}
