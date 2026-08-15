import { randomUUID } from "node:crypto"

import { pool } from "../db.js"
import { processBackendOutbox } from "../modules/inventory/processor.js"
import { verifyAdministration } from "./administration-scenarios.js"

const baseUrl = process.env.API_URL ?? "http://localhost:3001"
const deviceA = `DVC-FAILURE-A-${randomUUID()}`
const deviceB = `DVC-FAILURE-B-${randomUUID()}`
const deviceOtherMerchant = `DVC-FAILURE-OTHER-${randomUUID()}`
const testProductId = `prd-failure-${randomUUID()}`
const transactionIds = new Set<string>()
const createdOperatorIds = new Set<string>()
const createdProductIds = new Set<string>()

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { ...(init.body ? { "content-type": "application/json" } : {}), ...init.headers },
  })
  const body = (await response.json()) as T
  if (!response.ok)
    throw Object.assign(new Error(`${response.status} ${JSON.stringify(body)}`), {
      status: response.status,
      body,
    })
  return body
}

async function register(deviceId: string, merchantCode = "KEDAI-NUSA") {
  await request("/v1/devices/register", {
    method: "POST",
    body: JSON.stringify({
      merchantCode,
      activationCode: "COMP18-DEMO",
      deviceId,
      deviceName: `Failure ${deviceId.slice(-6)}`,
    }),
  })
}

async function login(deviceId: string, operatorCode = "RANI", pin = "1234") {
  return request<{ token: string; operator: { id: string }; merchantId: string }>(
    "/v1/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ merchantCode: "KEDAI-NUSA", operatorCode, pin, deviceId }),
    },
  )
}

async function loginForMerchant(
  deviceId: string,
  merchantCode: string,
  operatorCode: string,
  pin: string,
) {
  return request<{ token: string; operator: { id: string }; merchantId: string }>(
    "/v1/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ merchantCode, operatorCode, pin, deviceId }),
    },
  )
}

function transaction(operatorId: string, suffix: string) {
  const transactionId = `019-${suffix}-${randomUUID()}`
  transactionIds.add(transactionId)
  return {
    transactionId,
    invoiceNumber: `OPS-${randomUUID().slice(0, 8).toUpperCase()}`,
    operatorId,
    transactionStatus: "CONFIRMED",
    paymentMethod: "CASH",
    paymentVerificationType: "SYSTEM_VERIFIABLE",
    subtotal: 22_000,
    discount: 0,
    tax: 0,
    total: 22_000,
    createdAtDevice: new Date().toISOString(),
    items: [
      {
        productId: testProductId,
        name: "Failure Scenario Coffee",
        quantity: 1,
        unitPrice: 22_000,
        subtotal: 22_000,
      },
    ],
  }
}

async function sync(token: string, merchantId: string, deviceId: string, transactions: unknown[]) {
  return request<{ results: Array<{ transactionId: string; status: string; reason?: string }> }>(
    "/v1/sync/transactions",
    {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({
        schemaVersion: 1,
        merchantId,
        deviceId,
        batchId: randomUUID(),
        transactions,
      }),
    },
  )
}

function expectStatus(actual: string | undefined, expected: string, scenario: string) {
  if (actual !== expected) throw new Error(`${scenario}: expected ${expected}, received ${actual}`)
}

