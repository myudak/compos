import { randomUUID } from "node:crypto"

const baseUrl = process.env.API_URL ?? "http://localhost:3001"
const deviceId = `DVC-SMOKE-${randomUUID()}`

async function jsonRequest<T>(path: string, init: RequestInit): Promise<T> {
  const headers = new Headers(init.headers)
  if (!headers.has("content-type")) headers.set("content-type", "application/json")
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
  })
  const body = (await response.json()) as T
  if (!response.ok) throw new Error(`${response.status} ${JSON.stringify(body)}`)
  return body
}

await jsonRequest("/v1/devices/register", {
  method: "POST",
  body: JSON.stringify({
    merchantCode: "KEDAI-NUSA",
    activationCode: "COMPOS-DEMO",
    deviceId,
    deviceName: "Smoke Test Device",
  }),
})

const login = await jsonRequest<{
  token: string
  operator: { id: string; name: string }
  merchantId: string
}>("/v1/auth/login", {
  method: "POST",
  body: JSON.stringify({ merchantCode: "KEDAI-NUSA", operatorCode: "RANI", pin: "1234", deviceId }),
})

const transactionId = `019-${randomUUID()}`
const transaction = {
  transactionId,
  invoiceNumber: `OPS-${randomUUID().slice(0, 8).toUpperCase()}`,
  operatorId: login.operator.id,
  transactionStatus: "CONFIRMED",
  paymentMethod: "CASH",
  paymentVerificationType: "SYSTEM_VERIFIABLE",
  subtotal: 22_000,
  discount: 0,
  tax: 0,
  total: 22_000,
  createdAtDevice: new Date().toISOString(),
  items: [
    {
      productId: "prd-aren",
      name: "Kopi Susu Aren",
      quantity: 1,
      unitPrice: 22_000,
      subtotal: 22_000,
    },
  ],
}

const body = JSON.stringify({
  schemaVersion: 1,
  merchantId: login.merchantId,
  deviceId,
  batchId: randomUUID(),
  transactions: [transaction],
})
const first = await jsonRequest<{ results: Array<{ status: string }> }>("/v1/sync/transactions", {
  method: "POST",
  headers: { authorization: `Bearer ${login.token}` },
  body,
})
const retry = await jsonRequest<{ results: Array<{ status: string }> }>("/v1/sync/transactions", {
  method: "POST",
  headers: { authorization: `Bearer ${login.token}` },
  body,
})

if (first.results[0]?.status !== "ACCEPTED")
  throw new Error(`Expected ACCEPTED, received ${first.results[0]?.status}`)
if (retry.results[0]?.status !== "ALREADY_PROCESSED")
  throw new Error(`Expected ALREADY_PROCESSED, received ${retry.results[0]?.status}`)

console.log(
  JSON.stringify(
    {
      deviceId,
      operator: login.operator.name,
      first: first.results[0].status,
      retry: retry.results[0].status,
    },
    null,
    2,
  ),
)
