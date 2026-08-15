import bcrypt from "bcryptjs"

import { pool } from "../db.js"
import { withTransaction } from "../database/transaction.js"

const products = [
  [
    "prd-aren",
    "DRK-001",
    "Kopi Susu Aren",
    "Espresso, susu, gula aren",
    "Kopi",
    22_000,
    18,
    5,
    "#06b6d4",
  ],
  [
    "prd-americano",
    "DRK-002",
    "Iced Americano",
    "Double shot, sparkling water",
    "Kopi",
    18_000,
    24,
    5,
    "#0e7490",
  ],
  [
    "prd-latte",
    "DRK-003",
    "Caramel Latte",
    "Espresso, caramel, fresh milk",
    "Kopi",
    26_000,
    9,
    5,
    "#a16207",
  ],
  [
    "prd-matcha",
    "DRK-004",
    "Matcha Cloud",
    "Uji matcha, oat milk, foam",
    "Non Kopi",
    28_000,
    7,
    5,
    "#65a30d",
  ],
  [
    "prd-choco",
    "DRK-005",
    "Choco Sea Salt",
    "Dark cocoa, sea salt cream",
    "Non Kopi",
    25_000,
    12,
    5,
    "#7c3f2c",
  ],
  [
    "prd-yuzu",
    "DRK-006",
    "Yuzu Sparkling",
    "Yuzu, tonic, citrus peel",
    "Non Kopi",
    24_000,
    14,
    5,
    "#ca8a04",
  ],
  [
    "prd-matah",
    "FOD-001",
    "Nasi Ayam Matah",
    "Ayam panggang, sambal matah",
    "Makanan",
    35_000,
    6,
    5,
    "#ea580c",
  ],
  [
    "prd-croffle",
    "FOD-002",
    "Aren Croffle",
    "Croffle, gula aren, sea salt",
    "Makanan",
    24_000,
    11,
    5,
    "#d97706",
  ],
] as const

const cashierPinHash = await bcrypt.hash("1234", 10)
const adminPinHash = await bcrypt.hash("9999", 10)

await withTransaction(pool, async (client) => {
  await client.query(
    `INSERT INTO merchants (id, code, name) VALUES
      ('MRC-KEDAI-NUSA','KEDAI-NUSA','Kedai Nusa'),
      ('MRC-TOKO-LAUT','TOKO-LAUT','Toko Laut')
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = now()`,
  )
  await client.query(
    `INSERT INTO operators (
      id, merchant_id, code, name, role, pin_hash
    ) VALUES
      ('OPR-RANI-07','MRC-KEDAI-NUSA','RANI','Rani A.','OPERATOR',$1),
      ('ADM-NUSA-01','MRC-KEDAI-NUSA','ADMIN','Dimas Admin','ADMIN',$2),
      ('ADM-LAUT-01','MRC-TOKO-LAUT','ADMIN','Sari Admin','ADMIN',$2)
     ON CONFLICT (merchant_id, code) DO UPDATE
       SET name = EXCLUDED.name, role = EXCLUDED.role,
           pin_hash = EXCLUDED.pin_hash, active = true, updated_at = now()`,
    [cashierPinHash, adminPinHash],
  )

  for (const product of products) {
    await client.query(
      `INSERT INTO products (
        id, merchant_id, sku, name, description, category,
        price, stock_projection, min_stock, accent
      ) VALUES ($1,'MRC-KEDAI-NUSA',$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (merchant_id, id) DO UPDATE SET
        sku = EXCLUDED.sku, name = EXCLUDED.name,
        description = EXCLUDED.description, category = EXCLUDED.category,
        price = EXCLUDED.price, stock_projection = EXCLUDED.stock_projection,
        min_stock = EXCLUDED.min_stock, accent = EXCLUDED.accent,
        active = true, archived_at = NULL, updated_at = now()`,
      [...product],
    )
  }
})

console.info("Seeded deterministic demo merchants, operators, and catalog.")
await pool.end()
