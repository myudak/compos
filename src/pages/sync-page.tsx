import { IconAlertTriangle, IconArrowsExchange, IconBolt, IconCheck, IconCloudCheck, IconDatabase, IconRefresh, IconServer, IconShieldCheck, IconWifiOff } from "@tabler/icons-react"
import { useLiveQuery } from "dexie-react-hooks"
import { toast } from "sonner"

import { PageHeader } from "@/components/page-header"
import { ConnectionBadge, SyncBadge } from "@/components/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { db, getOrCreateDeviceIdentity } from "@/lib/db"
import { formatCurrency, formatTransactionDate, fromNow, shortDeviceId } from "@/lib/format"
import { processOutbox, retryTransaction } from "@/lib/sync-engine"
import { cn } from "@/lib/utils"
import { usePosStore } from "@/stores/pos-store"

export function SyncPage() {
  const connection = usePosStore((state) => state.connection)
  const outbox = useLiveQuery(() => db.outbox.orderBy("createdAt").toArray(), [], [])
  const transactions = useLiveQuery(() => db.transactions.toArray(), [], [])
  const attempts = useLiveQuery(() => db.syncAttempts.orderBy("createdAt").reverse().limit(8).toArray(), [], [])
  const lastSync = useLiveQuery(() => db.settings.get("lastSyncAt"), [])
  const device = useLiveQuery(() => getOrCreateDeviceIdentity(), [])
  const queueTransactions = outbox.map((entry) => ({ entry, transaction: transactions.find((transaction) => transaction.id === entry.transactionId) })).filter((item) => item.transaction)
  const failed = outbox.filter((entry) => entry.status === "FAILED").length

  async function retryAll() {
    if (connection !== "ONLINE") {
      toast.error("Tidak ada koneksi", { description: "Data tetap aman. Hubungkan perangkat lalu retry kembali." })
      return
    }
    const count = await processOutbox({ includeFailed: true })
    toast.success(`${count} transaksi berhasil disinkronkan`, { description: "Semua diproses dengan transaction ID yang sama." })
  }

  async function retryOne(transactionId: string) {
    if (connection !== "ONLINE") {
      toast.error("Perangkat masih offline")
      return
    }
    await retryTransaction(transactionId)
    toast.success("Sync berhasil")
  }

  return (
    <div>
      <PageHeader eyebrow="Observable & recoverable" title="Sync & Data" description="Lihat apa yang tersimpan lokal, apa yang sedang dikirim, dan apa yang sudah diterima backend." actions={<Button onClick={retryAll} disabled={outbox.length === 0 || connection !== "ONLINE"}><IconRefresh /> Retry semua ({outbox.length})</Button>} />

      <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-6 xl:grid-cols-4">
        <Card className="p-3"><div className="flex items-start justify-between"><div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Koneksi</div><div className="mt-2"><ConnectionBadge state={connection} /></div></div><IconArrowsExchange className="size-5 text-primary" /></div><p className="mt-3 text-[10px] leading-4 text-muted-foreground">Browser signal + request aktual menentukan konektivitas.</p></Card>
        <Card className="p-3"><div className="flex items-start justify-between"><div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Pending outbox</div><div className="mt-1 text-2xl font-semibold tabular-nums">{outbox.length}</div></div><IconDatabase className={cn("size-5", outbox.length ? "text-amber-300" : "text-emerald-400")} /></div><Progress value={outbox.length ? Math.max(12, 100 - outbox.length * 18) : 100} className="mt-3" /></Card>
        <Card className="p-3"><div className="flex items-start justify-between"><div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Terakhir berhasil</div><div className="mt-1 text-sm font-semibold">{fromNow(lastSync?.value)}</div></div><IconCloudCheck className="size-5 text-emerald-400" /></div><p className="mt-3 text-[10px] text-muted-foreground">Batch size maksimal 25 transaksi.</p></Card>
        <Card className="p-3"><div className="flex items-start justify-between"><div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Perlu perhatian</div><div className={cn("mt-1 text-2xl font-semibold tabular-nums", failed > 0 && "text-red-400")}>{failed}</div></div><IconAlertTriangle className={cn("size-5", failed > 0 ? "text-red-400" : "text-muted-foreground")} /></div><p className="mt-3 text-[10px] text-muted-foreground">Permanent errors tidak di-retry tanpa batas.</p></Card>
      </div>

      <div className="grid gap-4 px-4 pb-6 sm:px-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader className="flex-row items-center justify-between"><div><CardTitle>Local outbox</CardTitle><p className="mt-1 text-[10px] text-muted-foreground">Urutan transaksi yang menunggu acceptance backend.</p></div><Badge variant={outbox.length ? "warning" : "success"}>{outbox.length ? `${outbox.length} antre` : "Semua bersih"}</Badge></CardHeader>
          <CardContent className="p-0">
            {queueTransactions.length === 0 ? <div className="grid min-h-56 place-items-center text-center"><div><div className="mx-auto mb-2 grid size-10 place-items-center rounded-full bg-emerald-500/10 text-emerald-400"><IconCheck className="size-5" /></div><p className="text-xs font-medium">Semua data sudah settled</p><p className="mt-1 text-[10px] text-muted-foreground">Tidak ada transaksi di local outbox.</p></div></div> : <div className="divide-y divide-border">{queueTransactions.map(({ entry, transaction }) => transaction && <div key={entry.id} className="grid gap-3 p-3 sm:grid-cols-[1fr_auto] sm:items-center"><div className="flex min-w-0 items-center gap-3"><div className={cn("grid size-9 shrink-0 place-items-center rounded-md", entry.status === "FAILED" ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-300")}><IconDatabase className="size-4" /></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold">{transaction.invoiceNumber}</span><SyncBadge status={transaction.syncStatus} /></div><div className="mt-1 text-[10px] text-muted-foreground">{formatTransactionDate(transaction.createdAt)} · {formatCurrency(transaction.total)} · retry {entry.retryCount}×</div>{entry.lastError && <div className="mt-1 truncate text-[10px] text-red-400">{entry.lastError}</div>}</div></div><Button variant={entry.status === "FAILED" ? "default" : "outline"} size="sm" onClick={() => retryOne(transaction.id)} disabled={connection !== "ONLINE"}><IconRefresh /> Retry</Button></div>)}</div>}
          </CardContent>
        </Card>

        <div className="grid content-start gap-4">
          <Card><CardHeader><CardTitle>Lifecycle protocol</CardTitle></CardHeader><CardContent><div className="grid grid-cols-[auto_1fr] gap-x-3">{[
            ["01", "Local write", "IndexedDB commit dahulu"],
            ["02", "Outbox", "Stable transaction ID"],
            ["03", "Batch sync", "Retry + exponential backoff"],
            ["04", "Settled", "Accepted / already processed"],
          ].map(([index, title, copy], row) => <div key={index} className="contents"><div className="relative flex flex-col items-center"><div className="grid size-6 place-items-center rounded-full border bg-secondary text-[9px] font-bold text-primary">{index}</div>{row < 3 && <div className="h-full w-px bg-border" />}</div><div className="pb-4"><div className="text-xs font-medium">{title}</div><div className="mt-0.5 text-[10px] leading-4 text-muted-foreground">{copy}</div></div></div>)}</div></CardContent></Card>
          <Card><CardHeader><CardTitle>Device diagnostics</CardTitle></CardHeader><CardContent className="grid gap-2 text-xs"><div className="flex justify-between"><span className="text-muted-foreground">Device</span><span className="font-mono text-[10px]">{device ? shortDeviceId(device.id) : "Memuat…"}</span></div><Separator /><div className="flex justify-between"><span className="text-muted-foreground">Local DB</span><span className="text-emerald-400">Healthy</span></div><Separator /><div className="flex justify-between"><span className="text-muted-foreground">Payload version</span><span>v1</span></div><Separator /><div className="flex justify-between"><span className="text-muted-foreground">Queue policy</span><span>25 / batch</span></div><div className="mt-1 flex items-start gap-2 rounded-md bg-secondary p-2 text-[10px] leading-4 text-muted-foreground"><IconShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" />Transaksi settled bersifat immutable; koreksi selalu append-only.</div></CardContent></Card>
        </div>
      </div>

      <div className="mx-4 mb-6 overflow-hidden rounded-lg border sm:mx-6">
        <div className="flex items-center justify-between border-b bg-card px-3 py-2.5"><div><div className="text-xs font-semibold">Aktivitas sync terbaru</div><div className="mt-0.5 text-[10px] text-muted-foreground">Acceptance result dari simulator backend idempotent.</div></div><IconServer className="size-4 text-muted-foreground" /></div>
        {attempts.length === 0 ? <div className="p-6 text-center text-[10px] text-muted-foreground">Belum ada aktivitas pada sesi ini.</div> : <div className="divide-y divide-border">{attempts.map((attempt) => <div key={attempt.id} className="grid grid-cols-[1fr_auto] gap-2 px-3 py-2.5 text-xs"><div className="flex items-center gap-2"><IconBolt className="size-3.5 text-primary" /><div><div className="font-medium">{attempt.invoiceNumber}</div><div className="mt-0.5 text-[9px] text-muted-foreground">{formatTransactionDate(attempt.createdAt)} · {attempt.durationMs} ms</div></div></div><Badge variant="success">{attempt.result}</Badge></div>)}</div>}
      </div>

      {connection === "OFFLINE" && <div className="fixed bottom-20 right-4 z-30 flex max-w-xs items-start gap-2 rounded-lg border border-amber-500/20 bg-popover p-3 shadow-2xl lg:bottom-4"><IconWifiOff className="mt-0.5 size-4 shrink-0 text-amber-300" /><div><div className="text-xs font-semibold">Sync dijeda</div><div className="mt-0.5 text-[10px] leading-4 text-muted-foreground">Checkout dan local outbox tetap aktif.</div></div></div>}
    </div>
  )
}
