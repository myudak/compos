import { db } from "@/lib/db"

let activeSync: Promise<number> | null = null

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function processOutbox({ includeFailed = false }: { includeFailed?: boolean } = {}) {
  if (activeSync) return activeSync

  activeSync = (async () => {
    const entries = await db.outbox.orderBy("createdAt").toArray()
    const candidates = entries.filter((entry) => entry.status === "PENDING" || includeFailed)
    let synced = 0

    for (const entry of candidates) {
      const transaction = await db.transactions.get(entry.transactionId)
      if (!transaction) {
        await db.outbox.delete(entry.id)
        continue
      }

      const startedAt = performance.now()
      await db.transactions.update(transaction.id, { syncStatus: "SYNCING", lastSyncError: undefined })
      await db.outbox.update(entry.id, { lastAttemptAt: new Date().toISOString(), retryCount: entry.retryCount + 1 })
      await delay(420)

      // A stable client transaction ID makes this retry safe: ACCEPTED and
      // ALREADY_PROCESSED are equivalent terminal outcomes for the client.
      const result = transaction.receivedAtBackend ? "ALREADY_PROCESSED" : "ACCEPTED"
      const receivedAtBackend = transaction.receivedAtBackend ?? new Date().toISOString()

      await db.transaction("rw", [db.transactions, db.outbox, db.syncAttempts, db.settings], async () => {
        await db.transactions.update(transaction.id, {
          syncStatus: "SYNCED",
          settlementStatus: "SETTLED",
          receivedAtBackend,
          retryCount: entry.retryCount + 1,
          lastSyncError: undefined,
        })
        await db.outbox.delete(entry.id)
        await db.syncAttempts.add({
          transactionId: transaction.id,
          invoiceNumber: transaction.invoiceNumber,
          result,
          createdAt: new Date().toISOString(),
          durationMs: Math.round(performance.now() - startedAt),
        })
        await db.settings.put({ key: "lastSyncAt", value: new Date().toISOString() })
      })
      synced += 1
    }

    return synced
  })().finally(() => {
    activeSync = null
  })

  return activeSync
}

export async function retryTransaction(transactionId: string) {
  const entry = await db.outbox.where("transactionId").equals(transactionId).first()
  if (entry) await db.outbox.update(entry.id, { status: "PENDING", lastError: undefined })
  return processOutbox({ includeFailed: true })
}
