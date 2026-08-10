import { db, saveAuthSession } from "@/lib/db"
import type { AuthSession, DeviceIdentity, LocalTransaction, Product } from "@/lib/types"

const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "http://localhost:3001"
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true"

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly retryable: boolean,
  ) {
    super(message)
  }
}

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
  const body = await response.json().catch(() => ({})) as { code?: string; message?: string } & T
  if (!response.ok) {
    const retryable = response.status === 408 || response.status === 429 || response.status >= 500
    throw new ApiError(body.message ?? `Request gagal (${response.status})`, response.status, body.code ?? "HTTP_ERROR", retryable)
  }
  return body
}

export async function probeBackend(signal?: AbortSignal) {
  const response = await fetch(`${API_URL}/health`, { signal, cache: "no-store" })
  if (!response.ok) throw new ApiError("Backend belum siap", response.status, "BACKEND_UNHEALTHY", true)
  return response.json() as Promise<{ status: string; database: string }>
}

export async function activateAndLogin(input: {
  merchantCode: string
  operatorCode: string
  pin: string
  activationCode: string
  device: DeviceIdentity
}): Promise<AuthSession> {
  await apiRequest("/v1/devices/register", {
    method: "POST",
    body: JSON.stringify({ merchantCode: input.merchantCode, activationCode: input.activationCode, deviceId: input.device.id, deviceName: input.device.name }),
  })
  const result = await apiRequest<{
    token: string
    expiresInSeconds: number
    merchantId: string
    operator: AuthSession["operator"]
  }>("/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ merchantCode: input.merchantCode, operatorCode: input.operatorCode, pin: input.pin, deviceId: input.device.id }),
  })
  const session: AuthSession = {
    token: result.token,
    merchantId: result.merchantId,
    operator: result.operator,
    expiresAt: new Date(Date.now() + result.expiresInSeconds * 1000).toISOString(),
  }
  await saveAuthSession(session)
  await db.settings.put({ key: "deviceIdentity", value: JSON.stringify({ ...input.device, registeredAt: new Date().toISOString() }) })
  return session
}

type BootstrapProduct = {
  id: string
  sku: string
  name: string
  description: string
  category: Product["category"]
  price: number
  stock: number
  min_stock: number
  accent: string
}

export async function bootstrapLocalData(session: AuthSession, device: DeviceIdentity) {
  const result = await apiRequest<{ products: BootstrapProduct[] }>(`/v1/bootstrap?deviceId=${encodeURIComponent(device.id)}`, {}, session.token)
  const products: Product[] = result.products.map((product) => ({
    id: product.id,
    sku: product.sku,
    name: product.name,
    description: product.description,
    category: product.category,
    price: product.price,
    stock: product.stock,
    accent: product.accent,
  }))
  await db.products.bulkPut(products)
  await db.settings.put({ key: "lastBootstrapAt", value: new Date().toISOString() })
  return products
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

export async function sendTransactionBatch(session: AuthSession, device: DeviceIdentity, batchId: string, transactions: LocalTransaction[]) {
  if (DEMO_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 350))
    return transactions.map<SyncApiResult>((transaction) => ({ transactionId: transaction.id, status: transaction.receivedAtBackend ? "ALREADY_PROCESSED" : "ACCEPTED", settlementStatus: "SETTLED", receivedAtBackend: transaction.receivedAtBackend ?? new Date().toISOString() }))
  }
  const response = await apiRequest<{ results: SyncApiResult[] }>("/v1/sync/transactions", {
    method: "POST",
    body: JSON.stringify({ merchantId: session.merchantId, deviceId: device.id, batchId, transactions: transactions.map(transactionPayload) }),
  }, session.token)
  return response.results
}

export { API_URL }
