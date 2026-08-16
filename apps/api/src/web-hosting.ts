import { access } from "node:fs/promises"
import { resolve } from "node:path"

import fastifyStatic from "@fastify/static"
import type { FastifyInstance, FastifyRequest } from "fastify"

type WebHostingOptions = {
  enabled: boolean
  root: string
}

const RESERVED_PATH_PREFIXES = ["/v1", "/health", "/metrics"]

export async function registerWebHosting(app: FastifyInstance, options: WebHostingOptions) {
  if (!options.enabled) return

  const root = resolve(options.root)
  await assertWebBuildExists(root)
  await app.register(fastifyStatic, {
    root,
    wildcard: false,
  })

  app.setNotFoundHandler((request, reply) => {
    if (!isBrowserNavigation(request)) {
      return reply.code(404).send({
        code: "NOT_FOUND",
        message: "Route not found",
        requestId: request.id,
      })
    }
    return reply.type("text/html; charset=utf-8").sendFile("index.html")
  })
}

async function assertWebBuildExists(root: string) {
  try {
    await access(resolve(root, "index.html"))
  } catch {
    throw new Error(`SERVE_WEB is enabled but no web build was found at '${root}'`)
  }
}

function isBrowserNavigation(request: FastifyRequest) {
  if (request.method !== "GET" && request.method !== "HEAD") return false

  const pathname = new URL(request.raw.url ?? "/", "http://compos.local").pathname
  if (RESERVED_PATH_PREFIXES.some((prefix) => isPathWithin(pathname, prefix))) return false

  return request.headers.accept?.includes("text/html") ?? false
}

function isPathWithin(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}