async function cleanupFixtures() {
  const ids = [...transactionIds]
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    await client.query(
      `DELETE FROM backend_outbox_events WHERE merchant_id = 'MRC-KEDAI-NUSA'
       AND (aggregate_id = ANY($1::text[]) OR aggregate_id IN (SELECT id FROM corrections WHERE merchant_id = 'MRC-KEDAI-NUSA' AND transaction_id = ANY($1::text[])))`,
      [ids],
    )
    await client.query(
      "DELETE FROM corrections WHERE merchant_id = 'MRC-KEDAI-NUSA' AND transaction_id = ANY($1::text[])",
      [ids],
    )
    await client.query(
      "DELETE FROM inventory_discrepancies WHERE merchant_id = 'MRC-KEDAI-NUSA' AND product_id = $1",
      [testProductId],
    )
    await client.query(
      "DELETE FROM inventory_movements WHERE merchant_id = 'MRC-KEDAI-NUSA' AND transaction_id = ANY($1::text[])",
      [ids],
    )
    await client.query(
      "DELETE FROM transaction_events WHERE merchant_id = 'MRC-KEDAI-NUSA' AND transaction_id = ANY($1::text[])",
      [ids],
    )
    await client.query(
      "DELETE FROM transaction_items WHERE merchant_id = 'MRC-KEDAI-NUSA' AND transaction_id = ANY($1::text[])",
      [ids],
    )
    await client.query(
      "DELETE FROM transactions WHERE merchant_id = 'MRC-KEDAI-NUSA' AND id = ANY($1::text[])",
      [ids],
    )
    await client.query("DELETE FROM auth_sessions WHERE device_id = ANY($1::text[])", [
      [deviceA, deviceB, deviceOtherMerchant],
    ])
    await client.query("DELETE FROM operators WHERE id = ANY($1::text[])", [
      [...createdOperatorIds],
    ])
    await client.query(
      "DELETE FROM devices WHERE merchant_id = 'MRC-KEDAI-NUSA' AND id = ANY($1::text[])",
      [[deviceA, deviceB]],
    )
    await client.query("DELETE FROM devices WHERE id = $1", [deviceOtherMerchant])
    await client.query("DELETE FROM products WHERE merchant_id = 'MRC-KEDAI-NUSA' AND id = $1", [
      testProductId,
    ])
    await client.query("DELETE FROM products WHERE id = ANY($1::text[])", [[...createdProductIds]])
    await client.query("COMMIT")
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}

