import { describe, expect, it } from "vitest"

import { BATCH_SIZE, calculateBackoffMs } from "@/lib/sync-engine"

describe("sync retry policy", () => {
  it("uses a bounded batch of 25 transactions", () => {
    expect(BATCH_SIZE).toBe(25)
  })

  it("applies exponential backoff with 50-100% jitter", () => {
    expect(calculateBackoffMs(0, () => 0)).toBe(500)
    expect(calculateBackoffMs(0, () => 1)).toBe(1_000)
    expect(calculateBackoffMs(3, () => 0)).toBe(4_000)
    expect(calculateBackoffMs(3, () => 1)).toBe(8_000)
  })

  it("caps retry delay at five minutes", () => {
    expect(calculateBackoffMs(30, () => 1)).toBe(5 * 60_000)
  })
})
