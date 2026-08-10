import { useState } from "react"
import { IconArrowLeft, IconBan, IconBuildingBank, IconCash, IconCheck, IconDeviceMobile, IconDeviceTablet, IconDownload, IconHistory, IconLock, IconPrinter, IconRefresh } from "@tabler/icons-react"
import { useLiveQuery } from "dexie-react-hooks"
import { Link, useParams } from "react-router-dom"
import { toast } from "sonner"

import { SettlementBadge, SyncBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { db } from "@/lib/db"
import { formatCurrency, formatTransactionDate, paymentLabels, shortDeviceId } from "@/lib/format"
import { retryTransaction } from "@/lib/sync-engine"
import { voidProvisionalTransaction } from "@/lib/transaction-actions"
import { cn } from "@/lib/utils"
import { usePosStore } from "@/stores/pos-store"

export function TransactionDetailPage() {
  const { id } = useParams()
  const transaction = useLiveQuery(() => id ? db.transactions.get(id) : undefined, [id])
  const connection = usePosStore((state) => state.connection)
  const [voidOpen, setVoidOpen] = useState(false)

  if (transaction === undefined) return <div className="grid min-h-96 place-items-center text-xs text-muted-foreground">Membuka transaksi lokal…</div>
  if (!transaction) return <div className="grid min-h-96 place-items-center text-center"><div><p className="text-sm font-medium">Transaksi tidak ditemukan</p><Link to="/transactions"><Button variant="link">Kembali ke transaksi</Button></Link></div></div>
  const transactionId = transaction.id

  const PaymentIcon = transaction.paymentMethod === "CASH" ? IconCash : transaction.paymentMethod === "STATIC_QRIS" ? IconDeviceMobile : IconBuildingBank
  const events = [
    { label: "Dibuat di perangkat", description: `${formatTransactionDate(transaction.createdAt)} · ${transaction.operatorName}`, done: true },
    { label: "Dikonfirmasi kasir", description: `${paymentLabels[transaction.paymentMethod]} · ${transaction.paymentVerificationType === "OPERATOR_ASSERTED" ? "verifikasi operator" : "verifikasi sistem"}`, done: true },
    { label: "Disimpan ke local outbox", description: "Aman dari refresh dan restart browser", done: true },
    { label: "Diterima backend", description: transaction.receivedAtBackend ? formatTransactionDate(transaction.receivedAtBackend) : transaction.syncStatus === "FAILED" ? transaction.lastSyncError ?? "Retry diperlukan" : "Menunggu koneksi", done: transaction.settlementStatus === "SETTLED", failed: transaction.syncStatus === "FAILED" },
    { label: "Settled & immutable", description: transaction.settlementStatus === "SETTLED" ? "Histori terkunci; koreksi membuat record baru" : "Menunggu acceptance backend", done: transaction.settlementStatus === "SETTLED" },
  ]

  async function retry() {
    if (connection !== "ONLINE") {
      toast.error("Perangkat masih offline", { description: "Hubungkan jaringan sebelum mencoba kembali." })
      return
    }
    await retryTransaction(transactionId)
    toast.success("Transaksi berhasil disinkronkan", { description: "Backend menerima ID yang sama tanpa duplikasi." })
  }

  async function voidSale() {
    try {
      await voidProvisionalTransaction(transactionId)
      setVoidOpen(false)
      toast.success("Transaksi di-void", { description: "Void akan disinkronkan sebagai histori; stok lokal telah dikembalikan." })
    } catch (error) { toast.error(error instanceof Error ? error.message : "Void gagal") }
  }

  return (
    <div>
      <div className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3"><Link to="/transactions"><Button variant="outline" size="icon"><IconArrowLeft /></Button></Link><div><div className="flex flex-wrap items-center gap-2"><h1 className="text-lg font-semibold tracking-[-0.03em]">{transaction.invoiceNumber}</h1><SettlementBadge status={transaction.settlementStatus} /><SyncBadge status={transaction.syncStatus} /></div><p className="mt-1 text-[11px] text-muted-foreground">{formatTransactionDate(transaction.createdAt)} · Kedai Nusa / Blok M</p></div></div>
        <div className="flex gap-2"><Button variant="outline"><IconPrinter /> Cetak</Button><Button variant="outline"><IconDownload /> Unduh</Button>{transaction.settlementStatus === "PROVISIONAL" && transaction.transactionStatus !== "VOIDED" && <Button variant="destructive" onClick={() => setVoidOpen(true)}><IconBan /> Void</Button>}{transaction.syncStatus === "FAILED" && <Button onClick={retry}><IconRefresh /> Retry sync</Button>}</div>
      </div>

      <div className="grid gap-4 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid content-start gap-4">
          <Card>
            <CardHeader><CardTitle>Rincian pembelian</CardTitle></CardHeader>
            <CardContent className="grid gap-3">{transaction.items.map((item) => <div key={item.productId} className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-md bg-secondary text-muted-foreground"><IconCheck className="size-4" /></div><div className="min-w-0 flex-1"><div className="text-xs font-medium">{item.name}</div><div className="mt-0.5 text-[10px] text-muted-foreground">{item.quantity} × {formatCurrency(item.unitPrice)}</div></div><div className="text-xs font-semibold tabular-nums">{formatCurrency(item.subtotal)}</div></div>)}<Separator /><div className="grid gap-2 text-xs"><div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatCurrency(transaction.subtotal)}</span></div><div className="flex justify-between text-muted-foreground"><span>Diskon</span><span>{transaction.discount ? `-${formatCurrency(transaction.discount)}` : "—"}</span></div><div className="flex items-end justify-between pt-1"><strong>Total</strong><strong className="text-xl tabular-nums">{formatCurrency(transaction.total)}</strong></div></div></CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Pembayaran</CardTitle></CardHeader>
            <CardContent className="grid gap-3"><div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary"><PaymentIcon className="size-4" /></div><div className="flex-1"><div className="text-xs font-medium">{paymentLabels[transaction.paymentMethod]}</div><div className="mt-0.5 text-[10px] text-muted-foreground">{transaction.paymentVerificationType === "OPERATOR_ASSERTED" ? "Dikonfirmasi operator dari sinyal eksternal" : "Tidak memerlukan provider eksternal"}</div></div></div>{transaction.paymentReference && <div className="flex justify-between rounded-md bg-secondary p-2.5 text-xs"><span className="text-muted-foreground">Referensi</span><span>{transaction.paymentReference}</span></div>}{transaction.amountReceived && <div className="grid grid-cols-2 gap-2"><div className="rounded-md bg-secondary p-2.5"><div className="text-[9px] text-muted-foreground">Diterima</div><div className="mt-1 text-xs font-semibold">{formatCurrency(transaction.amountReceived)}</div></div><div className="rounded-md bg-secondary p-2.5"><div className="text-[9px] text-muted-foreground">Kembalian</div><div className="mt-1 text-xs font-semibold text-emerald-400">{formatCurrency(transaction.change ?? 0)}</div></div></div>}</CardContent>
          </Card>

          <div className={cn("flex items-start gap-3 rounded-lg border p-3", transaction.settlementStatus === "SETTLED" ? "border-emerald-500/15 bg-emerald-500/5" : "border-amber-500/15 bg-amber-500/5")}><IconLock className={cn("mt-0.5 size-4 shrink-0", transaction.settlementStatus === "SETTLED" ? "text-emerald-400" : "text-amber-300")} /><div><div className="text-xs font-semibold">{transaction.settlementStatus === "SETTLED" ? "Transaksi immutable" : "Masih provisional"}</div><p className="mt-1 text-[10px] leading-4 text-muted-foreground">{transaction.settlementStatus === "SETTLED" ? "Operator tidak dapat mengubah transaksi yang sudah settled. Koreksi hanya dapat dibuat admin sebagai record audit baru." : "Transaksi aman di perangkat, tetapi belum menjadi histori final sampai backend menerimanya."}</p></div></div>
        </div>

        <div className="grid content-start gap-4">
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><IconHistory className="size-4 text-primary" /> Lifecycle</CardTitle></CardHeader><CardContent><div className="relative grid gap-0">{events.map((event, index) => <div key={event.label} className="relative grid grid-cols-[20px_1fr] gap-2 pb-5 last:pb-0">{index < events.length - 1 && <div className="absolute left-[7px] top-3 h-full w-px bg-border" />}<div className={cn("relative z-10 mt-0.5 size-[15px] rounded-full border-2 border-card", event.failed ? "bg-red-400" : event.done ? "bg-emerald-400" : "bg-zinc-600")} /><div><div className={cn("text-xs font-medium", !event.done && !event.failed && "text-muted-foreground")}>{event.label}</div><div className="mt-0.5 text-[10px] leading-4 text-muted-foreground">{event.description}</div></div></div>)}</div></CardContent></Card>
          <Card><CardHeader><CardTitle>Device & audit</CardTitle></CardHeader><CardContent className="grid gap-2 text-xs"><div className="flex justify-between"><span className="text-muted-foreground">Operator</span><span>{transaction.operatorName} · {transaction.operatorId}</span></div><Separator /><div className="flex justify-between"><span className="text-muted-foreground">Device ID</span><span className="font-mono text-[10px]">{shortDeviceId(transaction.deviceId)}</span></div><Separator /><div className="flex justify-between"><span className="text-muted-foreground">Retry</span><span>{transaction.retryCount}×</span></div><div className="mt-1 flex items-start gap-2 rounded-md bg-secondary p-2 text-[10px] leading-4 text-muted-foreground"><IconDeviceTablet className="mt-0.5 size-3.5 shrink-0" />ID transaksi dibuat di device dan tidak berubah pada setiap retry.</div></CardContent></Card>
        </div>
      </div>
      <Dialog open={voidOpen} onOpenChange={setVoidOpen}><DialogContent><DialogHeader><DialogTitle>Void transaksi provisional?</DialogTitle><DialogDescription>Item akan dikembalikan ke proyeksi stok lokal. Record void tetap disinkronkan agar audit history tidak hilang.</DialogDescription></DialogHeader><div className="rounded-md bg-secondary p-3 text-xs"><div className="flex justify-between"><span>{transaction.invoiceNumber}</span><strong>{formatCurrency(transaction.total)}</strong></div></div><DialogFooter><Button variant="outline" onClick={() => setVoidOpen(false)}>Batal</Button><Button variant="destructive" onClick={voidSale}>Ya, void transaksi</Button></DialogFooter></DialogContent></Dialog>
    </div>
  )
}
