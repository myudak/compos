import { describe, expect, it } from "vitest"

import { syncEnvelopeSchema, syncTransactionSchema } from "./contracts.js"

const validTransaction = {
  transactionId: "0197f0a0-contract-test",
  invoiceNumber: "OPS-TEST01",
  operatorId: "OPR-RANI-07",
  transactionStatus: "CONFIRMED",
  paymentMethod: "CASH",
  paymentVerificationType: "SYSTEM_VERIFIABLE",
  subtotal: 22_000,
  discount: 0,
  tax: 0,
  total: 22_000,
  createdAtDevice: new Date().toISOString(),
  items: [{ productId: "prd-aren", name: "Kopi Susu Aren", quantity: 1, unitPrice: 22_000, subtotal: 22_000 }],
}

describe("sync contracts", () => {
  it("accepts a valid cash transaction", () => {
    expect(syncTransactionSchema.safeParse(validTransaction).success).toBe(true)
  })

  it("rejects mismatched totals and false payment verification claims", () => {
    const invalid = { ...validTransaction, total: 21_000, paymentMethod: "STATIC_QRIS", paymentVerificationType: "SYSTEM_VERIFIABLE" }
    const result = syncTransactionSchema.safeParse(invalid)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues.map((issue) => issue.message)).toEqual(expect.arrayContaining(["Total calculation is invalid", "QRIS and Transfer must be operator-asserted"]))
  })

  it("rejects batches larger than the client/server bound", () => {
    const result = syncEnvelopeSchema.safeParse({ merchantId: "MRC", deviceId: "DVC", batchId: "batch-1234", transactions: Array.from({ length: 26 }, () => validTransaction) })
    expect(result.success).toBe(false)
  })
})
