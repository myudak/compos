# Sync Protocol

## Local state machine

```text
PROVISIONAL -> QUEUED -> SETTLED
                     -> CONFLICT
                     -> FAILED
```

`PROVISIONAL` means locally durable. `QUEUED` means backend receipt and publish are durable. Only
`SETTLED` means canonical transaction committed. Delivery outbox boleh dibersihkan setelah terminal,
tetapi immutable local transaction/receipt history dipertahankan.

## Enqueue

`POST /api/v1/sync` accepts at most 100 items; Operator chunks at most 25 due records. Header
`X-Device-ID` is authoritative. All request-shape validation is all-or-nothing: one malformed item
rejects the batch before any receipt/publish.

Per item:

1. validate device/session/merchant and money arithmetic;
2. canonicalize and hash payload;
3. create or reuse `SyncReceipt` by `(device_id, offline_uuid)`;
4. reject same key/different hash with `409 IDEMPOTENCY_PAYLOAD_MISMATCH`;
5. publish persistent Rabbit message with publisher confirm;
6. return accepted count and `queued_at`.

If receipt exists but publish fails, API returns retryable `503`. Dispatcher later republishes
unpublished receipts; client may also retry identical payload safely.

## Settlement

Consumer sets receipt `PROCESSING`, then in one PostgreSQL transaction creates/reuses canonical
transaction, immutable item snapshots, payment `VERIFIED`, and backend outbox events. ACK happens only
after commit.

Transient failures route through TTL retry queues at 5, 30, and 120 seconds. Permanent/exhausted
messages go DLQ and produce terminal `FAILED`. External HTTP response ordering never decides
business identity.

## Receipt polling

`GET /api/v1/sync/receipts` accepts repeated `offline_uuid` query parameters, max 100. Status response
includes receipt ID, offline UUID, state, canonical transaction ID, error, and timestamps. Auth errors
pause sync and preserve local queue.

## Conflict

Stock shortage yields canonical transaction `PENDING` and receipt `CONFLICT`:

- Owner confirm: stock movement idempotently applies, negative stock allowed, discrepancy/audit added;
- Owner void: append-only correction marks effective sale void, no stock movement.

## Stable payload

Retry must preserve offline UUID, merchant/device-bound identity, item/product/name/SKU/unit price,
catalog version, totals, payment method, and original timestamps. Backend validates arithmetic but does
not reprice historical offline snapshot against latest catalog.
