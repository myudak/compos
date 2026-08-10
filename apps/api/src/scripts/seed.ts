import bcrypt from "bcryptjs"

import { pool } from "../db.js"

const operatorPin = await bcrypt.hash("1234", 10)
const adminPin = await bcrypt.hash("9999", 10)

await pool.query(
  `INSERT INTO merchants (id, code, name) VALUES ('MRC-KEDAI-NUSA','KEDAI-NUSA','Kedai Nusa')
   ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
)
await pool.query(
  `INSERT INTO operators (id, merchant_id, code, name, role, pin_hash) VALUES
   ('OPR-RANI-07','MRC-KEDAI-NUSA','RANI','Rani A.','OPERATOR',$1),
   ('ADM-NUSA-01','MRC-KEDAI-NUSA','ADMIN','Dimas Admin','ADMIN',$2)
   ON CONFLICT (merchant_id, code) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role, pin_hash = EXCLUDED.pin_hash, active = true`,
  [operatorPin, adminPin],
)

const products = [
  ["prd-aren", "DRK-001", "Kopi Susu Aren", "Espresso, susu, gula aren", "Kopi", 22000, 18, "#06b6d4"],
  ["prd-americano", "DRK-002", "Iced Americano", "Double shot, sparkling water", "Kopi", 18000, 24, "#0e7490"],
  ["prd-latte", "DRK-003", "Caramel Latte", "Espresso, caramel, fresh milk", "Kopi", 26000, 9, "#a16207"],
  ["prd-matcha", "DRK-004", "Matcha Cloud", "Uji matcha, oat milk, foam", "Non Kopi", 28000, 7, "#65a30d"],
  ["prd-choco", "DRK-005", "Choco Sea Salt", "Dark cocoa, sea salt cream", "Non Kopi", 25000, 12, "#7c3f2c"],
  ["prd-yuzu", "DRK-006", "Yuzu Sparkling", "Yuzu, tonic, citrus peel", "Non Kopi", 24000, 14, "#ca8a04"],
  ["prd-matah", "FOD-001", "Nasi Ayam Matah", "Ayam panggang, sambal matah", "Makanan", 35000, 6, "#ea580c"],
  ["prd-croffle", "FOD-002", "Aren Croffle", "Croffle, gula aren, sea salt", "Makanan", 24000, 11, "#d97706"],
  ["prd-fries", "FOD-003", "Truffle Fries", "Kentang, truffle oil, parmesan", "Makanan", 27000, 5, "#f59e0b"],
  ["prd-sandwich", "FOD-004", "Tuna Melt", "Tuna, cheddar, sourdough", "Makanan", 32000, 4, "#ef4444"],
  ["prd-banana", "FOD-005", "Banana Bread", "Pisang, walnut, cinnamon", "Makanan", 18000, 8, "#b45309"],
  ["prd-water", "DRK-007", "Mineral Water", "Air mineral 600 ml", "Non Kopi", 10000, 31, "#0284c7"]
]
for (const product of products) {
  await pool.query(
    `INSERT INTO products (id, merchant_id, sku, name, description, category, price, stock_projection, accent)
     VALUES ($1,'MRC-KEDAI-NUSA',$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (merchant_id, id) DO UPDATE SET sku=EXCLUDED.sku,name=EXCLUDED.name,description=EXCLUDED.description,category=EXCLUDED.category,price=EXCLUDED.price,accent=EXCLUDED.accent,updated_at=now()`,
    product,
  )
}
console.log("Seeded merchant KEDAI-NUSA. Operator RANI/1234, admin ADMIN/9999.")
await pool.end()
