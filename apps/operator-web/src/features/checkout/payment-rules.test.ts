import { describe, expect, it } from "vitest"

import { validatePayment, verificationTypeFor } from "./payment-rules"

describe("payment rules", () => {
  it("requires sufficient cash and records Operator verification", () => {
    expect(validatePayment("CASH", 20_000, 19_000)).toBe(false)
    expect(validatePayment("CASH", 20_000, 20_000)).toBe(true)
    expect(verificationTypeFor("CASH")).toBe("OPERATOR_VERIFIED")
  })

  it("requires Operator confirmation for QRIS and transfer", () => {
    expect(validatePayment("STATIC_QRIS", 20_000, undefined, false)).toBe(false)
    expect(validatePayment("BANK_TRANSFER", 20_000, undefined, true)).toBe(true)
    expect(verificationTypeFor("STATIC_QRIS")).toBe("OPERATOR_VERIFIED")
  })
})
