import type { Product } from "@operator/contracts"

import type { DatabasePool } from "../../db.js"

type ProductRow = {
  id: string
  sku: string
  name: string
  description: string
  category: string
  price: number
  stock: number
  min_stock: number
  accent: string
  active: boolean
  updated_at: Date
}

export class CatalogRepository {
  constructor(private readonly pool: DatabasePool) {}

  async list(merchantId: string, includeArchived = false): Promise<Product[]> {
    const result = await this.pool.query<ProductRow>(
      `SELECT id, sku, name, description, category, price,
              stock_projection AS stock, min_stock, accent, active, updated_at
       FROM products
       WHERE merchant_id = $1 AND ($2::boolean OR active = true)
       ORDER BY name`,
      [merchantId, includeArchived],
    )
    return result.rows.map(mapProductRow)
  }
}

function mapProductRow(row: ProductRow): Product {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    description: row.description,
    category: row.category,
    price: row.price,
    stock: row.stock,
    lowStockThreshold: row.min_stock,
    accent: row.accent,
    active: row.active,
    updatedAt: row.updated_at.toISOString(),
  }
}
