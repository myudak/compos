import {
  healthResponseSchema,
  syncAcceptedResponseSchema,
  syncReceiptsResponseSchema,
} from "@k-pos/api-client"

import { KposApiError as ApiError } from "@k-pos/api-client"
import { API_URL, requestApi } from "@/infrastructure/api/kpos-client"
import type {
  AuthSession,
  DeviceIdentity,
  LocalTransaction,
} from "@/infrastructure/persistence/models"

export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true"

export type SyncResult = {
  transactionId: string
  status: "SYNCED" | "CONFLICT" | "FAILED"
  reason?: string
  receivedAtBackend?: string
}

export function probeBackend(signal?: AbortSignal) {
  return requestApi("/health", healthResponseSchema, { signal, cache: "no-store" })
}

function transactionPayload(transaction: LocalTransaction) {
  return {
    offline_uuid: transaction.id,
    created_at_local: transaction.createdAt,
    total: transaction.total,
    subtotal: transaction.subtotal,
    notes: transaction.invoiceNumber,
    items: transaction.items.map((item) => ({
      id_product: item.productId,
      product_name: item.name,
      product_sku: item.sku,
      catalog_version: item.catalogVersion,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      subtotal: item.subtotal,
    })),
    payment: {
      method: transaction.paymentMethod,
      amount: transaction.total,
      ...(transaction.paymentMethod === "CASH"
        ? { cash_received: transaction.amountReceived, change_amount: transaction.change }
        : transaction.paymentMethod === "STATIC_QRIS"
          ? { qris_code: transaction.paymentReference }
          : { transfer_ref: transaction.paymentReference }),
    },
  }
}

export async function sendTransactionBatch(
  session: AuthSession,
  device: DeviceIdentity,
  _batchId: string,
  transactions: LocalTransaction[],
): Promise<SyncResult[]> {
  if (DEMO_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 350))
    return transactions.map<SyncResult>((transaction) => ({
      transactionId: transaction.id,
      status: "SYNCED",
      receivedAtBackend: transaction.receivedAtBackend ?? new Date().toISOString(),
    }))
  }
  await requestApi(
    "/api/v1/sync",
    syncAcceptedResponseSchema,
    {
      method: "POST",
      headers: { "X-Device-ID": device.id },
      body: JSON.stringify({ transactions: transactions.map(transactionPayload) }),
    },
    session.token,
  )
  return pollReceipts(session, transactions)
}

async function pollReceipts(
  session: AuthSession,
  transactions: LocalTransaction[],
): Promise<SyncResult[]> {
  const pending = new Set(transactions.map((transaction) => transaction.id))
  const results = new Map<string, SyncResult>()
  const deadline = Date.now() + 30_000
  while (pending.size > 0 && Date.now() < deadline) {
    const query = [...pending].map((id) => `offline_uuid=${encodeURIComponent(id)}`).join("&")
    const response = await requestApi(
      `/api/v1/sync/receipts?${query}`,
      syncReceiptsResponseSchema,
      { cache: "no-store" },
      session.token,
    )
    for (const receipt of response.data.items) {
      if (!["SYNCED", "CONFLICT", "FAILED"].includes(receipt.status)) continue
      pending.delete(receipt.offline_uuid)
      results.set(receipt.offline_uuid, {
        transactionId: receipt.offline_uuid,
        status: receipt.status as SyncResult["status"],
        reason: receipt.last_error_message ?? undefined,
        receivedAtBackend: receipt.terminal_at ?? undefined,
      })
    }
    if (pending.size > 0) await new Promise((resolve) => window.setTimeout(resolve, 350))
  }
  if (pending.size > 0)
    throw new ApiError("Settlement masih diproses", 503, "RECEIPT_TIMEOUT", true)
  return transactions.map((transaction) => results.get(transaction.id)!)
}

export { ApiError, API_URL }
