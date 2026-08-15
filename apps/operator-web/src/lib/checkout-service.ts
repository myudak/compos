import { db } from "@/lib/db"
import type { LocalTransaction } from "@/lib/types"

/**
 * Commits the sale, its sync intent, stock projection, and draft removal in one
 * IndexedDB transaction. Network availability is deliberately irrelevant here.
 */
export async function commitLocalSale(transaction: LocalTransaction) {
  await db.transaction("rw", [db.transactions, db.outbox, db.products, db.drafts], async () => {
    for (const item of transaction.items) {
      const product = await db.products.get(item.productId)
      if (!product) throw new Error(`Produk ${item.productId} tidak tersedia di katalog lokal`)
      if (product.stock < item.quantity) throw new Error(`Stok ${product.name} tidak mencukupi`)
    }

    await db.transactions.add(transaction)
    await db.outbox.add({
      id: `outbox-${transaction.id}`,
      transactionId: transaction.id,
      operation: "UPSERT_TRANSACTION",
      payloadVersion: 1,
      status: "PENDING",
      retryCount: 0,
      createdAt: transaction.createdAt,
    })
    for (const item of transaction.items) {
      const product = await db.products.get(item.productId)
      await db.products.update(item.productId, { stock: product!.stock - item.quantity })
    }
    await db.drafts.delete("active")
  })
  return transaction
}
