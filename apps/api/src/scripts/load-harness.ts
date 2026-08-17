import { randomUUID } from "node:crypto"

import bcrypt from "bcryptjs"

import { buildApp } from "../app.js"
import { appPools, pool, adminPool, reportingPool, workerPool } from "../db.js"
import { processInsightJobs } from "../modules/insights/processor.js"
import { processBackendOutbox } from "../modules/inventory/processor.js"
import { processReportingOutbox } from "../modules/reporting/projection.js"

const merchantCount = integerOption("merchants", "LOAD_MERCHANTS", 50, 1, 500)
const durationSeconds = integerOption("duration", "LOAD_DURATION_SECONDS", 15, 5, 300)
const port = integerEnvironment("LOAD_PORT", 3201, 1_024, 65_535)
const origin = `http://127.0.0.1:${port}`
process.env.LOG_LEVEL ??= "warn"
const prefix = `LOAD-${Date.now()}`
const latencies = {
  settlement: [] as number[],
  dashboard: [] as number[],
  localEnqueue: [] as number[],
}
const failures: string[] = []
const transactionIds = new Set<string>()
const contexts: MerchantContext[] = []
const app = await buildApp(appPools)

type MerchantContext = {
  merchantId: string
  merchantCode: string
  operatorId: string
  productId: string
  deviceId: string
  operatorToken: string
  adminToken: string
  ownerToken: string
}

try {
  await provisionMerchants()
  await app.listen({ host: "127.0.0.1", port })
  await createSessions()
  const deadline = Date.now() + durationSeconds * 1_000
  let sequence = 0

  while (Date.now() < deadline) {
    const iteration = sequence++
    await Promise.all(contexts.map((context) => exerciseMerchant(context, iteration)))
    await drainWorkerOnce()
  }
  await drainToConvergence()
  const canonicalCount = await pool.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM transactions WHERE merchant_id = ANY($1::text[])`,
    [contexts.map((context) => context.merchantId)],
  )
  const projectedCount = await pool.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM reporting_applied_transactions
     WHERE merchant_id = ANY($1::text[])`,
    [contexts.map((context) => context.merchantId)],
  )
  const canonical = Number(canonicalCount.rows[0]?.count ?? 0)
  const projected = Number(projectedCount.rows[0]?.count ?? 0)
  if (canonical !== transactionIds.size)
    failures.push(`ledger count ${canonical}/${transactionIds.size}`)
  if (projected !== canonical) failures.push(`reporting convergence ${projected}/${canonical}`)

  const result = {
    profile: { merchantCount, durationSeconds, node: process.version, platform: process.platform },
    samples: {
      settlements: latencies.settlement.length,
      dashboards: latencies.dashboard.length,
      localEnqueues: latencies.localEnqueue.length,
    },
    p95Ms: {
      localEnqueue: percentile(latencies.localEnqueue, 0.95),
      settlement: percentile(latencies.settlement, 0.95),
      dashboard: percentile(latencies.dashboard, 0.95),
    },
    correctness: {
      uniqueTransactions: transactionIds.size,
      canonicalTransactions: canonical,
      projectedTransactions: projected,
      failures,
    },
  }
  console.log(JSON.stringify(result, null, 2))
  if (
    failures.length ||
    result.p95Ms.localEnqueue >= 500 ||
    result.p95Ms.settlement >= 750 ||
    result.p95Ms.dashboard >= 1_500
  ) {
    throw new Error("Mixed-load acceptance target was not met")
  }
} finally {
  await app.close().catch(() => undefined)
  await cleanupMerchants()
  await Promise.all([pool.end(), adminPool.end(), reportingPool.end(), workerPool.end()])
}

async function exerciseMerchant(context: MerchantContext, iteration: number) {
  const localStartedAt = performance.now()
  const transactionId = randomUUID()
  const transaction = {
    transactionId,
    invoiceNumber: `${context.merchantCode}-${iteration}-${transactionId.slice(0, 6)}`,
    operatorId: context.operatorId,
    transactionStatus: "CONFIRMED",
    paymentMethod: "CASH",
    paymentVerificationType: "SYSTEM_VERIFIABLE",
    subtotal: 20_000,
    discount: 0,
    tax: 0,
    total: 20_000,
    createdAtDevice: new Date().toISOString(),
    items: [
      {
        productId: context.productId,
        name: "Load Coffee",
        quantity: 1,
        unitPrice: 20_000,
        subtotal: 20_000,
      },
    ],
  }
  transactionIds.add(transactionId)
  latencies.localEnqueue.push(performance.now() - localStartedAt)
  const settlementStartedAt = performance.now()
  await request("/v1/sync/transactions", {
    method: "POST",
    token: context.operatorToken,
    body: {
      schemaVersion: 1,
      merchantId: context.merchantId,
      deviceId: context.deviceId,
      batchId: randomUUID(),
      transactions: [transaction],
    },
  })
  latencies.settlement.push(performance.now() - settlementStartedAt)

  const dashboardStartedAt = performance.now()
  await request("/v1/owner/dashboard", { token: context.ownerToken })
  latencies.dashboard.push(performance.now() - dashboardStartedAt)
  if (iteration === 0) {
    await Promise.all([
      request("/v1/admin/products", { token: context.adminToken }),
      request("/v1/owner/insights/generate", { method: "POST", token: context.ownerToken }),
    ])
  }
}

