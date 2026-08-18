import {
  auditEventListResponseSchema,
  deviceListResponseSchema,
  deviceResponseSchema,
  loginResponseSchema,
  managedUserListResponseSchema,
  managedUserResponseSchema,
  mutationResponseSchema,
  ownerDashboardResponseSchema,
  paymentListResponseSchema,
  reconciliationListResponseSchema,
  reconciliationSchema,
  requestKpos,
  resolveApiUrl,
  successSchema,
  syncReceiptsResponseSchema,
} from "@k-pos/api-client"

const API_URL = resolveApiUrl(import.meta.env.VITE_API_URL, import.meta.env.DEV)
const SESSION_KEY = "kpos-owner-session"

export type OwnerSession = { token: string; name: string; email: string; merchantId: string }

export async function loginOwner(email: string, password: string) {
  const response = await requestKpos(API_URL, "/api/v1/auth/login", loginResponseSchema, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })
  if (response.data.user.role !== "OWNER") {
    const destination = response.data.user.role === "ENTRY" ? "Entry" : "Operator"
    throw new Error(`Akun ini bukan Owner. Lanjutkan di ${destination} app.`)
  }
  const session: OwnerSession = {
    token: response.data.access_token,
    name: response.data.user.full_name,
    email: response.data.user.email,
    merchantId: response.data.user.id_merchant,
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return session
}

export function storedSession(): OwnerSession | null {
  const raw = localStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as OwnerSession
  } catch {
    localStorage.removeItem(SESSION_KEY)
    return null
  }
}

export async function logoutOwner(session: OwnerSession) {
  try {
    await call(session, "/api/v1/auth/logout", mutationResponseSchema, { method: "POST" })
  } catch {
    // Expired token must not block local logout.
  }
  localStorage.removeItem(SESSION_KEY)
}

function call<T extends Parameters<typeof requestKpos>[2]>(
  session: OwnerSession,
  path: string,
  schema: T,
  init?: RequestInit,
) {
  return requestKpos(API_URL, path, schema, init, session.token)
}

export const ownerApi = {
  dashboard: async (session: OwnerSession) =>
    (await call(session, "/api/v1/owner/dashboard", ownerDashboardResponseSchema)).data,
  users: async (session: OwnerSession) =>
    (await call(session, "/api/v1/users", managedUserListResponseSchema)).data.items,
  createUser: async (
    session: OwnerSession,
    input: { full_name: string; email: string; password: string; role: "ENTRY" | "OPERATOR" },
  ) =>
    (
      await call(session, "/api/v1/users", managedUserResponseSchema, {
        method: "POST",
        body: JSON.stringify(input),
      })
    ).data,
  setUserActive: async (session: OwnerSession, id: string, is_active: boolean) =>
    (
      await call(session, `/api/v1/users/${id}/status`, managedUserResponseSchema, {
        method: "PATCH",
        body: JSON.stringify({ is_active }),
      })
    ).data,
  changePassword: (session: OwnerSession, id: string, new_password: string) =>
    call(session, `/api/v1/users/${id}/change-password`, mutationResponseSchema, {
      method: "POST",
      body: JSON.stringify({ new_password }),
    }),
  devices: async (session: OwnerSession) =>
    (await call(session, "/api/v1/devices", deviceListResponseSchema)).data,
  createDevice: async (session: OwnerSession, name: string) =>
    (
      await call(session, "/api/v1/devices", deviceResponseSchema, {
        method: "POST",
        body: JSON.stringify({ name }),
      })
    ).data,
  revokeDevice: (session: OwnerSession, id: string) =>
    call(session, `/api/v1/devices/${id}`, deviceResponseSchema, { method: "DELETE" }),
  payments: async (session: OwnerSession) =>
    (await call(session, "/api/v1/payments", paymentListResponseSchema)).data.items,
  openReconciliation: async (
    session: OwnerSession,
    paymentId: string,
    reason: string,
    evidence_note?: string,
  ) =>
    (
      await call(
        session,
        `/api/v1/payments/${paymentId}/reconciliations`,
        successSchema(reconciliationSchema),
        { method: "POST", body: JSON.stringify({ reason, evidence_note }) },
      )
    ).data,
  reconciliations: async (session: OwnerSession) =>
    (await call(session, "/api/v1/payment-reconciliations", reconciliationListResponseSchema)).data
      .items,
  resolveReconciliation: async (
    session: OwnerSession,
    id: string,
    input: {
      action: "VALID" | "INVALID"
      resolution_note: string
      inventory_returned?: boolean
    },
  ) =>
    (
      await call(
        session,
        `/api/v1/payment-reconciliations/${id}/resolve`,
        successSchema(reconciliationSchema),
        { method: "POST", body: JSON.stringify(input) },
      )
    ).data,
  failures: async (session: OwnerSession) =>
    (await call(session, "/api/v1/sync/failures", syncReceiptsResponseSchema)).data.items,
  retryReceipt: (session: OwnerSession, id: string) =>
    call(session, `/api/v1/sync/receipts/${id}/retry`, mutationResponseSchema, {
      method: "POST",
    }),
  resolveConflict: (session: OwnerSession, transactionId: string, action: "CONFIRM" | "VOID") =>
    call(
      session,
      `/api/v1/transactions/${transactionId}/conflict-resolution`,
      mutationResponseSchema,
      {
        method: "POST",
        body: JSON.stringify({
          action,
          notes:
            action === "CONFIRM"
              ? "Owner confirms goods were delivered despite stock shortage"
              : "Owner confirms goods were not delivered",
        }),
      },
    ),
  audit: async (session: OwnerSession) =>
    (await call(session, "/api/v1/audit-events", auditEventListResponseSchema)).data.items,
}
