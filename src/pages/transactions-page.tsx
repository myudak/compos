import { useMemo, useState } from "react"
import { IconArrowRight, IconCloudCheck, IconClock, IconFilter, IconReceipt2, IconSearch } from "@tabler/icons-react"
import { useLiveQuery } from "dexie-react-hooks"
import { Link } from "react-router-dom"

import { PageHeader } from "@/components/page-header"
import { SettlementBadge, SyncBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { db } from "@/lib/db"
import { formatCurrency, formatTransactionDate, paymentLabels } from "@/lib/format"
import type { LocalTransaction } from "@/lib/types"
import { cn } from "@/lib/utils"

type Filter = "ALL" | "PENDING" | "SYNCED" | "FAILED"

const filters: { value: Filter; label: string }[] = [
  { value: "ALL", label: "Semua" },
  { value: "PENDING", label: "Pending Sync" },
  { value: "SYNCED", label: "Settled" },
  { value: "FAILED", label: "Gagal" },
]

function matchesFilter(transaction: LocalTransaction, filter: Filter) {
  if (filter === "PENDING") return transaction.syncStatus === "LOCAL_ONLY" || transaction.syncStatus === "SYNCING"
  if (filter === "SYNCED") return transaction.syncStatus === "SYNCED"
  if (filter === "FAILED") return transaction.syncStatus === "FAILED"
  return true
}

export function TransactionsPage() {
  const transactions = useLiveQuery(() => db.transactions.orderBy("createdAt").reverse().toArray(), [], [])
  const [filter, setFilter] = useState<Filter>("ALL")
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => transactions.filter((transaction) => matchesFilter(transaction, filter) && `${transaction.invoiceNumber} ${transaction.total} ${paymentLabels[transaction.paymentMethod]}`.toLowerCase().includes(query.toLowerCase())), [transactions, filter, query])
  const total = transactions.reduce((sum, transaction) => sum + transaction.total, 0)
  const provisional = transactions.filter((transaction) => transaction.settlementStatus === "PROVISIONAL").length

  return (
    <div>
      <PageHeader eyebrow="Local transaction ledger" title="Transaksi" description="Semua penjualan dari perangkat ini. Status sync dan settlement selalu terlihat—termasuk saat offline." actions={<Button variant="outline"><IconFilter /> Export shift</Button>} />

      <div className="grid gap-px border-b bg-border sm:grid-cols-3">
        <div className="bg-background px-4 py-3 sm:px-6"><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Nilai transaksi</div><div className="mt-1 text-lg font-semibold tabular-nums">{formatCurrency(total)}</div></div>
        <div className="bg-background px-4 py-3 sm:px-6"><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Settled</div><div className="mt-1 flex items-center gap-2 text-lg font-semibold"><IconCloudCheck className="size-4 text-emerald-400" /> {transactions.length - provisional}</div></div>
        <div className="bg-background px-4 py-3 sm:px-6"><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Perlu perhatian</div><div className={cn("mt-1 flex items-center gap-2 text-lg font-semibold", provisional > 0 && "text-amber-300")}><IconClock className="size-4" /> {provisional}</div></div>
      </div>

      <div className="flex flex-col gap-2 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex gap-1 overflow-x-auto">{filters.map((item) => <Button key={item.value} size="sm" variant={filter === item.value ? "secondary" : "ghost"} onClick={() => setFilter(item.value)}>{item.label}{item.value !== "ALL" && <span className="ml-1 rounded bg-background px-1 text-[9px] text-muted-foreground">{transactions.filter((transaction) => matchesFilter(transaction, item.value)).length}</span>}</Button>)}</div>
        <div className="relative w-full sm:w-64"><IconSearch className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" /><Input className="pl-8" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari invoice, metode, jumlah…" /></div>
      </div>

      <div className="hidden overflow-x-auto p-4 sm:block sm:p-6">
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-left text-xs">
            <thead className="bg-secondary/60 text-[9px] uppercase tracking-[0.12em] text-muted-foreground"><tr><th className="px-3 py-2.5 font-medium">Invoice</th><th className="px-3 py-2.5 font-medium">Waktu</th><th className="px-3 py-2.5 font-medium">Pembayaran</th><th className="px-3 py-2.5 font-medium">Status</th><th className="px-3 py-2.5 text-right font-medium">Total</th><th className="w-10" /></tr></thead>
            <tbody className="divide-y divide-border">{filtered.map((transaction) => <tr key={transaction.id} className="group bg-card/40 transition-colors hover:bg-accent/60"><td className="px-3 py-3"><div className="font-semibold">{transaction.invoiceNumber}</div><div className="mt-0.5 text-[10px] text-muted-foreground">{transaction.items.length} jenis · {transaction.items.reduce((sum, item) => sum + item.quantity, 0)} item</div></td><td className="px-3 py-3 text-muted-foreground">{formatTransactionDate(transaction.createdAt)}</td><td className="px-3 py-3"><div>{paymentLabels[transaction.paymentMethod]}</div><div className="mt-0.5 text-[9px] text-muted-foreground">{transaction.paymentVerificationType === "OPERATOR_ASSERTED" ? "Operator asserted" : "System verifiable"}</div></td><td className="px-3 py-3"><div className="flex flex-wrap gap-1"><SettlementBadge status={transaction.settlementStatus} /><SyncBadge status={transaction.syncStatus} /></div></td><td className="px-3 py-3 text-right font-semibold tabular-nums">{formatCurrency(transaction.total)}</td><td><Link to={`/transactions/${transaction.id}`} className="grid size-8 place-items-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground"><IconArrowRight className="size-4" /></Link></td></tr>)}</tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-2 p-4 sm:hidden">{filtered.map((transaction) => <Link key={transaction.id} to={`/transactions/${transaction.id}`}><Card className="grid gap-3 p-3 active:bg-accent"><div className="flex items-start justify-between gap-2"><div><div className="text-xs font-semibold">{transaction.invoiceNumber}</div><div className="mt-0.5 text-[10px] text-muted-foreground">{formatTransactionDate(transaction.createdAt)}</div></div><strong className="text-sm tabular-nums">{formatCurrency(transaction.total)}</strong></div><div className="flex items-center justify-between"><span className="text-[10px] text-muted-foreground">{paymentLabels[transaction.paymentMethod]} · {transaction.items.length} jenis</span><div className="flex gap-1"><SettlementBadge status={transaction.settlementStatus} /><SyncBadge status={transaction.syncStatus} /></div></div></Card></Link>)}</div>

      {filtered.length === 0 && <div className="grid min-h-80 place-items-center text-center"><div><IconReceipt2 className="mx-auto mb-2 size-7 text-muted-foreground" /><p className="text-sm font-medium">Tidak ada transaksi</p><p className="mt-1 text-xs text-muted-foreground">Coba ubah filter atau kata pencarian.</p></div></div>}
    </div>
  )
}
