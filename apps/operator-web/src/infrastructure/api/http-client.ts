import { apiErrorResponseSchema } from "@operator/contracts"
import { z, type ZodType } from "zod"

export const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ??
  "http://localhost:3001"

export class ApiError extends Error {
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

export async function requestJson<TSchema extends ZodType>(
  path: string,
  responseSchema: TSchema,
  init: RequestInit = {},
  token?: string,
): Promise<z.output<TSchema>> {
  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        ...(init.body === undefined || init.body === null
          ? {}
          : { "content-type": "application/json" }),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    })
  } catch {
    throw new ApiError("Backend tidak dapat dijangkau", 0, "NETWORK_UNREACHABLE", true)
  }

  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const parsedError = apiErrorResponseSchema.safeParse(body)
    const retryable = response.status === 408 || response.status === 429 || response.status >= 500
    if (parsedError.success) {
      throw new ApiError(
        parsedError.data.message,
        response.status,
        parsedError.data.code,
        retryable,
        parsedError.data.requestId,
      )
    }
    throw new ApiError(
      `Request gagal (${response.status})`,
      response.status,
      "INVALID_RESPONSE",
      retryable,
    )
  }

  const parsed = responseSchema.safeParse(body)
  if (!parsed.success) {
    throw new ApiError(
      "Respons backend tidak sesuai kontrak",
      response.status,
      "INVALID_RESPONSE",
      false,
    )
  }
  return parsed.data
}
