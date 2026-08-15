import { useCallback, useEffect, useState } from "react"
import type { Product, ProductInput, ProductPatch } from "@operator/contracts"
import { toast } from "sonner"

import {
  createAdminProduct,
  fetchAdminProducts,
  setAdminProductArchived,
  updateAdminProduct,
} from "@/features/admin-catalog/admin-catalog-api"
import { useCurrentSession } from "@/features/auth/session-queries"

export function useAdminCatalog() {
  const session = useCurrentSession()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [mutatingId, setMutatingId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!session) return
    setLoading(true)
    try {
      setProducts((await fetchAdminProducts(session)).products)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Katalog Admin gagal dimuat")
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => void refresh(), [refresh])

  async function run(id: string, action: () => Promise<unknown>, message: string) {
    setMutatingId(id)
    try {
      await action()
      toast.success(message)
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Produk gagal disimpan")
      throw error
    } finally {
      setMutatingId(null)
    }
  }

  return {
    products,
    loading,
    mutatingId,
    refresh,
    create: (input: ProductInput) =>
      session
        ? run("create", () => createAdminProduct(session, input), "Produk dibuat")
        : Promise.reject(new Error("Sesi tidak tersedia")),
    update: (productId: string, patch: ProductPatch) =>
      session
        ? run(productId, () => updateAdminProduct(session, productId, patch), "Produk diperbarui")
        : Promise.reject(new Error("Sesi tidak tersedia")),
    setArchived: (product: Product, archived: boolean) =>
      session
        ? run(
            product.id,
            () => setAdminProductArchived(session, product.id, archived),
            archived ? "Produk diarsipkan" : "Produk dipulihkan",
          )
        : Promise.reject(new Error("Sesi tidak tersedia")),
  }
}
