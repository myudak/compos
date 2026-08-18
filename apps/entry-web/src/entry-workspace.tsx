import type { ProductDto } from "@k-pos/api-client"
import { useCallback, useEffect, useMemo, useState } from "react"

import { listProducts, logoutEntry, setProductArchived, type EntrySession } from "./api"
import { CatalogPanel, CatalogSummary, EntryHeader, EntryPageHeading } from "./workspace-components"
import { ProductEditor, StockEditor, StockHistory } from "./workspace-dialogs"

export function EntryWorkspace({
  session,
  onSessionEnd,
}: {
  session: EntrySession
  onSessionEnd: () => void
}) {
  const [products, setProducts] = useState<ProductDto[]>([])
  const [query, setQuery] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [editor, setEditor] = useState<ProductDto | "new" | null>(null)
  const [stockProduct, setStockProduct] = useState<ProductDto | null>(null)
  const [historyProduct, setHistoryProduct] = useState<ProductDto | null>(null)

  const refresh = useCallback(async () => {
    setBusy(true)
    try {
      setProducts(await listProducts(session))
      setError("")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Catalog belum dapat dimuat")
    } finally {
      setBusy(false)
    }
  }, [session])

  useEffect(() => void refresh(), [refresh])
  const visible = useMemo(() => filterProducts(products, query), [products, query])

  async function toggleArchive(product: ProductDto) {
    try {
      await setProductArchived(session, product, product.is_active)
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Status produk gagal diubah")
    }
  }

  return (
    <main className="workspace">
      <EntryHeader
        session={session}
        busy={busy}
        onRefresh={() => void refresh()}
        onLogout={() => void logoutEntry(session).finally(onSessionEnd)}
      />
      <EntryPageHeading onCreate={() => setEditor("new")} />
      <CatalogSummary products={products} />
      {error && <div className="error-box">{error}</div>}
      <CatalogPanel
        products={visible}
        query={query}
        onQueryChange={setQuery}
        onEdit={setEditor}
        onStock={setStockProduct}
        onHistory={setHistoryProduct}
        onToggleArchive={(product) => void toggleArchive(product)}
      />
      {editor && (
        <ProductEditor
          product={editor === "new" ? null : editor}
          session={session}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null)
            void refresh()
          }}
        />
      )}
      {stockProduct && (
        <StockEditor
          product={stockProduct}
          session={session}
          onClose={() => setStockProduct(null)}
          onSaved={() => {
            setStockProduct(null)
            void refresh()
          }}
        />
      )}
      {historyProduct && (
        <StockHistory
          product={historyProduct}
          session={session}
          onClose={() => setHistoryProduct(null)}
        />
      )}
    </main>
  )
}

function filterProducts(products: ProductDto[], query: string): ProductDto[] {
  const search = query.trim().toLowerCase()
  return search
    ? products.filter((product) => `${product.name} ${product.sku}`.toLowerCase().includes(search))
    : products
}
