export type ProductCategory = string

export type Product = {
  id: string
  sku: string
  name: string
  description: string
  category: ProductCategory
  price: number
  stock: number
  accent: string
  featured?: boolean
  active?: boolean
  catalogVersion: number
  lowStockThreshold?: number
  updatedAt?: string
}

export type PaymentMethod = "CASH" | "STATIC_QRIS" | "BANK_TRANSFER"
export type PaymentVerificationType = "OPERATOR_VERIFIED"
export type SyncStatus = "LOCAL_ONLY" | "SYNCING" | "SYNCED" | "CONFLICT" | "FAILED"
export type SettlementStatus =
  | "PROVISIONAL"
  | "QUEUED"
  | "SETTLED"
  | "CONFLICT"
  | "FAILED"
  | "VOIDED_LOCAL"

export type TransactionItem = {
  productId: string
  sku: string
  catalogVersion: number
  name: string
  quantity: number
  unitPrice: number
  subtotal: number
}

export type LocalTransaction = {
  id: string
  invoiceNumber: string
  merchantId: string
  deviceId: string
  operatorId: string
  operatorName: string
  items: TransactionItem[]
  subtotal: number
  discount: number
  total: number
  paymentMethod: PaymentMethod
  paymentVerificationType: PaymentVerificationType
  paymentReference?: string
  amountReceived?: number
  change?: number
  transactionStatus: "CONFIRMED" | "VOIDED"
  syncStatus: SyncStatus
  settlementStatus: SettlementStatus
  createdAt: string
  receivedAtBackend?: string
  retryCount: number
  lastSyncError?: string
}

export type OutboxEntry = {
  id: string
  transactionId: string
  operation: "UPSERT_TRANSACTION"
  payloadVersion: 1
  status: "PENDING" | "SYNCING" | "FAILED"
  retryCount: number
  createdAt: string
  lastAttemptAt?: string
  lastError?: string
  nextRetryAt?: string
}

export type SyncAttempt = {
  id?: number
  transactionId: string
  invoiceNumber: string
  result: "SYNCED" | "CONFLICT" | "FAILED"
  createdAt: string
  durationMs: number
}

export type Setting = {
  key: string
  value: string
}

export type ConnectionState = "ONLINE" | "OFFLINE" | "RECONNECTING"

export type DeviceIdentity = {
  id: string
  name: string
  createdAt: string
  registeredAt?: string
}

export type AuthSession = {
  token: string
  merchantId: string
  operator: {
    id: string
    name: string
    role: "OPERATOR"
  }
  offlineLease: string
  expiresAt: string
  offlineLeaseExpiresAt: string
}

export type CartDraft = {
  id: "active"
  cart: Record<string, number>
  transactionStatus: "PENDING"
  createdAt: string
  updatedAt: string
}
