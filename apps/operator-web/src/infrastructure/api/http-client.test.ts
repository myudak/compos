import { afterEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

import { requestJson } from "./http-client"

const responseSchema = z.object({ ok: z.literal(true) })

describe("requestJson", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("does not label a bodyless POST as JSON", async () => {
    const fetchMock = successfulFetch()
    vi.stubGlobal("fetch", fetchMock)

    await requestJson("/logout", responseSchema, { method: "POST" }, "token")

    expect(requestHeaders(fetchMock)).toEqual({ authorization: "Bearer token" })
  })

  it("labels serialized request bodies as JSON", async () => {
    const fetchMock = successfulFetch()
    vi.stubGlobal("fetch", fetchMock)

    await requestJson("/login", responseSchema, {
      method: "POST",
      body: JSON.stringify({ pin: "1234" }),
    })

    expect(requestHeaders(fetchMock)).toEqual({ "content-type": "application/json" })
  })
})

function successfulFetch() {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  )
}

function requestHeaders(fetchMock: ReturnType<typeof successfulFetch>) {
  const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined
  return init?.headers
}