async function run() {
  await pool.query(
    `INSERT INTO products (id, merchant_id, sku, name, description, category, price, stock_projection, min_stock, accent)
     VALUES ($1, 'MRC-KEDAI-NUSA', $2, 'Failure Scenario Coffee', 'Temporary integration fixture', 'Kopi', 22000, 2, 0, '#06b6d4')`,
    [testProductId, `TST-${randomUUID().slice(0, 8)}`],
  )
  try {
    await Promise.all([register(deviceA), register(deviceB)])
    const [sessionA, sessionB] = await Promise.all([login(deviceA), login(deviceB)])

    // Lost response: the first response is deliberately ignored, then the exact ID is retried.
    const lostResponseTransaction = transaction(sessionA.operator.id, "lost")
    await sync(sessionA.token, sessionA.merchantId, deviceA, [lostResponseTransaction])
    const lostResponseRetry = await sync(sessionA.token, sessionA.merchantId, deviceA, [
      lostResponseTransaction,
    ])
    expectStatus(lostResponseRetry.results[0]?.status, "ALREADY_PROCESSED", "lost response retry")

    // Multiple devices may independently retry the same stable identity without duplicating it.
    const crossDeviceRetry = await sync(sessionB.token, sessionB.merchantId, deviceB, [
      lostResponseTransaction,
    ])
    expectStatus(
      crossDeviceRetry.results[0]?.status,
      "ALREADY_PROCESSED",
      "cross-device idempotency",
    )

    // Reusing an ID with altered money fields is a permanent conflict, not an overwrite.
    const changedPayload = structuredClone(lostResponseTransaction)
    const changedItem = changedPayload.items[0]!
    changedItem.unitPrice = 23_000
    changedItem.subtotal = 23_000
    changedPayload.subtotal = 23_000
    changedPayload.total = 23_000
    const conflict = await sync(sessionA.token, sessionA.merchantId, deviceA, [changedPayload])
    expectStatus(conflict.results[0]?.status, "REJECTED_PERMANENT", "payload mismatch")

    // A malformed transaction does not prevent a valid sibling in the same batch from settling.
    const validSibling = transaction(sessionA.operator.id, "partial-valid")
    const invalidSibling = { ...transaction(sessionA.operator.id, "partial-invalid"), total: 1 }
    const partial = await sync(sessionA.token, sessionA.merchantId, deviceA, [
      validSibling,
      invalidSibling,
    ])
    expectStatus(partial.results[0]?.status, "ACCEPTED", "partial batch valid item")
    expectStatus(partial.results[1]?.status, "REJECTED_PERMANENT", "partial batch invalid item")

    // Mass reconnect shape: 30 records are sent as bounded 25 + 5 batches.
    const burst = Array.from({ length: 30 }, (_, index) =>
      transaction(sessionA.operator.id, `burst-${index}`),
    )
    const burstResults = [
      ...(await sync(sessionA.token, sessionA.merchantId, deviceA, burst.slice(0, 25))).results,
      ...(await sync(sessionA.token, sessionA.merchantId, deviceA, burst.slice(25))).results,
    ]
    if (burstResults.some((result) => result.status !== "ACCEPTED"))
      throw new Error("bounded reconnect burst was not fully accepted")

    // Device revocation is enforced server-side even if an old access token still exists.
    const admin = await login(deviceA, "ADMIN", "9999")
    const administration = await verifyAdministration({
      request,
      admin,
      operatorDeviceId: deviceA,
      registerOtherMerchant: () => register(deviceOtherMerchant, "TOKO-LAUT"),
      loginOtherMerchant: () => loginForMerchant(deviceOtherMerchant, "TOKO-LAUT", "ADMIN", "9999"),
    })
    createdOperatorIds.add(administration.operatorId)
    createdProductIds.add(administration.productId)
    const correction = await request<{ correctionId: string; originalTransactionMutated: boolean }>(
      `/v1/admin/transactions/${lostResponseTransaction.transactionId}/corrections`,
      {
        method: "POST",
        headers: { authorization: `Bearer ${admin.token}` },
        body: JSON.stringify({
          reason: "Automated reconciliation verification",
          adjustmentAmount: -1_000,
          evidenceReference: "TEST-EVIDENCE",
        }),
      },
    )
    if (correction.originalTransactionMutated !== false)
      throw new Error("correction mutated the settled transaction")

    // Drain downstream work and prove a negative projection is reconciled instead of rejecting sales.
    while (await processBackendOutbox(pool, 100)) {
      /* drain until no unclaimed event remains */
    }
    const discrepancyList = await request<{
      discrepancies: Array<{ id: string; productId: string; status: string }>
    }>("/v1/inventory/discrepancies", { headers: { authorization: `Bearer ${admin.token}` } })
    const openDiscrepancy = discrepancyList.discrepancies.find(
      (entry) => entry.productId === testProductId && entry.status === "OPEN",
    )
    if (!openDiscrepancy)
      throw new Error("expected an open inventory discrepancy after negative projection")
    const discrepancyResolution = await request<{ status: string }>(
      `/v1/inventory/discrepancies/${openDiscrepancy.id}/resolve`,
      {
        method: "POST",
        headers: { authorization: `Bearer ${admin.token}` },
        body: JSON.stringify({
          resolution: "Physical stock counted during automated verification",
          adjustedStock: 0,
        }),
      },
    )
    expectStatus(discrepancyResolution.status, "RESOLVED", "inventory discrepancy resolution")

    await request(`/v1/devices/${deviceB}/revoke`, {
      method: "POST",
      headers: { authorization: `Bearer ${admin.token}` },
    })
    let revokedStatus = 0
    try {
      await sync(sessionB.token, sessionB.merchantId, deviceB, [
        transaction(sessionB.operator.id, "revoked"),
      ])
    } catch (error) {
      revokedStatus = (error as { status?: number }).status ?? 0
    }
    if (revokedStatus !== 401)
      throw new Error(`revoked device: expected HTTP 401, received ${revokedStatus}`)

    console.log(
      JSON.stringify(
        {
          offlineDurability: "covered by Vitest IndexedDB suite",
          lostResponse: "ALREADY_PROCESSED",
          crossDeviceRetry: "ALREADY_PROCESSED",
          idReuseMismatch: "REJECTED_PERMANENT",
          partialBatch: partial.results.map((result) => result.status),
          reconnectBurst: `${burstResults.length}/30 ACCEPTED in bounded batches`,
          correction: `${correction.correctionId} append-only`,
          inventoryDiscrepancy: "RESOLVED after worker projection",
          revokedDevice: "session invalidated with HTTP 401",
          operatorAdministration: "create, reset PIN, deactivate, final-admin policy",
          catalogAdministration: "create, price update, archive, restore, merchant isolation",
        },
        null,
        2,
      ),
    )
  } finally {
    await cleanupFixtures()
  }
}

try {
  await run()
} finally {
  await pool.end()
}
