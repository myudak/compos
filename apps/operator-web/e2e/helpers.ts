import { expect, type APIRequestContext, type Page } from "@playwright/test"
import { randomUUID } from "node:crypto"

export const credentials = {
  owner: { email: "owner@kedai-nusa.test", password: "owner123" },
  entry: { email: "entry@kedai-nusa.test", password: "entry123" },
  operator: { email: "operator@kedai-nusa.test", password: "operator123" },
}

export async function apiLogin(
  request: APIRequestContext,
  role: keyof typeof credentials,
  deviceId?: string,
) {
  const response = await request.post("/api/v1/auth/login", {
    data: { ...credentials[role], ...(deviceId ? { device_id: deviceId } : {}) },
  })
  expect(response.ok(), await response.text()).toBe(true)
  return (await response.json()).data as {
    access_token: string
    user: { id_user: string; id_merchant: string; role: string }
  }
}

export async function loginOperatorUi(page: Page, deviceId = "KPOS-DEMO-DEVICE") {
  await page.goto("/")
  await page.getByLabel("Email Operator").fill(credentials.operator.email)
  await page.getByLabel("Password").fill(credentials.operator.password)
  await page.getByLabel("Device ID counter").fill(deviceId)
  await page.getByRole("button", { name: "Masuk" }).click()
  await expect(page.getByText("Rani Operator").first()).toBeVisible()
  const controlled = await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) return true
    await navigator.serviceWorker.ready
    return Boolean(navigator.serviceWorker.controller)
  })
  if (!controlled) {
    await page.reload()
    await expect(page.getByText("Rani Operator").first()).toBeVisible()
  }
}

export async function loginOwnerUi(page: Page) {
  await page.goto("/owner/")
  await page.getByLabel("Email").fill(credentials.owner.email)
  await page.getByLabel("Password").fill(credentials.owner.password)
  await page.getByRole("button", { name: "Masuk" }).click()
  await expect(page.getByRole("heading", { name: "Business pulse" })).toBeVisible()
}

export async function checkout(page: Page, productName = "Kopi Susu Aren") {
  await page.getByRole("button", { name: new RegExp(productName) }).click()
  await page.getByRole("button", { name: /Pilih pembayaran/ }).click()
  await page.getByRole("button", { name: "Uang pas" }).click()
  await page.getByRole("button", { name: "Konfirmasi penjualan" }).click()
}

export async function localState(page: Page) {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const open = indexedDB.open("operator-pos-v3")
      open.onsuccess = () => resolve(open.result)
      open.onerror = () => reject(open.error)
    })
    const tx = database.transaction(["transactions", "outbox", "settings"], "readonly")
    const readAll = (store: string) =>
      new Promise<unknown[]>((resolve, reject) => {
        const query = tx.objectStore(store).getAll()
        query.onsuccess = () => resolve(query.result)
        query.onerror = () => reject(query.error)
      })
    const readSession = new Promise<{ value: string }>((resolve, reject) => {
      const query = tx.objectStore("settings").get("authSession")
      query.onsuccess = () => resolve(query.result as { value: string })
      query.onerror = () => reject(query.error)
    })
    const [sales, outbox, session] = await Promise.all([
      readAll("transactions"),
      readAll("outbox"),
      readSession,
    ])
    database.close()
    return {
      sales: sales as Array<{ id: string; syncStatus: string }>,
      outbox,
      session: JSON.parse(session.value) as { token: string },
    }
  })
}

export async function createProduct(
  request: APIRequestContext,
  token: string,
  options: { name?: string; price?: number; stock?: number } = {},
) {
  const suffix = randomUUID().slice(0, 8).toUpperCase()
  const response = await request.post("/api/v1/products", {
    headers: { authorization: `Bearer ${token}` },
    multipart: {
      name: options.name ?? `E2E Product ${suffix}`,
      sku: `E2E-${suffix}`,
      price: String(options.price ?? 19_321),
    },
  })
  expect(response.ok(), await response.text()).toBe(true)
  const product = (await response.json()).data as {
    id_product: string
    name: string
    sku: string
    price: number
    catalog_version: number
  }
  if (options.stock) {
    const adjustment = await request.post(
      `/api/v1/products/${product.id_product}/stock-adjustments`,
      {
        headers: { authorization: `Bearer ${token}` },
        data: { quantity: options.stock, notes: "E2E stock preparation" },
      },
    )
    expect(adjustment.ok(), await adjustment.text()).toBe(true)
  }
  return product
}

export function salePayload(
  product: {
    id_product: string
    name: string
    sku: string
    price: number
    catalog_version: number
  },
  quantity = 1,
) {
  const total = product.price * quantity
  return {
    offline_uuid: randomUUID(),
    created_at_local: new Date().toISOString(),
    subtotal: total,
    total,
    items: [
      {
        id_product: product.id_product,
        product_name: product.name,
        product_sku: product.sku,
        catalog_version: product.catalog_version,
        quantity,
        unit_price: product.price,
        subtotal: total,
      },
    ],
    payment: { method: "STATIC_QRIS", amount: total, qris_code: `qris-${randomUUID()}` },
  }
}

export async function enqueueSale(
  request: APIRequestContext,
  token: string,
  deviceId: string,
  sale: ReturnType<typeof salePayload>,
) {
  const response = await request.post("/api/v1/sync", {
    headers: { authorization: `Bearer ${token}`, "X-Device-ID": deviceId },
    data: { transactions: [sale] },
  })
  expect(response.ok(), await response.text()).toBe(true)
  return sale.offline_uuid
}

export async function waitReceipt(
  request: APIRequestContext,
  token: string,
  offlineUuid: string,
  status: "SYNCED" | "CONFLICT" = "SYNCED",
) {
  let receipt: { id_receipt: string; id_transaction: string; status: string } | undefined
  await expect
    .poll(async () => {
      const response = await request.get(
        `/api/v1/sync/receipts?offline_uuid=${encodeURIComponent(offlineUuid)}`,
        { headers: { authorization: `Bearer ${token}` } },
      )
      receipt = (await response.json()).data.items[0]
      return receipt?.status
    })
    .toBe(status)
  return receipt!
}
