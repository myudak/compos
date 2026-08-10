import { v7 as uuidv7 } from "uuid"

import { ApiError, probeBackend, sendTransactionBatch } from "@/lib/api-client"
import { db, getAuthSession, getOrCreateDeviceIdentity } from "@/lib/db"
import type { LocalTransaction, OutboxEntry, SyncAttempt } from "@/lib/types"
import { usePosStore } from "@/stores/pos-store"

const BATCH_SIZE = 25
const BASE_RETRY_MS = 1_000
const MAX_RETRY_MS = 5 * 60_000

let activeSync: Promise<number> | null = null
let schedulerCleanup: (() => void) | null = null

export function calculateBackoffMs(retryCount: number, random = Math.random) {
  const exponential = Math.min(MAX_RETRY_MS, BASE_RETRY_MS * 2 ** Math.max(0, retryCount))
  return Math.round(exponential * (0.5 + random() * 0.5))
}

function isDue(entry: OutboxEntry, now = Date.now()) {
  return !entry.nextRetryAt || new Date(entry.nextRetryAt).getTime() <= now
}

async function applyTransportFailure(entries: OutboxEntry[], transactions: LocalTransaction[], error: ApiError | Error) {
  const message = error instanceof ApiError ? `${error.code}: ${error.message}` : error.message
  await db.transaction("rw", [db.transactions, db.outbox], async () => {
    for (const entry of entries) {
      const transaction = transactions.find((candidate) => candidate.id === entry.transactionId)
      const retryCount = entry.retryCount + 1
      const retryable = !(error instanceof ApiError) || error.retryable
      if (transaction) await db.transactions.update(transaction.id, { syncStatus: "FAILED", retryCount, lastSyncError: message })
      await db.outbox.update(entry.id, {
        status: retryable ? "PENDING" : "FAILED",
        retryCount,
        lastAttemptAt: new Date().toISOString(),
        lastError: message,
        nextRetryAt: retryable ? new Date(Date.now() + calculateBackoffMs(retryCount)).toISOString() : undefined,
      })
    }
  })
}

