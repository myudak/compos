import {
  apiErrorResponseSchema,
  insightJobResponseSchema,
  insightListResponseSchema,
  loginResponseSchema,
  ownerDashboardResponseSchema,
  registerDeviceResponseSchema,
} from "@operator/contracts"
import type { z, ZodType } from "zod"

const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ??
  (import.meta.env.DEV ? "http://localhost:3001" : "")

export type OwnerSession = {
  token: string
  merchantId: string
  ownerName: string
}

async function request<TSchema extends ZodType>(
  path: string,
  schema: TSchema,
  init: RequestInit = {},
  token?: string,
): Promise<z.output<TSchema>> {
  const headers = new Headers(init.headers)
  if (init.body) headers.set("content-type", "application/json")
  if (token) headers.set("authorization", `Bearer ${token}`)
  const response = await fetch(`${API_URL}${path}`, { ...init, headers })
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const error = apiErrorResponseSchema.safeParse(body)
    throw new Error(error.success ? error.data.message : `Request gagal (${response.status})`)
  }
  return schema.parse(body)
}

export async function loginOwner(input: {
  merchantCode: string
  operatorCode: string
  pin: string
  activationCode: string
}) {
  const deviceId = getDeviceId()
  await request("/v1/devices/register", registerDeviceResponseSchema, {
    method: "POST",
    body: JSON.stringify({
      merchantCode: input.merchantCode,
      activationCode: input.activationCode,
      deviceId,
      deviceName: "Owner Dashboard",
    }),
  })
  const result = await request("/v1/auth/login", loginResponseSchema, {
    method: "POST",
    body: JSON.stringify({
      merchantCode: input.merchantCode,
      operatorCode: input.operatorCode,
      pin: input.pin,
      deviceId,
    }),
  })
  if (result.operator.role !== "OWNER") {
    throw new Error("Akun ini untuk COMPOS Operator. Buka aplikasi kasir untuk melanjutkan.")
  }
  const session: OwnerSession = {
    token: result.token,
    merchantId: result.merchantId,
    ownerName: result.operator.name,
  }
  localStorage.setItem("compos-owner-session", JSON.stringify(session))
  return session
}

export function storedSession(): OwnerSession | null {
  const value = localStorage.getItem("compos-owner-session")
  return value ? (JSON.parse(value) as OwnerSession) : null
}

export function clearSession() {
  localStorage.removeItem("compos-owner-session")
}

export const ownerApi = {
  dashboard: (session: OwnerSession) =>
    request("/v1/owner/dashboard", ownerDashboardResponseSchema, {}, session.token),
  insights: (session: OwnerSession) =>
    request("/v1/owner/insights", insightListResponseSchema, {}, session.token),
  generate: (session: OwnerSession) =>
    request(
      "/v1/owner/insights/generate",
      insightJobResponseSchema,
      { method: "POST" },
      session.token,
    ),
  job: (session: OwnerSession, jobId: string) =>
    request(`/v1/owner/insight-jobs/${jobId}`, insightJobResponseSchema, {}, session.token),
}

function getDeviceId() {
  const existing = localStorage.getItem("compos-owner-device")
  if (existing) return existing
  const id = `owner-${crypto.randomUUID()}`
  localStorage.setItem("compos-owner-device", id)
  return id
}
