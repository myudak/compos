import { ApiError, API_URL } from "@/infrastructure/api/http-client"
import type {
  AuthSession,
  DeviceIdentity,
  LocalTransaction,
} from "@/infrastructure/persistence/models"

export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true"

async function apiRequest<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    })
  } catch {
    throw new ApiError("Backend tidak dapat dijangkau", 0, "NETWORK_UNREACHABLE", true)
  }
  const body = (await response.json().catch(() => ({}))) as { code?: string; message?: string } & T
  if (!response.ok) {
    const retryable = response.status === 408 || response.status === 429 || response.status >= 500
    throw new ApiError(
      body.message ?? `Request gagal (${response.status})`,
      response.status,
      body.code ?? "HTTP_ERROR",
      retryable,
    )
  }
  return body
}

export async function probeBackend(signal?: AbortSignal) {
  const response = await fetch(`${API_URL}/health`, { signal, cache: "no-store" })
  if (!response.ok)
    throw new ApiError("Backend belum siap", response.status, "INVALID_RESPONSE", true)
  return response.json() as Promise<{ status: string; database: string }>
}

export type SyncApiResult = {
  transactionId: string
  status: "ACCEPTED" | "ALREADY_PROCESSED" | "REJECTED_PERMANENT" | "RETRYABLE_ERROR"
  settlementStatus?: "SETTLED"
  receivedAtBackend?: string
  reason?: string
}

function transactionPayload(transaction: LocalTransaction) {
  return {
    transactionId: transaction.id,
    invoiceNumber: transaction.invoiceNumber,
    operatorId: transaction.operatorId,
    transactionStatus: transaction.transactionStatus,
    paymentMethod: transaction.paymentMethod,
    paymentVerificationType: transaction.paymentVerificationType,
    paymentReference: transaction.paymentReference,
    subtotal: transaction.subtotal,
    discount: transaction.discount,
    tax: 0,
    total: transaction.total,
    createdAtDevice: transaction.createdAt,
    items: transaction.items.map((item) => ({
      productId: item.productId,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
    })),
  }
}

export async function sendTransactionBatch(
  session: AuthSession,
  device: DeviceIdentity,
  batchId: string,
  transactions: LocalTransaction[],
) {
  if (DEMO_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 350))
    return transactions.map<SyncApiResult>((transaction) => ({
      transactionId: transaction.id,
      status: transaction.receivedAtBackend ? "ALREADY_PROCESSED" : "ACCEPTED",
      settlementStatus: "SETTLED",
      receivedAtBackend: transaction.receivedAtBackend ?? new Date().toISOString(),
    }))
  }
  const response = await apiRequest<{ results: SyncApiResult[] }>(
    "/v1/sync/transactions",
    {
      method: "POST",
      body: JSON.stringify({
        schemaVersion: 1,
        merchantId: session.merchantId,
        deviceId: device.id,
        batchId,
        transactions: transactions.map(transactionPayload),
      }),
    },
    session.token,
  )
  return response.results
}

export type BackendTransaction = {
  id: string
  invoiceNumber: string
  transactionStatus: "CONFIRMED" | "VOIDED"
  settlementStatus: "SETTLED"
  paymentMethod: LocalTransaction["paymentMethod"]
  paymentVerificationType: LocalTransaction["paymentVerificationType"]
  total: number
  createdAtDevice: string
  receivedAtBackend: string
  operatorName: string
  correctionTotal: number
}

export type CorrectionRecord = {
  id: string
  transactionId: string
  reason: string
  adjustmentAmount: number
  evidenceReference?: string | null
  createdAt: string
  adminName: string
  invoiceNumber: string
}

export type InventoryDiscrepancy = {
  id: string
  productId: string
  productName: string
  detectedAt: string
  projectedStock: number
  status: "OPEN" | "RESOLVED"
  resolution?: string
  resolvedAt?: string | null
}

export async function fetchBackendTransactions(session: AuthSession, paymentRiskOnly = false) {
  return apiRequest<{ transactions: BackendTransaction[] }>(
    `/v1/transactions?limit=100&paymentRiskOnly=${paymentRiskOnly}`,
    {},
    session.token,
  )
}

export async function createCorrection(
  session: AuthSession,
  transactionId: string,
  input: { reason: string; adjustmentAmount: number; evidenceReference?: string },
) {
  return apiRequest<{ correctionId: string; status: string }>(
    `/v1/admin/transactions/${encodeURIComponent(transactionId)}/corrections`,
    { method: "POST", body: JSON.stringify(input) },
    session.token,
  )
}

export async function fetchCorrections(session: AuthSession) {
  return apiRequest<{ corrections: CorrectionRecord[] }>("/v1/admin/corrections", {}, session.token)
}

export async function fetchInventoryDiscrepancies(session: AuthSession) {
  return apiRequest<{ discrepancies: InventoryDiscrepancy[] }>(
    "/v1/inventory/discrepancies",
    {},
    session.token,
  )
}

export async function resolveInventoryDiscrepancy(
  session: AuthSession,
  id: string,
  input: { resolution: string; adjustedStock?: number },
) {
  return apiRequest<{ id: string; status: string }>(
    `/v1/inventory/discrepancies/${encodeURIComponent(id)}/resolve`,
    { method: "POST", body: JSON.stringify(input) },
    session.token,
  )
}

export { ApiError, API_URL }
