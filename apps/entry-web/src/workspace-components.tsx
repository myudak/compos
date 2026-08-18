import type { ProductDto } from "@k-pos/api-client"
import {
  IconArchive,
  IconBox,
  IconEdit,
  IconHistory,
  IconLogout,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconStack2,
} from "@tabler/icons-react"

import type { EntrySession } from "./api"
import { Brand } from "./login-page"

const rupiah = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" })

export function EntryHeader({
  session,
  busy,
  onRefresh,
  onLogout,
}: {
  session: EntrySession
  busy: boolean
  onRefresh: () => void
  onLogout: () => void
}) {
  return (
    <header className="topbar">
      <Brand />
      <div className="identity">
        <span>{session.name}</span>
        <small>{session.email}</small>
      </div>
      <button className="icon-button" onClick={onRefresh} aria-label="Refresh">
        <IconRefresh size={19} className={busy ? "spin" : ""} />
      </button>
      <button className="icon-button" onClick={onLogout} aria-label="Logout">
        <IconLogout size={19} />
      </button>
    </header>
  )
}

export function EntryPageHeading({ onCreate }: { onCreate: () => void }) {
  return (
    <section className="page-heading">
      <div>
        <h1>Catalog & inventory</h1>
        <p>Harga dan availability terbaru untuk semua counter merchant.</p>
      </div>
      <button className="primary compact" onClick={onCreate}>
        <IconPlus size={18} /> Tambah produk
      </button>
    </section>
  )
}

export function CatalogSummary({ products }: { products: ProductDto[] }) {
  const activeStock = products.reduce(
    (total, product) => total + (product.inventory?.current_stock ?? 0),
    0,
  )
  return (
    <section className="summary-grid">
      <Summary icon={<IconBox />} label="Total produk" value={String(products.length)} />
      <Summary icon={<IconStack2 />} label="Stok aktif" value={String(activeStock)} />
      <Summary
        icon={<IconArchive />}
        label="Diarsipkan"
        value={String(products.filter((product) => !product.is_active).length)}
      />
    </section>
  )
}

export function CatalogPanel({
  products,
  query,
  onQueryChange,
  onEdit,
  onStock,
  onHistory,
  onToggleArchive,
}: {
  products: ProductDto[]
  query: string
  onQueryChange: (value: string) => void
  onEdit: (product: ProductDto) => void
  onStock: (product: ProductDto) => void
  onHistory: (product: ProductDto) => void
  onToggleArchive: (product: ProductDto) => void
}) {
  return (
    <section className="catalog-panel">
      <div className="toolbar">
        <div className="search-box">
          <IconSearch size={18} />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Cari nama atau SKU"
          />
        </div>
        <span>{products.length} produk</span>
      </div>
      <div className="product-grid">
        {products.map((product) => (
          <ProductCard
            key={product.id_product}
            product={product}
            onEdit={() => onEdit(product)}
            onStock={() => onStock(product)}
            onHistory={() => onHistory(product)}
            onToggleArchive={() => onToggleArchive(product)}
          />
        ))}
      </div>
    </section>
  )
}

function ProductCard({
  product,
  onEdit,
  onStock,
  onHistory,
  onToggleArchive,
}: {
  product: ProductDto
  onEdit: () => void
  onStock: () => void
  onHistory: () => void
  onToggleArchive: () => void
}) {
  return (
    <article className={`product-card ${product.is_active ? "" : "archived"}`}>
      <div className="product-image">
        {product.image_url ? <img src={product.image_url} alt="" /> : <IconBox size={34} />}
        <span>{product.is_active ? `v${product.catalog_version}` : "Archived"}</span>
      </div>
      <div className="product-copy">
        <small>{product.sku}</small>
        <h2>{product.name}</h2>
        <strong>{rupiah.format(product.price)}</strong>
        <div className="stock-line">
          <span>Stok</span>
          <b>{product.inventory?.current_stock ?? 0}</b>
        </div>
      </div>
      <div className="card-actions">
        <button onClick={onEdit}>
          <IconEdit /> Edit
        </button>
        <button onClick={onStock}>
          <IconStack2 /> Stok
        </button>
        <button onClick={onHistory}>
          <IconHistory /> Riwayat
        </button>
        <button onClick={onToggleArchive}>
          <IconArchive /> {product.is_active ? "Arsip" : "Restore"}
        </button>
      </div>
    </article>
  )
}

function Summary({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="summary-card">
      <i>{icon}</i>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}
