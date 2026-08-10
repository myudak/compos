import Dexie, { type EntityTable } from "dexie"
import { v7 as uuidv7 } from "uuid"

import type { AuthSession, CartDraft, DeviceIdentity, LocalTransaction, OutboxEntry, Product, Setting, SyncAttempt, TransactionItem } from "@/lib/types"

class OperatorDatabase extends Dexie {
  products!: EntityTable<Product, "id">
  transactions!: EntityTable<LocalTransaction, "id">
  outbox!: EntityTable<OutboxEntry, "id">
  syncAttempts!: EntityTable<SyncAttempt, "id">
  settings!: EntityTable<Setting, "key">
  drafts!: EntityTable<CartDraft, "id">

  constructor() {
    super("operator-pos-local")
    this.version(1).stores({
      products: "id, sku, name, category, stock",
      transactions: "id, invoiceNumber, createdAt, syncStatus, settlementStatus, paymentMethod",
      outbox: "id, transactionId, status, createdAt",
      syncAttempts: "++id, transactionId, createdAt, result",
      settings: "key",
    })
    this.version(2).stores({
      products: "id, sku, name, category, stock",
      transactions: "id, invoiceNumber, createdAt, syncStatus, settlementStatus, paymentMethod",
      outbox: "id, transactionId, status, createdAt, nextRetryAt",
      syncAttempts: "++id, transactionId, createdAt, result",
      settings: "key",
      drafts: "id, updatedAt",
    })
  }
}

export const db = new OperatorDatabase()

export const MERCHANT_ID = "MRC-KEDAI-NUSA"
export const OPERATOR_ID = "OPR-RANI-07"

export const productSeed: Product[] = [
  { id: "prd-aren", sku: "DRK-001", name: "Kopi Susu Aren", description: "Espresso, susu, gula aren", category: "Kopi", price: 22000, stock: 18, accent: "#06b6d4", featured: true },
  { id: "prd-americano", sku: "DRK-002", name: "Iced Americano", description: "Double shot, sparkling water", category: "Kopi", price: 18000, stock: 24, accent: "#0e7490" },
  { id: "prd-latte", sku: "DRK-003", name: "Caramel Latte", description: "Espresso, caramel, fresh milk", category: "Kopi", price: 26000, stock: 9, accent: "#a16207" },
  { id: "prd-matcha", sku: "DRK-004", name: "Matcha Cloud", description: "Uji matcha, oat milk, foam", category: "Non Kopi", price: 28000, stock: 7, accent: "#65a30d", featured: true },
  { id: "prd-choco", sku: "DRK-005", name: "Choco Sea Salt", description: "Dark cocoa, sea salt cream", category: "Non Kopi", price: 25000, stock: 12, accent: "#7c3f2c" },
  { id: "prd-yuzu", sku: "DRK-006", name: "Yuzu Sparkling", description: "Yuzu, tonic, citrus peel", category: "Non Kopi", price: 24000, stock: 14, accent: "#ca8a04" },
  { id: "prd-matah", sku: "FOD-001", name: "Nasi Ayam Matah", description: "Ayam panggang, sambal matah", category: "Makanan", price: 35000, stock: 6, accent: "#ea580c", featured: true },
  { id: "prd-croffle", sku: "FOD-002", name: "Aren Croffle", description: "Croffle, gula aren, sea salt", category: "Makanan", price: 24000, stock: 11, accent: "#d97706" },
  { id: "prd-fries", sku: "FOD-003", name: "Truffle Fries", description: "Kentang, truffle oil, parmesan", category: "Makanan", price: 27000, stock: 5, accent: "#f59e0b" },
  { id: "prd-sandwich", sku: "FOD-004", name: "Tuna Melt", description: "Tuna, cheddar, sourdough", category: "Makanan", price: 32000, stock: 4, accent: "#ef4444" },
  { id: "prd-banana", sku: "FOD-005", name: "Banana Bread", description: "Pisang, walnut, cinnamon", category: "Makanan", price: 18000, stock: 8, accent: "#b45309" },
  { id: "prd-water", sku: "DRK-007", name: "Mineral Water", description: "Air mineral 600 ml", category: "Non Kopi", price: 10000, stock: 31, accent: "#0284c7" },
]

function seedItems(productIds: string[], quantities?: number[]): TransactionItem[] {
  return productIds.map((productId, index) => {
    const product = productSeed.find((item) => item.id === productId)!
    const quantity = quantities?.[index] ?? 1
    return { productId, name: product.name, quantity, unitPrice: product.price, subtotal: product.price * quantity }
  })
}

