import type { ProductDto } from "@k-pos/api-client"
import { useEffect, useState } from "react"

import { adjustStock, getStockHistory, saveProduct, type EntrySession } from "./api"

export function ProductEditor({
  product,
  session,
  onClose,
  onSaved,
}: {
  product: ProductDto | null
  session: EntrySession
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(product?.name ?? "")
  const [sku, setSku] = useState(product?.sku ?? "")
  const [price, setPrice] = useState(String(product?.price ?? ""))
  const [image, setImage] = useState<File>()
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError("")
    try {
      await saveProduct(session, {
        id: product?.id_product,
        name,
        sku,
        price: Number(price),
        image,
      })
      onSaved()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Produk gagal disimpan")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={product ? "Edit produk" : "Produk baru"} onClose={onClose}>
      <form className="modal-form" onSubmit={submit}>
        <label>
          <span>Nama</span>
          <input required value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          <span>SKU</span>
          <input required value={sku} onChange={(event) => setSku(event.target.value)} />
        </label>
        <label>
          <span>Harga (rupiah)</span>
          <input
            required
            min="0"
            type="number"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
          />
        </label>
        <label>
          <span>Foto opsional</span>
          <input
            accept="image/png,image/jpeg,image/webp"
            type="file"
            onChange={(event) => setImage(event.target.files?.[0])}
          />
        </label>
        {error && <div className="error-box">{error}</div>}
        <button className="primary" disabled={busy}>
          {busy ? "Menyimpan…" : "Simpan produk"}
        </button>
      </form>
    </Modal>
  )
}

export function StockEditor({
  product,
  session,
  onClose,
  onSaved,
}: {
  product: ProductDto
  session: EntrySession
  onClose: () => void
  onSaved: () => void
}) {
  const [quantity, setQuantity] = useState("")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState("")

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    try {
      await adjustStock(session, product.id_product, Number(quantity), notes)
      onSaved()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Stok gagal disesuaikan")
    }
  }

  return (
    <Modal title={`Adjust stok · ${product.name}`} onClose={onClose}>
      <form className="modal-form" onSubmit={submit}>
        <p>
          Stok saat ini <strong>{product.inventory?.current_stock ?? 0}</strong>. Gunakan angka
          negatif untuk pengurangan.
        </p>
        <label>
          <span>Perubahan quantity</span>
          <input
            required
            type="number"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
        </label>
        <label>
          <span>Catatan audit</span>
          <textarea
            required
            minLength={5}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>
        {error && <div className="error-box">{error}</div>}
        <button className="primary">Terapkan adjustment</button>
      </form>
    </Modal>
  )
}

export function StockHistory({
  product,
  session,
  onClose,
}: {
  product: ProductDto
  session: EntrySession
  onClose: () => void
}) {
  const [rows, setRows] = useState<StockHistoryRow[]>([])
  useEffect(() => {
    void getStockHistory(session, product.id_product).then(setRows)
  }, [product.id_product, session])
  return (
    <Modal title={`Riwayat stok · ${product.name}`} onClose={onClose}>
      <div className="history-list">
        {rows.map((row) => (
          <div key={row.id_stock_history}>
            <i className={row.quantity >= 0 ? "plus" : "minus"}>
              {row.quantity > 0 ? "+" : ""}
              {row.quantity}
            </i>
            <span>
              <strong>{row.movement_type}</strong>
              <small>{row.notes || "Tanpa catatan"}</small>
            </span>
            <time>{new Date(row.date).toLocaleString("id-ID")}</time>
          </div>
        ))}
        {!rows.length && <p className="empty">Belum ada movement untuk produk ini.</p>}
      </div>
    </Modal>
  )
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <header>
          <h2>{title}</h2>
          <button onClick={onClose}>Tutup</button>
        </header>
        {children}
      </section>
    </div>
  )
}

type StockHistoryRow = {
  id_stock_history: string
  movement_type: string
  quantity: number
  notes: string | null
  date: string
}
