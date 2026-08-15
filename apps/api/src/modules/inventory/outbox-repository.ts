import type { DatabaseClient, DatabasePool } from "../../db.js"

export type BackendOutboxEvent = {
  id: string
  merchantId: string
  aggregateId: string
  eventType: string
}

type EventRow = {
  id: string
  merchant_id: string
  aggregate_id: string
  event_type: string
}

export class BackendOutboxRepository {
  constructor(private readonly pool: DatabasePool) {}

  async claim(limit: number) {
    const result = await this.pool.query<{ id: string }>(
      `UPDATE backend_outbox_events
       SET claimed_at = now(), attempt_count = attempt_count + 1
       WHERE id IN (
         SELECT id FROM backend_outbox_events
         WHERE processed_at IS NULL
           AND (claimed_at IS NULL OR claimed_at < now() - interval '5 minutes')
         ORDER BY created_at
         LIMIT $1
         FOR UPDATE SKIP LOCKED
       )
       RETURNING id`,
      [limit],
    )
    return result.rows.map((row) => row.id)
  }

  async lock(client: DatabaseClient, eventId: string): Promise<BackendOutboxEvent | null> {
    const result = await client.query<EventRow>(
      `SELECT id, merchant_id, aggregate_id, event_type
       FROM backend_outbox_events WHERE id = $1 FOR UPDATE`,
      [eventId],
    )
    const row = result.rows[0]
    return row
      ? {
          id: row.id,
          merchantId: row.merchant_id,
          aggregateId: row.aggregate_id,
          eventType: row.event_type,
        }
      : null
  }

  async markProcessed(client: DatabaseClient, eventId: string) {
    await client.query(
      `UPDATE backend_outbox_events
       SET processed_at = now(), last_error = NULL
       WHERE id = $1`,
      [eventId],
    )
  }

  async releaseAfterFailure(eventId: string, error: unknown) {
    await this.pool.query(
      `UPDATE backend_outbox_events
       SET claimed_at = NULL, last_error = $1
       WHERE id = $2`,
      [error instanceof Error ? error.message : "Unknown worker error", eventId],
    )
  }
}
