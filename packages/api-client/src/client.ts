import { z, type ZodType } from "zod"
import { apiErrorSchema } from "./schemas"

export function resolveApiUrl(configuredUrl: string | undefined, development: boolean): string {
  const normalized = configuredUrl?.trim().replace(/\/+$/, "")
  if (normalized) return normalized
  return development ? "http://localhost:3001" : ""
}

export class KposApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly retryable: boolean,
    readonly requestId?: string,
  ) {
    super(message)
  }
}

export async function requestKpos<TSchema extends ZodType>(
  apiUrl: string,
  path: string,
  schema: TSchema,
  init: RequestInit = {},
  token?: string,
): Promise<z.output<TSchema>> {
  const headers = new Headers(init.headers)
  if (init.body != null && !headers.has("content-type"))
    headers.set("content-type", "application/json")
  if (token) headers.set("authorization", `Bearer ${token}`)

  let response: Response
  try {
    response = await fetch(`${apiUrl}${path}`, { ...init, headers, credentials: "include" })
  } catch {
    throw new KposApiError("Backend tidak dapat dijangkau", 0, "NETWORK_UNREACHABLE", true)
  }

  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(body)
    if (parsed.success) {
      throw new KposApiError(
        parsed.data.message,
        response.status,
        parsed.data.error.code,
        response.status === 408 || response.status === 429 || response.status >= 500,
        parsed.data.error.request_id,
      )
    }
    throw new KposApiError(
      `Request gagal (${response.status})`,
      response.status,
      "INVALID_RESPONSE",
      false,
    )
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw new KposApiError(
      "Respons backend tidak sesuai OpenAPI",
      response.status,
      "INVALID_RESPONSE",
      false,
    )
  }
  return parsed.data
}
