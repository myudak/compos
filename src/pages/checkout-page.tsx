import { useMemo, useState } from "react"
import { IconCash, IconCheck, IconChevronRight, IconCoffee, IconDeviceMobile, IconGlass, IconMinus, IconPlus, IconReceipt2, IconSearch, IconShoppingBag, IconTrash, IconWifiOff } from "@tabler/icons-react"
import { useLiveQuery } from "dexie-react-hooks"
import { QRCodeSVG } from "qrcode.react"
import { toast } from "sonner"

import { SettlementBadge, SyncBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { db, DEVICE_ID, MERCHANT_ID, OPERATOR_ID } from "@/lib/db"
import { formatCurrency, paymentLabels } from "@/lib/format"
import { processOutbox } from "@/lib/sync-engine"
import type { LocalTransaction, PaymentMethod, Product } from "@/lib/types"
import { cn } from "@/lib/utils"
import { usePosStore } from "@/stores/pos-store"

const categories = ["Semua", "Kopi", "Non Kopi", "Makanan"] as const

function ProductMark({ product }: { product: Product }) {
  const Icon = product.category === "Kopi" ? IconCoffee : product.category === "Makanan" ? IconShoppingBag : IconGlass
  return (
    <div className="relative grid h-20 place-items-center overflow-hidden rounded-md border" style={{ background: `linear-gradient(145deg, color-mix(in srgb, ${product.accent} 16%, #18181b), #151517)` }}>
      <div className="absolute -right-5 -top-6 size-20 rounded-full opacity-30 blur-xl" style={{ background: product.accent }} />
      <div className="absolute bottom-2 left-2 text-[9px] font-bold uppercase tracking-[0.2em] text-white/35">{product.sku}</div>
      <Icon className="relative z-10 size-8" style={{ color: product.accent }} stroke={1.5} />
      {product.featured && <span className="absolute right-2 top-2 rounded bg-white/8 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-white/70">Popular</span>}
    </div>
  )
}

function ProductCard({ product, quantity, onAdd }: { product: Product; quantity: number; onAdd: () => void }) {
  return (
    <button onClick={onAdd} className="group grid min-w-0 gap-2 rounded-lg border bg-card p-2 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-accent/55 hover:shadow-[0_10px_30px_-20px_var(--primary)] focus-visible:ring-[3px] focus-visible:ring-ring/35">
      <ProductMark product={product} />
      <div className="min-w-0 px-1 pb-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold tracking-[-0.015em]">{product.name}</div>
            <div className="mt-0.5 truncate text-[10px] text-muted-foreground">{product.description}</div>
          </div>
          {quantity > 0 && <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{quantity}</span>}
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs font-semibold tabular-nums">{formatCurrency(product.price)}</span>
          <span className={cn("text-[9px]", product.stock <= 5 ? "text-amber-300" : "text-muted-foreground")}>{product.stock <= 5 ? `Sisa ${product.stock}` : `${product.stock} ready`}</span>
        </div>
      </div>
    </button>
  )
}

function PaymentDialog({ open, onOpenChange, total, onConfirm }: { open: boolean; onOpenChange: (open: boolean) => void; total: number; onConfirm: (method: PaymentMethod, amountReceived?: number, reference?: string) => Promise<void> }) {
  const [method, setMethod] = useState<PaymentMethod>("CASH")
  const [cashReceived, setCashReceived] = useState(0)
  const [reference, setReference] = useState("")
  const [verified, setVerified] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const change = Math.max(0, cashReceived - total)
  const valid = method === "CASH" ? cashReceived >= total : verified

  async function submit() {
    if (!valid || submitting) return
    setSubmitting(true)
    await onConfirm(method, method === "CASH" ? cashReceived : undefined, reference || undefined)
    setSubmitting(false)
    setCashReceived(0)
    setReference("")
    setVerified(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-y-auto p-0 sm:max-w-xl">
        <DialogHeader className="border-b p-4">
          <DialogTitle>Selesaikan pembayaran</DialogTitle>
          <DialogDescription>Transaksi disimpan ke database perangkat sebelum mencoba jaringan.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 p-4">
          <div className="grid grid-cols-3 gap-2">
            {([
              ["CASH", "Tunai", IconCash],
              ["STATIC_QRIS", "QRIS", IconDeviceMobile],
              ["TRANSFER", "Transfer", IconReceipt2],
            ] as const).map(([value, label, Icon]) => (
              <button key={value} onClick={() => { setMethod(value); setVerified(false) }} className={cn("grid min-h-16 place-items-center gap-1 rounded-md border bg-card p-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent", method === value && "border-primary/45 bg-primary/8 text-primary ring-1 ring-primary/20")}>
                <Icon className="size-5" />{label}
              </button>
            ))}
          </div>

          {method === "CASH" && (
            <div className="grid gap-3 rounded-lg border bg-card p-3">
              <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">Total tagihan</span><strong className="text-lg tabular-nums">{formatCurrency(total)}</strong></div>
              <label className="grid gap-1.5"><span className="text-xs font-medium">Uang diterima</span><div className="relative"><span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Rp</span><Input autoFocus inputMode="numeric" value={cashReceived || ""} onChange={(event) => setCashReceived(Number(event.target.value.replace(/\D/g, "")))} className="h-10 pl-8 text-base font-semibold tabular-nums" placeholder="0" /></div></label>
              <div className="grid grid-cols-4 gap-1.5">
                {[total, Math.ceil(total / 50_000) * 50_000, 100_000, 200_000].filter((value, index, array) => array.indexOf(value) === index).slice(0, 4).map((value) => <Button key={value} variant="outline" size="sm" onClick={() => setCashReceived(value)}>{value === total ? "Uang pas" : `${value / 1000}k`}</Button>)}
              </div>
              <div className="flex items-center justify-between rounded-md bg-secondary p-2.5"><span className="text-xs text-muted-foreground">Kembalian</span><strong className={cn("tabular-nums", cashReceived >= total ? "text-emerald-400" : "text-muted-foreground")}>{formatCurrency(change)}</strong></div>
            </div>
          )}

          {method === "STATIC_QRIS" && (
            <div className="grid gap-3 rounded-lg border bg-card p-3 sm:grid-cols-[148px_1fr]">
              <div className="mx-auto rounded-lg bg-white p-3"><QRCodeSVG value="00020101021126660014ID.CO.QRIS.WWW011893600503000008791402150001952654159280303UMI51440014ID.CO.QRIS.WWW0215ID20253865321880303UMI5204549953033605802ID5910KEDAI NUSA6007JAKARTA6105121106304BEEF" size={124} fgColor="#09090b" bgColor="#ffffff" /></div>
              <div className="flex flex-col justify-center gap-2"><div><div className="text-xs font-semibold">QRIS statis · Kedai Nusa</div><p className="mt-1 text-[11px] leading-4 text-muted-foreground">Minta pelanggan scan, lalu cek notifikasi pembayaran di perangkat merchant.</p></div><Button variant={verified ? "default" : "outline"} onClick={() => setVerified((value) => !value)}><IconCheck /> {verified ? "Pembayaran terverifikasi" : "Saya sudah cek pembayaran"}</Button><p className="text-[10px] leading-4 text-amber-300/80">Dikonfirmasi operator, bukan diverifikasi payment gateway.</p></div>
            </div>
          )}

          {method === "TRANSFER" && (
            <div className="grid gap-3 rounded-lg border bg-card p-3">
              <div className="flex items-center justify-between rounded-md bg-secondary p-3"><div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">BCA · Kedai Nusa</div><div className="mt-1 text-base font-semibold tracking-wider tabular-nums">7130 881 204</div></div><Button variant="outline" size="sm" onClick={() => void navigator.clipboard?.writeText("7130881204")}>Salin</Button></div>
              <label className="grid gap-1.5"><span className="text-xs font-medium">Referensi / catatan <span className="text-muted-foreground">(opsional)</span></span><Input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Contoh: BCA ••4821" /></label>
              <Button variant={verified ? "default" : "outline"} onClick={() => setVerified((value) => !value)}><IconCheck /> {verified ? "Transfer terverifikasi" : "Saya sudah cek mutasi/notifikasi"}</Button>
              <p className="text-[10px] leading-4 text-amber-300/80">Bukti diverifikasi secara eksternal oleh operator dan dapat direkonsiliasi kemudian.</p>
            </div>
          )}
        </div>
        <DialogFooter className="border-t bg-secondary/25 p-4 sm:items-center sm:justify-between">
          <div className="text-left"><div className="text-[10px] text-muted-foreground">Total dibayar</div><div className="text-lg font-semibold tabular-nums">{formatCurrency(total)}</div></div>
          <Button size="lg" disabled={!valid || submitting} onClick={submit} className="min-w-40">{submitting ? "Menyimpan…" : "Konfirmasi penjualan"}<IconChevronRight /></Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ReceiptDialog({ transaction, onClose }: { transaction: LocalTransaction | null; onClose: () => void }) {
  const liveTransaction = useLiveQuery(() => transaction ? db.transactions.get(transaction.id) : undefined, [transaction?.id])
  const current = liveTransaction ?? transaction
  if (!current) return null
  return (
    <Dialog open={Boolean(current)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="p-0 sm:max-w-md">
        <div className="border-b bg-emerald-500/6 p-5 text-center">
          <div className="mx-auto mb-3 grid size-10 place-items-center rounded-full bg-emerald-500/15 text-emerald-400"><IconCheck className="size-5" /></div>
          <DialogTitle>{current.settlementStatus === "SETTLED" ? "Penjualan settled" : "Provisional tersimpan"}</DialogTitle>
          <DialogDescription className="mt-1">{current.settlementStatus === "SETTLED" ? "Backend sudah menerima transaksi tanpa duplikasi." : "Aman di perangkat ini — checkout tidak menunggu jaringan."}</DialogDescription>
        </div>
        <div className="grid gap-3 p-4">
          <div className="flex items-center justify-between"><div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Invoice</div><div className="text-sm font-semibold">{current.invoiceNumber}</div></div><div className="flex gap-1.5"><SettlementBadge status={current.settlementStatus} /><SyncBadge status={current.syncStatus} /></div></div>
          <Separator />
          <div className="grid gap-2">{current.items.map((item) => <div key={item.productId} className="flex justify-between text-xs"><span className="text-muted-foreground">{item.quantity}× {item.name}</span><span className="tabular-nums">{formatCurrency(item.subtotal)}</span></div>)}</div>
          <Separator />
          <div className="flex items-center justify-between"><div><div className="text-[10px] text-muted-foreground">{paymentLabels[current.paymentMethod]}</div><strong className="text-base">Total</strong></div><strong className="text-xl tabular-nums">{formatCurrency(current.total)}</strong></div>
          <div className={cn("flex items-start gap-2 rounded-md border p-2.5 text-[10px] leading-4", current.settlementStatus === "SETTLED" ? "border-emerald-500/15 bg-emerald-500/7 text-emerald-200" : "border-amber-500/15 bg-amber-500/7 text-amber-200")}><IconWifiOff className="mt-0.5 size-3.5 shrink-0" /><span>{current.settlementStatus === "SETTLED" ? <><strong>Settled.</strong> Histori ini sekarang immutable; koreksi dibuat sebagai record baru.</> : <><strong>Provisional</strong> sampai backend menerima transaksi. ID yang sama akan dipakai saat retry agar tidak duplikat.</>}</span></div>
        </div>
        <DialogFooter className="border-t p-4"><Button variant="outline" onClick={() => window.print()}>Cetak struk</Button><Button onClick={onClose}>Transaksi baru</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function CheckoutPage() {
  const products = useLiveQuery(() => db.products.toArray(), [], [])
  const transactions = useLiveQuery(() => db.transactions.orderBy("createdAt").reverse().toArray(), [], [])
  const { cart, addItem, decrementItem, removeItem, clearCart, connection } = usePosStore()
  const [category, setCategory] = useState<(typeof categories)[number]>("Semua")
  const [query, setQuery] = useState("")
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [receipt, setReceipt] = useState<LocalTransaction | null>(null)

  const cartItems = useMemo(() => products.filter((product) => cart[product.id]).map((product) => ({ product, quantity: cart[product.id] })), [products, cart])
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const filtered = products.filter((product) => (category === "Semua" || product.category === category) && `${product.name} ${product.sku}`.toLowerCase().includes(query.toLowerCase()))
  const todaySales = transactions.filter((transaction) => new Date(transaction.createdAt).toDateString() === new Date().toDateString()).reduce((sum, transaction) => sum + transaction.total, 0)
  const provisional = transactions.filter((transaction) => transaction.settlementStatus === "PROVISIONAL").length

  async function confirmSale(method: PaymentMethod, amountReceived?: number, reference?: string) {
    const id = crypto.randomUUID()
    const createdAt = new Date().toISOString()
    const transaction: LocalTransaction = {
      id,
      invoiceNumber: `OPS-${Date.now().toString(36).slice(-6).toUpperCase()}`,
      merchantId: MERCHANT_ID,
      deviceId: DEVICE_ID,
      operatorId: OPERATOR_ID,
      operatorName: "Rani",
      items: cartItems.map(({ product, quantity }) => ({ productId: product.id, name: product.name, quantity, unitPrice: product.price, subtotal: product.price * quantity })),
      subtotal,
      discount: 0,
      total: subtotal,
      paymentMethod: method,
      paymentVerificationType: method === "CASH" ? "SYSTEM_VERIFIABLE" : "OPERATOR_ASSERTED",
      paymentReference: reference,
      amountReceived,
      change: amountReceived ? amountReceived - subtotal : undefined,
      transactionStatus: "CONFIRMED",
      syncStatus: "LOCAL_ONLY",
      settlementStatus: "PROVISIONAL",
      createdAt,
      retryCount: 0,
    }

    await db.transaction("rw", [db.transactions, db.outbox, db.products], async () => {
      await db.transactions.add(transaction)
      await db.outbox.add({ id: `outbox-${id}`, transactionId: id, operation: "UPSERT_TRANSACTION", payloadVersion: 1, status: "PENDING", retryCount: 0, createdAt })
      for (const { product, quantity } of cartItems) {
        await db.products.update(product.id, { stock: product.stock - quantity })
      }
    })

    setPaymentOpen(false)
    setReceipt(transaction)
    clearCart()
    toast.success("Tersimpan di perangkat", { description: connection === "ONLINE" ? "Sedang dikirim ke server di background." : "Akan sync otomatis saat koneksi kembali." })
    if (connection === "ONLINE") void processOutbox()
  }

  return (
    <div className="grid min-h-[calc(100svh-62px)] xl:grid-cols-[minmax(0,1fr)_370px]">
      <section className="min-w-0 border-r xl:border-r">
        <div className="border-b px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Shift 02 · Senin, 10 Agustus</p><h1 className="text-xl font-semibold tracking-[-0.04em] sm:text-2xl">Selamat sore, Rani.</h1><p className="mt-1 text-xs text-muted-foreground">Pilih produk untuk mulai transaksi baru.</p></div>
            <div className="grid grid-cols-3 gap-px overflow-hidden rounded-md border bg-border text-right">
              <div className="bg-card px-3 py-2"><div className="text-[9px] uppercase tracking-wider text-muted-foreground">Sales hari ini</div><div className="mt-1 text-xs font-semibold tabular-nums">{formatCurrency(todaySales, true)}</div></div>
              <div className="bg-card px-3 py-2"><div className="text-[9px] uppercase tracking-wider text-muted-foreground">Transaksi</div><div className="mt-1 text-xs font-semibold tabular-nums">{transactions.length}</div></div>
              <div className="bg-card px-3 py-2"><div className="text-[9px] uppercase tracking-wider text-muted-foreground">Provisional</div><div className={cn("mt-1 text-xs font-semibold tabular-nums", provisional > 0 && "text-amber-300")}>{provisional}</div></div>
            </div>
          </div>
        </div>

        <div className="sticky top-[62px] z-10 flex flex-col gap-2 border-b bg-background/88 px-4 py-3 backdrop-blur-xl sm:flex-row sm:items-center sm:px-6">
          <div className="relative min-w-0 flex-1"><IconSearch className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} className="pl-8" placeholder="Cari produk atau SKU…" /></div>
          <div className="flex gap-1 overflow-x-auto">{categories.map((item) => <Button key={item} variant={category === item ? "secondary" : "ghost"} size="sm" onClick={() => setCategory(item)}>{item}</Button>)}</div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 p-4 sm:grid-cols-3 sm:p-6 2xl:grid-cols-4">
          {filtered.map((product) => <ProductCard key={product.id} product={product} quantity={cart[product.id] ?? 0} onAdd={() => addItem(product.id)} />)}
          {filtered.length === 0 && <div className="col-span-full grid min-h-60 place-items-center rounded-lg border border-dashed text-center"><div><IconSearch className="mx-auto mb-2 size-6 text-muted-foreground" /><p className="text-sm font-medium">Produk tidak ditemukan</p><p className="mt-1 text-xs text-muted-foreground">Coba kata kunci atau kategori lain.</p></div></div>}
        </div>
      </section>

      <aside className="hidden min-h-0 bg-card/35 xl:flex xl:flex-col">
        <div className="flex items-center justify-between border-b px-4 py-3"><div><div className="text-sm font-semibold">Pesanan aktif</div><div className="text-[10px] text-muted-foreground">{totalItems ? `${totalItems} item` : "Belum ada item"}</div></div>{totalItems > 0 && <Button variant="ghost" size="sm" onClick={clearCart} className="text-muted-foreground"><IconTrash /> Kosongkan</Button>}</div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {cartItems.length === 0 ? <div className="grid h-full min-h-64 place-items-center text-center"><div><div className="mx-auto mb-3 grid size-11 place-items-center rounded-full border bg-background text-muted-foreground"><IconShoppingBag className="size-5" /></div><p className="text-xs font-medium">Keranjang masih kosong</p><p className="mt-1 max-w-52 text-[10px] leading-4 text-muted-foreground">Klik produk di katalog. Checkout tetap bisa dilakukan meski jaringan terputus.</p></div></div> : <div className="grid gap-2">{cartItems.map(({ product, quantity }) => <Card key={product.id} className="flex items-center gap-2 p-2.5"><div className="grid size-9 shrink-0 place-items-center rounded-md" style={{ background: `color-mix(in srgb, ${product.accent} 16%, #18181b)`, color: product.accent }}><IconCoffee className="size-4" /></div><div className="min-w-0 flex-1"><div className="truncate text-xs font-medium">{product.name}</div><div className="mt-0.5 text-[10px] text-muted-foreground tabular-nums">{formatCurrency(product.price)}</div></div><div className="flex items-center rounded-md border bg-background"><button onClick={() => decrementItem(product.id)} className="grid size-7 place-items-center text-muted-foreground hover:text-foreground"><IconMinus className="size-3" /></button><span className="w-5 text-center text-xs font-semibold tabular-nums">{quantity}</span><button onClick={() => addItem(product.id)} className="grid size-7 place-items-center text-muted-foreground hover:text-foreground"><IconPlus className="size-3" /></button></div><button onClick={() => removeItem(product.id)} className="sr-only">Hapus {product.name}</button></Card>)}</div>}
        </div>
        <div className="border-t bg-card p-4">
          <div className="grid gap-2 text-xs"><div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span className="tabular-nums">{formatCurrency(subtotal)}</span></div><div className="flex justify-between text-muted-foreground"><span>Diskon</span><span>—</span></div><Separator /><div className="flex items-end justify-between"><strong>Total</strong><strong className="text-2xl tracking-[-0.04em] tabular-nums">{formatCurrency(subtotal)}</strong></div></div>
          <Button size="lg" className="mt-4 w-full" disabled={cartItems.length === 0} onClick={() => setPaymentOpen(true)}>Bayar sekarang <IconChevronRight /></Button>
          <div className="mt-2 flex items-center justify-center gap-1.5 text-[9px] text-muted-foreground"><span className="size-1.5 rounded-full bg-emerald-400" /> Tersimpan lokal sebelum sync</div>
        </div>
      </aside>

      {totalItems > 0 && <div className="fixed inset-x-3 bottom-[72px] z-30 xl:hidden"><Button size="lg" className="h-12 w-full justify-between px-4 shadow-2xl" onClick={() => setPaymentOpen(true)}><span>{totalItems} item</span><span>{formatCurrency(subtotal)} · Bayar <IconChevronRight className="ml-1 inline size-4" /></span></Button></div>}

      <PaymentDialog open={paymentOpen} onOpenChange={setPaymentOpen} total={subtotal} onConfirm={confirmSale} />
      <ReceiptDialog transaction={receipt} onClose={() => setReceipt(null)} />
    </div>
  )
}
