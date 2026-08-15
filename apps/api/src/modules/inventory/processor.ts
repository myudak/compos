import type { DatabasePool } from "../../db.js"
import { withTransaction } from "../../database/transaction.js"
import { handleBackendEvent } from "./event-handlers.js"
import { BackendOutboxRepository } from "./outbox-repository.js"

export async function processBackendOutbox(pool: DatabasePool, limit = 50) {
  const repository = new BackendOutboxRepository(pool)
  const claimedIds = await repository.claim(limit)
  let processed = 0
  for (const eventId of claimedIds) {
    try {
      const handled = await withTransaction(pool, async (client) => {
        const event = await repository.lock(client, eventId)
        if (!event) return false
        await handleBackendEvent(client, event)
        await repository.markProcessed(client, eventId)
        return true
      })
      if (handled) processed += 1
    } catch (error) {
      await repository.releaseAfterFailure(eventId, error)
    }
  }
  return processed
}
