INSERT INTO backend_outbox_events (
  id, merchant_id, aggregate_type, aggregate_id, event_type, payload
)
SELECT
  'reporting-backfill-' || md5(t.merchant_id || ':' || t.id),
  t.merchant_id,
  'TRANSACTION',
  t.id,
  'REPORTING_TRANSACTION_SETTLED',
  jsonb_build_object('transactionId', t.id, 'backfill', true)
FROM transactions t
WHERE t.transaction_status = 'CONFIRMED'
  AND NOT EXISTS (
    SELECT 1
    FROM reporting_applied_transactions applied
    WHERE applied.merchant_id = t.merchant_id AND applied.transaction_id = t.id
  )
  AND NOT EXISTS (
    SELECT 1
    FROM backend_outbox_events event
    WHERE event.merchant_id = t.merchant_id
      AND event.aggregate_id = t.id
      AND event.event_type = 'REPORTING_TRANSACTION_SETTLED'
  )
ON CONFLICT (id) DO NOTHING;