function demoTransaction({ id, deviceId, minutesAgo, productIds, quantities, paymentMethod, syncStatus, settlementStatus, retryCount = 0, error }: {
  id: string
  deviceId: string
  minutesAgo: number
  productIds: string[]
  quantities?: number[]
  paymentMethod: LocalTransaction["paymentMethod"]
  syncStatus: LocalTransaction["syncStatus"]
  settlementStatus: LocalTransaction["settlementStatus"]
  retryCount?: number
  error?: string
}): LocalTransaction {
  const items = seedItems(productIds, quantities)
  const total = items.reduce((sum, item) => sum + item.subtotal, 0)
  const createdAt = new Date(Date.now() - minutesAgo * 60_000).toISOString()
  return {
    id,
    invoiceNumber: `OPS-${id.slice(-4).toUpperCase()}`,
    merchantId: MERCHANT_ID,
    deviceId,
    operatorId: OPERATOR_ID,
    operatorName: "Rani",
    items,
    subtotal: total,
    discount: 0,
    total,
    paymentMethod,
    paymentVerificationType: paymentMethod === "CASH" ? "SYSTEM_VERIFIABLE" : "OPERATOR_ASSERTED",
    transactionStatus: "CONFIRMED",
    syncStatus,
    settlementStatus,
    createdAt,
    receivedAtBackend: settlementStatus === "SETTLED" ? new Date(new Date(createdAt).getTime() + 3400).toISOString() : undefined,
    retryCount,
    lastSyncError: error,
  }
}

export async function getOrCreateDeviceIdentity(): Promise<DeviceIdentity> {
  const stored = await db.settings.get("deviceIdentity")
  if (stored) return JSON.parse(stored.value) as DeviceIdentity
  const identity: DeviceIdentity = {
    id: `DVC-${uuidv7()}`,
    name: `Counter ${Math.floor(10 + Math.random() * 89)}`,
    createdAt: new Date().toISOString(),
  }
  await db.settings.put({ key: "deviceIdentity", value: JSON.stringify(identity) })
  return identity
}

export async function getAuthSession(): Promise<AuthSession | null> {
  const stored = await db.settings.get("authSession")
  return stored ? JSON.parse(stored.value) as AuthSession : null
}

export async function saveAuthSession(session: AuthSession) {
  await db.settings.put({ key: "authSession", value: JSON.stringify(session) })
}

export async function clearAuthSession() {
  await db.settings.delete("authSession")
}

export async function initializeDatabase() {
  const device = await getOrCreateDeviceIdentity()
  await db.transaction("rw", [db.products, db.transactions, db.outbox, db.settings], async () => {
    if ((await db.products.count()) === 0) await db.products.bulkAdd(productSeed)
    if ((await db.transactions.count()) === 0) {
      const transactions = [
        demoTransaction({ id: "tx-demo-a8f2", deviceId: device.id, minutesAgo: 12, productIds: ["prd-aren", "prd-croffle"], quantities: [2, 1], paymentMethod: "STATIC_QRIS", syncStatus: "SYNCED", settlementStatus: "SETTLED" }),
        demoTransaction({ id: "tx-demo-20c9", deviceId: device.id, minutesAgo: 37, productIds: ["prd-matah", "prd-yuzu"], paymentMethod: "CASH", syncStatus: "SYNCED", settlementStatus: "SETTLED" }),
        demoTransaction({ id: "tx-demo-f413", deviceId: device.id, minutesAgo: 64, productIds: ["prd-matcha", "prd-banana"], quantities: [2, 1], paymentMethod: "TRANSFER", syncStatus: "SYNCED", settlementStatus: "SETTLED" }),
        demoTransaction({ id: "tx-demo-b7d1", deviceId: device.id, minutesAgo: 102, productIds: ["prd-americano", "prd-fries"], paymentMethod: "CASH", syncStatus: "FAILED", settlementStatus: "PROVISIONAL", retryCount: 2, error: "Koneksi terputus saat mengirim batch" }),
      ]
      await db.transactions.bulkAdd(transactions)
      await db.outbox.add({ id: "outbox-demo-b7d1", transactionId: "tx-demo-b7d1", operation: "UPSERT_TRANSACTION", payloadVersion: 1, status: "FAILED", retryCount: 2, createdAt: transactions[3].createdAt, lastError: "Koneksi terputus saat mengirim batch" })
    }
    if ((await db.settings.count()) === 0) {
      await db.settings.bulkAdd([
        { key: "lastSyncAt", value: new Date(Date.now() - 7 * 60_000).toISOString() },
      ])
    }
  })
  return device
}
