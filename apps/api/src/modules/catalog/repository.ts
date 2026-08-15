import { randomUUID } from "node:crypto"

import type { Product, ProductInput, ProductPatch } from "@operator/contracts"

import type { DatabaseClient, DatabasePool } from "../../db.js"

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

  async lock(client: DatabaseClient, merchantId: string, productId: string) {
    const result = await client.query<ProductRow>(
      `${productSelect}
       WHERE merchant_id = $1 AND id = $2
       FOR UPDATE`,
      [merchantId, productId],
    )
    return result.rows[0] ? mapProductRow(result.rows[0]) : null
  }

  async create(client: DatabaseClient, merchantId: string, input: ProductInput) {
    const result = await client.query<ProductRow>(
      `INSERT INTO products (
        id, merchant_id, sku, name, description, category, price, min_stock, accent
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING id, sku, name, description, category, price,
                stock_projection AS stock, min_stock, accent, active, updated_at`,
      [
        randomUUID(),
        merchantId,
        input.sku.toUpperCase(),
        input.name,
        input.description,
        input.category,
        input.price,
        input.lowStockThreshold,
        input.accent,
      ],
    )
    return mapProductRow(result.rows[0]!)
  }

  async update(
    client: DatabaseClient,
    merchantId: string,
    productId: string,
    current: Product,
    patch: ProductPatch,
  ) {
    const result = await client.query<ProductRow>(
      `UPDATE products SET
        sku = $1, name = $2, description = $3, category = $4,
        price = $5, min_stock = $6, accent = $7, updated_at = now()
       WHERE merchant_id = $8 AND id = $9
       RETURNING id, sku, name, description, category, price,
                 stock_projection AS stock, min_stock, accent, active, updated_at`,
      [
        patch.sku?.toUpperCase() ?? current.sku,
        patch.name ?? current.name,
        patch.description ?? current.description,
        patch.category ?? current.category,
        patch.price ?? current.price,
        patch.lowStockThreshold ?? current.lowStockThreshold,
        patch.accent ?? current.accent,
        merchantId,
        productId,
      ],
    )
    return mapProductRow(result.rows[0]!)
  }

  async setArchived(
    client: DatabaseClient,
    merchantId: string,
    productId: string,
    archived: boolean,
  ) {
    const result = await client.query<ProductRow>(
      `UPDATE products SET
         active = $1, archived_at = CASE WHEN $1 THEN NULL ELSE now() END, updated_at = now()
       WHERE merchant_id = $2 AND id = $3
       RETURNING id, sku, name, description, category, price,
                 stock_projection AS stock, min_stock, accent, active, updated_at`,
      [!archived, merchantId, productId],
    )
    return mapProductRow(result.rows[0]!)
  }

  async audit(
    client: DatabaseClient,
    input: {
      merchantId: string
      actorId: string
      action: string
      productId: string
      metadata: unknown
    },
  ) {
    await client.query(
      `INSERT INTO admin_audit_events (
        id, merchant_id, actor_operator_id, action, target_type, target_id, metadata
      ) VALUES ($1,$2,$3,$4,'PRODUCT',$5,$6::jsonb)`,
      [
        randomUUID(),
        input.merchantId,
        input.actorId,
        input.action,
        input.productId,
        JSON.stringify(input.metadata),
      ],
    )
  }
}

const productSelect = `SELECT id, sku, name, description, category, price,
  stock_projection AS stock, min_stock, accent, active, updated_at FROM products`

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
