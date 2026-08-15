import { v7 as uuidv7 } from "uuid"

import { draftPersistence } from "@/infrastructure/persistence/draft-repository"
import { getOrCreateDeviceIdentity } from "@/infrastructure/persistence/device-repository"
import type { LocalTransaction, PaymentMethod, Product } from "@/infrastructure/persistence/models"
import {
  getAuthSession,
  isOfflineCheckoutAllowed,
} from "@/infrastructure/persistence/session-repository"
import { commitLocalSale } from "@/infrastructure/persistence/transaction-repository"

import { verificationTypeFor } from "./payment-rules"

type CartLine = { product: Product; quantity: number }

export type ConfirmSaleInput = {
  items: CartLine[]
  paymentMethod: PaymentMethod
  amountReceived?: number
  paymentReference?: string
}

export async function confirmSale(input: ConfirmSaleInput): Promise<LocalTransaction> {
  const [session, device] = await Promise.all([getAuthSession(), getOrCreateDeviceIdentity()])
  if (!session) throw new Error("Session operator tidak tersedia")
  if (!isOfflineCheckoutAllowed(session)) {
    throw new Error("Lease checkout offline sudah berakhir. Hubungkan internet dan login kembali.")
  }
  if (input.items.length === 0) throw new Error("Keranjang masih kosong")

  const subtotal = input.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const createdAt = new Date().toISOString()
  const transaction: LocalTransaction = {
    id: uuidv7(),
    invoiceNumber: `OPS-${Date.now().toString(36).slice(-6).toUpperCase()}`,
    merchantId: session.merchantId,
    deviceId: device.id,
    operatorId: session.operator.id,
    operatorName: session.operator.name,
    items: input.items.map(({ product, quantity }) => ({
      productId: product.id,
      name: product.name,
      quantity,
      unitPrice: product.price,
      subtotal: product.price * quantity,
    })),
    subtotal,
    discount: 0,
    total: subtotal,
    paymentMethod: input.paymentMethod,
    paymentVerificationType: verificationTypeFor(input.paymentMethod),
    paymentReference: input.paymentReference,
    amountReceived: input.amountReceived,
    change: input.amountReceived === undefined ? undefined : input.amountReceived - subtotal,
    transactionStatus: "CONFIRMED",
    syncStatus: "LOCAL_ONLY",
    settlementStatus: "PROVISIONAL",
    createdAt,
    retryCount: 0,
  }

  await draftPersistence.flush()
  return commitLocalSale(transaction)
}
