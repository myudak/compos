import { requestKpos, resolveApiUrl } from "@k-pos/api-client"
import type { ZodType } from "zod"

export const API_URL = resolveApiUrl(
  import.meta.env.VITE_API_URL as string | undefined,
  import.meta.env.DEV,
)

export function requestApi<TSchema extends ZodType>(
  path: string,
  schema: TSchema,
  init: RequestInit = {},
  token?: string,
) {
  return requestKpos(API_URL, path, schema, init, token)
}
