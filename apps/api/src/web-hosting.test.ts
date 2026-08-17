import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import Fastify from "fastify"
import { afterEach, describe, expect, it } from "vitest"

import { registerWebHosting } from "./web-hosting.js"

const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })),
  )
})

describe("registerWebHosting", () => {
  it("serves built assets and falls back to the SPA for browser routes", async () => {
    const root = await createWebBuild()
    const app = Fastify()
    await registerWebHosting(app, { enabled: true, root })

    const asset = await app.inject({ method: "GET", url: "/app.js" })
    const navigation = await app.inject({
      method: "GET",
      url: "/transactions/tx-1",
      headers: { accept: "text/html" },
    })

    expect(asset.statusCode).toBe(200)
    expect(asset.body).toBe("console.log('COMPOS')")
    expect(navigation.statusCode).toBe(200)
    expect(navigation.headers["content-type"]).toContain("text/html")
    expect(navigation.body).toContain("COMPOS demo")

    await app.close()
  })

  it("keeps API and operational paths outside the SPA fallback", async () => {
    const root = await createWebBuild()
    const app = Fastify()
    app.get("/health", async () => ({ status: "ok" }))
    await registerWebHosting(app, { enabled: true, root })

    const health = await app.inject({ method: "GET", url: "/health" })
    const missingApi = await app.inject({
      method: "GET",
      url: "/v1/unknown",
      headers: { accept: "text/html" },
    })

    expect(health.json()).toEqual({ status: "ok" })
    expect(missingApi.statusCode).toBe(404)
    expect(missingApi.headers["content-type"]).toContain("application/json")
    expect(missingApi.json()).toMatchObject({ code: "NOT_FOUND" })

    await app.close()
  })

  it("serves Owner assets and deep links under an isolated scope", async () => {
    const root = await createWebBuild()
    const ownerRoot = await createWebBuild("COMPOS Owner", "console.log('OWNER')")
    const app = Fastify()
    await registerWebHosting(app, { enabled: true, root, ownerRoot })

    const asset = await app.inject({ method: "GET", url: "/owner/app.js" })
    const navigation = await app.inject({
      method: "GET",
      url: "/owner/insights/latest",
      headers: { accept: "text/html" },
    })

    expect(asset.body).toBe("console.log('OWNER')")
    expect(navigation.statusCode).toBe(200)
    expect(navigation.body).toContain("COMPOS Owner")
    await app.close()
  })

  it("fails startup when web hosting is enabled without a build", async () => {
    const root = await mkdtemp(join(tmpdir(), "compos-missing-web-"))
    temporaryDirectories.push(root)
    const app = Fastify()

    await expect(registerWebHosting(app, { enabled: true, root })).rejects.toThrow(
      "SERVE_WEB is enabled but no web build was found",
    )

    await app.close()
  })
})

async function createWebBuild(title = "COMPOS demo", script = "console.log('COMPOS')") {
  const root = await mkdtemp(join(tmpdir(), "compos-web-"))
  temporaryDirectories.push(root)
  await Promise.all([
    writeFile(join(root, "index.html"), `<!doctype html><title>${title}</title>`),
    writeFile(join(root, "app.js"), script),
  ])
  return root
}
