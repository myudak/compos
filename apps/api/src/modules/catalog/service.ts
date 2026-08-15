import type { ProductInput, ProductPatch } from "@operator/contracts"

import type { AuthIdentity } from "../../auth.js"
import type { DatabasePool } from "../../db.js"
import { withTransaction } from "../../database/transaction.js"
import { HttpError } from "../../http/errors.js"
import { CatalogRepository } from "./repository.js"

export class CatalogService {
  private readonly repository: CatalogRepository

  constructor(private readonly pool: DatabasePool) {
    this.repository = new CatalogRepository(pool)
  }

  list(merchantId: string, includeArchived: boolean) {
    return this.repository.list(merchantId, includeArchived)
  }

  create(identity: AuthIdentity, input: ProductInput) {
    return this.withUniqueSkuHandling(() =>
      withTransaction(this.pool, async (client) => {
        const product = await this.repository.create(client, identity.merchantId, input)
        await this.repository.audit(client, {
          merchantId: identity.merchantId,
          actorId: identity.operatorId,
          action: "PRODUCT_CREATED",
          productId: product.id,
          metadata: { sku: product.sku, name: product.name, price: product.price },
        })
        return product
      }),
    )
  }

  update(identity: AuthIdentity, productId: string, patch: ProductPatch) {
    return this.withUniqueSkuHandling(() =>
      withTransaction(this.pool, async (client) => {
        const current = await this.repository.lock(client, identity.merchantId, productId)
        if (!current) throw new HttpError(404, "NOT_FOUND", "Product not found")
        const product = await this.repository.update(
          client,
          identity.merchantId,
          productId,
          current,
          patch,
        )
        await this.repository.audit(client, {
          merchantId: identity.merchantId,
          actorId: identity.operatorId,
          action: "PRODUCT_UPDATED",
          productId,
          metadata: { before: current, after: product },
        })
        return product
      }),
    )
  }

  setArchived(identity: AuthIdentity, productId: string, archived: boolean) {
    return withTransaction(this.pool, async (client) => {
      const current = await this.repository.lock(client, identity.merchantId, productId)
      if (!current) throw new HttpError(404, "NOT_FOUND", "Product not found")
      const product = await this.repository.setArchived(
        client,
        identity.merchantId,
        productId,
        archived,
      )
      await this.repository.audit(client, {
        merchantId: identity.merchantId,
        actorId: identity.operatorId,
        action: archived ? "PRODUCT_ARCHIVED" : "PRODUCT_RESTORED",
        productId,
        metadata: { sku: product.sku, name: product.name },
      })
      return product
    })
  }

  private async withUniqueSkuHandling<T>(operation: () => Promise<T>) {
    try {
      return await operation()
    } catch (error) {
      if ((error as { code?: string }).code === "23505") {
        throw new HttpError(409, "CONFLICT", "Product SKU already exists for this merchant")
      }
      throw error
    }
  }
}