export function processOutbox({ includeFailed = false }: { includeFailed?: boolean } = {}) {
  if (activeSync) return activeSync

  activeSync = (async () => {
    if (usePosStore.getState().forcedOffline || !navigator.onLine) return 0
    const [session, device] = await Promise.all([getAuthSession(), getOrCreateDeviceIdentity()])
    if (!session) return 0
    let totalSynced = 0
    let includeManualFailures = includeFailed

    for (;;) {
      const allEntries = await db.outbox.orderBy("createdAt").toArray()
      const candidates = allEntries
        .filter((entry) => isDue(entry) && (entry.status === "PENDING" || includeManualFailures))
        .slice(0, BATCH_SIZE)
      includeManualFailures = false
      if (candidates.length === 0) break

      const transactions = (await Promise.all(candidates.map((entry) => db.transactions.get(entry.transactionId)))).filter((transaction): transaction is LocalTransaction => Boolean(transaction))
      const validIds = new Set(transactions.map((transaction) => transaction.id))
      for (const missing of candidates.filter((entry) => !validIds.has(entry.transactionId))) await db.outbox.delete(missing.id)
      const entries = candidates.filter((entry) => validIds.has(entry.transactionId))
      if (transactions.length === 0) continue

      await db.transaction("rw", [db.transactions, db.outbox], async () => {
        for (const entry of entries) {
          await db.transactions.update(entry.transactionId, { syncStatus: "SYNCING", lastSyncError: undefined })
          await db.outbox.update(entry.id, { lastAttemptAt: new Date().toISOString(), lastError: undefined })
        }
      })

      const startedAt = performance.now()
      let results
      try {
        results = await sendTransactionBatch(session, device, uuidv7(), transactions)
      } catch (error) {
        await applyTransportFailure(entries, transactions, error instanceof Error ? error : new Error("Unknown sync error"))
        break
      }

      const byId = new Map(results.map((result) => [result.transactionId, result]))
      await db.transaction("rw", [db.transactions, db.outbox, db.syncAttempts, db.settings], async () => {
        for (const entry of entries) {
          const transaction = transactions.find((candidate) => candidate.id === entry.transactionId)!
          const result = byId.get(transaction.id)
          if (!result) {
            const retryCount = entry.retryCount + 1
            await db.transactions.update(transaction.id, { syncStatus: "FAILED", retryCount, lastSyncError: "MISSING_BATCH_RESULT" })
            await db.outbox.update(entry.id, { status: "PENDING", retryCount, lastError: "MISSING_BATCH_RESULT", nextRetryAt: new Date(Date.now() + calculateBackoffMs(retryCount)).toISOString() })
            continue
          }

          const attempt: Omit<SyncAttempt, "id"> = {
            transactionId: transaction.id,
            invoiceNumber: transaction.invoiceNumber,
            result: result.status,
            createdAt: new Date().toISOString(),
            durationMs: Math.round(performance.now() - startedAt),
          }
          await db.syncAttempts.add(attempt)

          if (result.status === "ACCEPTED" || result.status === "ALREADY_PROCESSED") {
            await db.transactions.update(transaction.id, {
              syncStatus: "SYNCED",
              settlementStatus: "SETTLED",
              receivedAtBackend: result.receivedAtBackend ?? new Date().toISOString(),
              retryCount: entry.retryCount + 1,
              lastSyncError: undefined,
            })
            await db.outbox.delete(entry.id)
            totalSynced += 1
          } else if (result.status === "REJECTED_PERMANENT") {
            await db.transactions.update(transaction.id, { syncStatus: "FAILED", retryCount: entry.retryCount + 1, lastSyncError: result.reason ?? "REJECTED_PERMANENT" })
            await db.outbox.update(entry.id, { status: "FAILED", retryCount: entry.retryCount + 1, lastError: result.reason ?? "REJECTED_PERMANENT", nextRetryAt: undefined })
          } else {
            const retryCount = entry.retryCount + 1
            await db.transactions.update(transaction.id, { syncStatus: "FAILED", retryCount, lastSyncError: result.reason ?? "RETRYABLE_ERROR" })
            await db.outbox.update(entry.id, { status: "PENDING", retryCount, lastError: result.reason ?? "RETRYABLE_ERROR", nextRetryAt: new Date(Date.now() + calculateBackoffMs(retryCount)).toISOString() })
          }
        }
        if (totalSynced > 0) await db.settings.put({ key: "lastSyncAt", value: new Date().toISOString() })
      })
      if (entries.length < BATCH_SIZE) break
    }
    return totalSynced
  })().finally(() => {
    activeSync = null
  })

  return activeSync
}

export async function retryTransaction(transactionId: string) {
  const entry = await db.outbox.where("transactionId").equals(transactionId).first()
  if (entry) await db.outbox.update(entry.id, { status: "PENDING", lastError: undefined, nextRetryAt: undefined })
  return processOutbox({ includeFailed: true })
}

export async function refreshConnectivity() {
  const store = usePosStore.getState()
  if (store.forcedOffline || !navigator.onLine) {
    store.setConnection("OFFLINE")
    return false
  }
  store.setConnection("RECONNECTING")
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 3_000)
  try {
    await probeBackend(controller.signal)
    store.setConnection("ONLINE")
    return true
  } catch {
    store.setConnection("OFFLINE")
    return false
  } finally {
    window.clearTimeout(timeout)
  }
}

export function startSyncScheduler() {
  schedulerCleanup?.()
  let stopped = false
  const reconnectTimers = new Set<number>()
  const syncIfReachable = async () => {
    if (stopped) return
    if (await refreshConnectivity()) await processOutbox()
  }
  const scheduleWithJitter = () => {
    const timer = window.setTimeout(() => {
      reconnectTimers.delete(timer)
      void syncIfReachable()
    }, Math.round(Math.random() * 1_500))
    reconnectTimers.add(timer)
  }
  const handleOnline = () => scheduleWithJitter()
  const handleOffline = () => usePosStore.getState().setConnection("OFFLINE")
  window.addEventListener("online", handleOnline)
  window.addEventListener("offline", handleOffline)
  const timer = window.setInterval(() => void syncIfReachable(), 15_000)
  scheduleWithJitter()
  schedulerCleanup = () => {
    stopped = true
    window.clearInterval(timer)
    reconnectTimers.forEach((reconnectTimer) => window.clearTimeout(reconnectTimer))
    reconnectTimers.clear()
    window.removeEventListener("online", handleOnline)
    window.removeEventListener("offline", handleOffline)
  }
  return schedulerCleanup
}

export { BATCH_SIZE }
