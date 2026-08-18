import { describe, expect, it } from "vitest"
import { resolveApiUrl } from "./client"

describe("resolveApiUrl", () => {
  it("uses localhost for split development", () => {
    expect(resolveApiUrl(undefined, true)).toBe("http://localhost:3001")
  })

  it("uses same origin in hosted builds", () => {
    expect(resolveApiUrl(undefined, false)).toBe("")
  })

  it("normalizes an explicit URL", () => {
    expect(resolveApiUrl(" https://api.example.test/// ", false)).toBe("https://api.example.test")
  })
})