async function provisionMerchants() {
  const pinHash = await bcrypt.hash("1234", 8)
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    for (let index = 0; index < merchantCount; index += 1) {
      const suffix = String(index).padStart(3, "0")
      const merchantId = `${prefix}-M-${suffix}`
      const merchantCode = `${prefix}-${suffix}`
      const operatorId = `${prefix}-O-${suffix}`
      const adminId = `${prefix}-A-${suffix}`
      const ownerId = `${prefix}-W-${suffix}`
      const productId = `${prefix}-P-${suffix}`
      await client.query(`INSERT INTO merchants (id, code, name) VALUES ($1,$2,$3)`, [
        merchantId,
        merchantCode,
        `Load Merchant ${suffix}`,
      ])
      await client.query(
        `INSERT INTO operators (id, merchant_id, code, name, role, pin_hash) VALUES
         ($1,$4,'CASHIER','Load Cashier','OPERATOR',$5),
         ($2,$4,'ADMIN','Load Admin','ADMIN',$5),
         ($3,$4,'OWNER','Load Owner','OWNER',$5)`,
        [operatorId, adminId, ownerId, merchantId, pinHash],
      )
      await client.query(
        `INSERT INTO products (id, merchant_id, sku, name, category, price, stock_projection)
         VALUES ($1,$2,'LOAD-COFFEE','Load Coffee','Drink',20000,100000)`,
        [productId, merchantId],
      )
      contexts.push({
        merchantId,
        merchantCode,
        operatorId,
        productId,
        deviceId: `${prefix}-D-${suffix}`,
        operatorToken: "",
        adminToken: "",
        ownerToken: "",
      })
    }
    await client.query("COMMIT")
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}

async function createSessions() {
  await Promise.all(
    contexts.map(async (context) => {
      await request("/v1/devices/register", {
        method: "POST",
        body: {
          merchantCode: context.merchantCode,
          activationCode: "COMPOS-DEMO",
          deviceId: context.deviceId,
          deviceName: "Load Device",
        },
      })
      const [operator, admin, owner] = await Promise.all([
        request<{ token: string }>("/v1/auth/login", {
          method: "POST",
          body: {
            merchantCode: context.merchantCode,
            operatorCode: "CASHIER",
            pin: "1234",
            deviceId: context.deviceId,
          },
        }),
        request<{ token: string }>("/v1/auth/login", {
          method: "POST",
          body: {
            merchantCode: context.merchantCode,
            operatorCode: "ADMIN",
            pin: "1234",
            deviceId: context.deviceId,
          },
        }),
        request<{ token: string }>("/v1/auth/login", {
          method: "POST",
          body: {
            merchantCode: context.merchantCode,
            operatorCode: "OWNER",
            pin: "1234",
            deviceId: context.deviceId,
          },
        }),
      ])
      context.operatorToken = operator.token
      context.adminToken = admin.token
      context.ownerToken = owner.token
    }),
  )
}

async function request<T = unknown>(
  path: string,
  input: { method?: string; token?: string; body?: unknown } = {},
) {
  const response = await fetch(`${origin}${path}`, {
    ...(input.method ? { method: input.method } : {}),
    headers: {
      ...(input.token ? { authorization: `Bearer ${input.token}` } : {}),
      ...(input.body ? { "content-type": "application/json" } : {}),
    },
    ...(input.body ? { body: JSON.stringify(input.body) } : {}),
  })
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(`${path} returned ${response.status}: ${JSON.stringify(body)}`)
  return body as T
}

async function drainWorkerOnce() {
  await Promise.all([
    processBackendOutbox(workerPool, 100),
    processReportingOutbox(workerPool, 100),
    processInsightJobs(workerPool, 20),
  ])
}

async function drainToConvergence() {
  for (;;) {
    const [inventory, reporting, insights] = await Promise.all([
      processBackendOutbox(workerPool, 500),
      processReportingOutbox(workerPool, 500),
      processInsightJobs(workerPool, 100),
    ])
    if (inventory + reporting + insights === 0) return
  }
}

async function cleanupMerchants() {
  const merchantIds = contexts.map((context) => context.merchantId)
  if (!merchantIds.length || !merchantIds.every((id) => id.startsWith(prefix))) return
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    for (const table of [
      "insight_jobs",
      "business_insights",
      "reporting_applied_transactions",
      "merchant_product_daily_sales",
      "merchant_daily_sales",
      "backend_outbox_events",
      "inventory_discrepancies",
      "inventory_movements",
      "corrections",
      "transaction_events",
      "transaction_items",
      "transactions",
      "admin_audit_events",
      "auth_sessions",
      "products",
      "devices",
      "operators",
    ]) {
      await client.query(`DELETE FROM ${table} WHERE merchant_id = ANY($1::text[])`, [merchantIds])
    }
    await client.query("DELETE FROM merchants WHERE id = ANY($1::text[])", [merchantIds])
    await client.query("COMMIT")
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}

function percentile(values: number[], quantile: number) {
  if (!values.length) return 0
  const ordered = [...values].sort((left, right) => left - right)
  return Math.round((ordered[Math.ceil(ordered.length * quantile) - 1] ?? 0) * 100) / 100
}

function integerEnvironment(name: string, fallback: number, minimum: number, maximum: number) {
  const value = Number(process.env[name] ?? fallback)
  if (!Number.isInteger(value) || value < minimum || value > maximum)
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}`)
  return value
}

function integerOption(
  option: string,
  environmentName: string,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const argument = process.argv.find((value) => value.startsWith(`--${option}=`))?.split("=")[1]
  const value = Number(argument ?? process.env[environmentName] ?? fallback)
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${option} must be an integer between ${minimum} and ${maximum}`)
  }
  return value
}
