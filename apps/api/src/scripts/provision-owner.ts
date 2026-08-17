import { randomUUID } from "node:crypto"

import bcrypt from "bcryptjs"

import { pool } from "../db.js"
import { withTransaction } from "../database/transaction.js"

const merchantCode = process.env.OWNER_MERCHANT_CODE?.trim().toUpperCase()
const operatorCode = process.env.OWNER_OPERATOR_CODE?.trim().toUpperCase()
const ownerName = process.env.OWNER_NAME?.trim()
const pin = process.env.OWNER_PIN
if (!merchantCode || !operatorCode || !ownerName || !pin?.match(/^\d{4,8}$/)) {
  throw new Error(
    "OWNER_MERCHANT_CODE, OWNER_OPERATOR_CODE, OWNER_NAME, and numeric OWNER_PIN are required",
  )
}

try {
  await withTransaction(pool, async (client) => {
    const merchant = await client.query<{ id: string }>(
      "SELECT id FROM merchants WHERE code = $1",
      [merchantCode],
    )
    const merchantId = merchant.rows[0]?.id
    if (!merchantId) throw new Error("Merchant not found")
    const id = randomUUID()
    await client.query(
      `INSERT INTO operators (id, merchant_id, code, name, role, pin_hash)
       VALUES ($1,$2,$3,$4,'OWNER',$5)`,
      [id, merchantId, operatorCode, ownerName, await bcrypt.hash(pin, 10)],
    )
    await client.query(
      `INSERT INTO admin_audit_events
       (id, merchant_id, actor_operator_id, action, target_type, target_id, metadata)
       VALUES ($1,$2,$3,'OWNER_PROVISIONED','OPERATOR',$3,$4::jsonb)`,
      [randomUUID(), merchantId, id, JSON.stringify({ code: operatorCode, actorType: "SYSTEM" })],
    )
  })
  console.info(`Provisioned Owner ${operatorCode} for ${merchantCode}`)
} finally {
  await pool.end()
}
