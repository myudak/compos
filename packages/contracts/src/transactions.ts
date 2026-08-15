import { z } from "zod"

import {
  paymentMethodSchema,
  paymentVerificationTypeSchema,
  settlementStatusSchema,
  transactionStatusSchema,
} from "./primitives.js"

export const transactionItemSchema = z.object({
  productId: z.string().min(1),
  name: z.string().min(1).max(160),
  quantity: z.number().int().positive(),
  unitPrice: z.number().int().nonnegative(),
  subtotal: z.number().int().nonnegative(),
})

export const syncTransactionSchema = z
  .object({
    transactionId: z.string().min(8).max(128),
    invoiceNumber: z.string().min(4).max(64),
    operatorId: z.string().min(1),
    transactionStatus: transactionStatusSchema.exclude(["PENDING"]),
    paymentMethod: paymentMethodSchema,
    paymentVerificationType: paymentVerificationTypeSchema,
    paymentReference: z.string().max(160).optional(),
    subtotal: z.number().int().nonnegative(),
    discount: z.number().int().nonnegative(),
    tax: z.number().int().nonnegative().default(0),
    total: z.number().int().nonnegative(),
    createdAtDevice: z.iso.datetime({ offset: true }),
    items: z.array(transactionItemSchema).min(1).max(100),
  })
  .superRefine((value, context) => {
    const itemTotal = value.items.reduce((sum, item) => sum + item.subtotal, 0)
    if (itemTotal !== value.subtotal) {
      context.addIssue({
        code: "custom",
        message: "Subtotal does not match item sum",
        path: ["subtotal"],
      })
    }
    if (value.subtotal - value.discount + value.tax !== value.total) {
      context.addIssue({
        code: "custom",
        message: "Total calculation is invalid",
        path: ["total"],
      })
    }
    const expected = value.paymentMethod === "CASH" ? "SYSTEM_VERIFIABLE" : "OPERATOR_ASSERTED"
    if (value.paymentVerificationType !== expected) {
      context.addIssue({
        code: "custom",
        message:
          value.paymentMethod === "CASH"
            ? "Cash must be system-verifiable"
            : "QRIS and Transfer must be operator-asserted",
        path: ["paymentVerificationType"],
      })
    }
  })

export const transactionSummarySchema = z.object({
  id: z.string().min(1),
  invoiceNumber: z.string(),
  operatorId: z.string().min(1),
  operatorName: z.string(),
  transactionStatus: transactionStatusSchema.exclude(["PENDING"]),
  settlementStatus: settlementStatusSchema,
  paymentMethod: paymentMethodSchema,
  total: z.number().int().nonnegative(),
  createdAtDevice: z.iso.datetime({ offset: true }),
  receivedAtBackend: z.iso.datetime({ offset: true }).nullable(),
})

export const transactionDetailSchema = transactionSummarySchema.extend({
  paymentVerificationType: paymentVerificationTypeSchema,
  paymentReference: z.string().nullable(),
  subtotal: z.number().int().nonnegative(),
  discount: z.number().int().nonnegative(),
  tax: z.number().int().nonnegative(),
  items: z.array(transactionItemSchema),
})

export type TransactionItem = z.infer<typeof transactionItemSchema>
export type SyncTransaction = z.infer<typeof syncTransactionSchema>
export type TransactionSummary = z.infer<typeof transactionSummarySchema>
export type TransactionDetail = z.infer<typeof transactionDetailSchema>
