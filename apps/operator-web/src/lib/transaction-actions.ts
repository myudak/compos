import { db } from "@/lib/db"

export async function voidProvisionalTransaction(transactionId: string) {
  return db.transaction("rw", [db.transactions, db.products, db.outbox], async () => {
    const transaction = await db.transactions.get(transactionId)
    if (!transaction) throw new Error("Transaksi tidak ditemukan")
    if (transaction.settlementStatus === "SETTLED") throw new Error("Transaksi settled bersifat immutable")
    if (transaction.transactionStatus === "VOIDED") return transaction

    for (const item of transaction.items) {
      const product = await db.products.get(item.productId)
      if (product) await db.products.update(item.productId, { stock: product.stock + item.quantity })
    }
    await db.transactions.update(transactionId, { transactionStatus: "VOIDED", syncStatus: "LOCAL_ONLY", lastSyncError: undefined })
    const entry = await db.outbox.where("transactionId").equals(transactionId).first()
    if (entry) await db.outbox.update(entry.id, { status: "PENDING", nextRetryAt: undefined, lastError: undefined })
    return { ...transaction, transactionStatus: "VOIDED" as const }
  })
}
