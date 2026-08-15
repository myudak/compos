import { useEffect, useMemo, useState } from "react"
import {
  IconAlertTriangle,
  IconArrowDownRight,
  IconCheck,
  IconClipboardCheck,
  IconHistory,
  IconRefresh,
  IconScale,
  IconShieldLock,
} from "@tabler/icons-react"
import { toast } from "sonner"

import { PageHeader } from "@/shared/ui/page-header"
import { Badge } from "@/shared/ui/components/badge"
import { Button } from "@/shared/ui/components/button"
import { Card } from "@/shared/ui/components/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/components/dialog"
import { Input } from "@/shared/ui/components/input"
import {
  createCorrection,
  fetchBackendTransactions,
  fetchCorrections,
  fetchInventoryDiscrepancies,
  resolveInventoryDiscrepancy,
  type BackendTransaction,
  type CorrectionRecord,
  type InventoryDiscrepancy,
} from "@/infrastructure/api/api-client"
import { getAuthSession } from "@/infrastructure/persistence/session-repository"
import type { AuthSession } from "@/infrastructure/persistence/models"
import { formatCurrency, formatTransactionDate, paymentLabels } from "@/shared/lib/format"
import { cn } from "@/shared/lib/utils"

type Desk = "PAYMENTS" | "INVENTORY" | "AUDIT"

export function ReconciliationPage() {
  const [desk, setDesk] = useState<Desk>("PAYMENTS")
  const [session, setSession] = useState<AuthSession | null>(null)
  const [transactions, setTransactions] = useState<BackendTransaction[]>([])
  const [corrections, setCorrections] = useState<CorrectionRecord[]>([])
  const [discrepancies, setDiscrepancies] = useState<InventoryDiscrepancy[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTransaction, setSelectedTransaction] = useState<BackendTransaction | null>(null)
  const [selectedDiscrepancy, setSelectedDiscrepancy] = useState<InventoryDiscrepancy | null>(null)
  const [reason, setReason] = useState("")
  const [adjustment, setAdjustment] = useState(0)
  const [evidence, setEvidence] = useState("")
  const [resolution, setResolution] = useState("")
  const [adjustedStock, setAdjustedStock] = useState<number | undefined>()

  async function refresh() {
    setLoading(true)
    try {
      const activeSession = await getAuthSession()
      if (!activeSession || activeSession.operator.role !== "ADMIN")
        throw new Error("Admin session required")
      setSession(activeSession)
      const [transactionData, correctionData, discrepancyData] = await Promise.all([
        fetchBackendTransactions(activeSession, true),
        fetchCorrections(activeSession),
        fetchInventoryDiscrepancies(activeSession),
      ])
      setTransactions(transactionData.transactions)
      setCorrections(correctionData.corrections)
      setDiscrepancies(discrepancyData.discrepancies)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memuat reconciliation desk")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])
  const openDiscrepancies = useMemo(
    () => discrepancies.filter((item) => item.status === "OPEN"),
    [discrepancies],
  )

  async function submitCorrection() {
    if (!session || !selectedTransaction) return
    try {
      await createCorrection(session, selectedTransaction.id, {
        reason,
        adjustmentAmount: adjustment,
        evidenceReference: evidence || undefined,
      })
      toast.success("Correction tercatat", { description: "Transaksi asli tidak diubah." })
      setSelectedTransaction(null)
      setReason("")
      setAdjustment(0)
      setEvidence("")
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Correction gagal")
    }
  }

  async function submitResolution() {
    if (!session || !selectedDiscrepancy) return
    try {
      await resolveInventoryDiscrepancy(session, selectedDiscrepancy.id, {
        resolution,
        adjustedStock,
      })
      toast.success("Discrepancy diselesaikan")
      setSelectedDiscrepancy(null)
      setResolution("")
      setAdjustedStock(undefined)
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Resolution gagal")
    }
  }

  if (session && session.operator.role !== "ADMIN")
    return (
      <div className="grid min-h-[70svh] place-items-center text-center">
        <div>
          <IconShieldLock className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="text-sm font-semibold">Admin access required</p>
        </div>
      </div>
    )

  return (
    <div>
      <PageHeader
        eyebrow="Exception workflow"
        title="Reconciliation desk"
        description="Koreksi pembayaran dan selesaikan proyeksi stok tanpa pernah mengubah histori transaksi asli."
        actions={
          <Button variant="outline" onClick={refresh} disabled={loading}>
            <IconRefresh className={loading ? "animate-spin" : ""} /> Refresh
          </Button>
        }
      />
      <div className="grid gap-px border-b bg-border sm:grid-cols-3">
        <div className="bg-background px-4 py-3 sm:px-6">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Operator-asserted
          </div>
          <div className="mt-1 text-lg font-semibold">{transactions.length}</div>
        </div>
        <div className="bg-background px-4 py-3 sm:px-6">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Correction records
          </div>
          <div className="mt-1 text-lg font-semibold text-primary">{corrections.length}</div>
        </div>
        <div className="bg-background px-4 py-3 sm:px-6">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Open discrepancy
          </div>
          <div
            className={cn(
              "mt-1 text-lg font-semibold",
              openDiscrepancies.length && "text-amber-300",
            )}
          >
            {openDiscrepancies.length}
          </div>
        </div>
      </div>
      <div className="flex gap-1 border-b px-4 py-3 sm:px-6">
        {(
          [
            ["PAYMENTS", "Payment risk", IconScale],
            ["INVENTORY", "Inventory", IconAlertTriangle],
            ["AUDIT", "Audit trail", IconHistory],
          ] as const
        ).map(([value, label, Icon]) => (
          <Button
            key={value}
            variant={desk === value ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setDesk(value)}
          >
            <Icon />
            {label}
          </Button>
        ))}
      </div>

      <div className="p-4 sm:p-6">
        {desk === "PAYMENTS" && (
          <div className="grid gap-3">
            {transactions.length === 0 ? (
              <EmptyState
                icon={IconClipboardCheck}
                title="Belum ada payment risk"
                copy="Transaksi QRIS/Transfer yang sudah masuk backend akan muncul di sini."
              />
            ) : (
              transactions.map((transaction) => (
                <Card
                  key={transaction.id}
                  className="grid gap-3 p-3 sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid size-9 place-items-center rounded-md bg-amber-500/10 text-amber-300">
                      <IconArrowDownRight className="size-4" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold">{transaction.invoice_number}</span>
                        <Badge variant="warning">Operator asserted</Badge>
                        {transaction.correction_total !== 0 && (
                          <Badge variant="outline">
                            Adjusted {formatCurrency(transaction.correction_total)}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        {paymentLabels[transaction.payment_method]} ·{" "}
                        {formatTransactionDate(transaction.created_at_device)} ·{" "}
                        {transaction.operator_name}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <strong className="text-sm tabular-nums">
                      {formatCurrency(transaction.total)}
                    </strong>
                    <Button size="sm" onClick={() => setSelectedTransaction(transaction)}>
                      Buat correction
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
        {desk === "INVENTORY" && (
          <div className="grid gap-3">
            {discrepancies.length === 0 ? (
              <EmptyState
                icon={IconCheck}
                title="Tidak ada discrepancy"
                copy="Worker akan membuat exception jika proyeksi stok turun di bawah nol."
              />
            ) : (
              discrepancies.map((item) => (
                <Card
                  key={item.id}
                  className="grid gap-3 p-3 sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">{item.product_name}</span>
                      <Badge variant={item.status === "OPEN" ? "warning" : "success"}>
                        {item.status}
                      </Badge>
                    </div>
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      Detected {formatTransactionDate(item.detected_at)} · projection{" "}
                      <span className="text-red-400">{item.projected_stock}</span>
                    </div>
                    {item.resolution && (
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        {item.resolution}
                      </div>
                    )}
                  </div>
                  {item.status === "OPEN" && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedDiscrepancy(item)
                        setAdjustedStock(Math.max(0, item.projected_stock))
                      }}
                    >
                      Resolve
                    </Button>
                  )}
                </Card>
              ))
            )}
          </div>
        )}
        {desk === "AUDIT" && (
          <div className="grid gap-3">
            {corrections.length === 0 ? (
              <EmptyState
                icon={IconHistory}
                title="Audit trail masih kosong"
                copy="Setiap correction admin akan muncul sebagai record append-only."
              />
            ) : (
              corrections.map((item) => (
                <Card key={item.id} className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold">{item.invoice_number}</span>
                        <Badge variant="outline">Immutable original</Badge>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">{item.reason}</p>
                      <div className="mt-2 text-[10px] text-muted-foreground">
                        {item.admin_name} · {formatTransactionDate(item.created_at)}
                        {item.evidence_reference ? ` · ${item.evidence_reference}` : ""}
                      </div>
                    </div>
                    <strong
                      className={cn(
                        "text-sm tabular-nums",
                        item.adjustment_amount < 0 ? "text-red-400" : "text-emerald-400",
                      )}
                    >
                      {item.adjustment_amount > 0 ? "+" : ""}
                      {formatCurrency(item.adjustment_amount)}
                    </strong>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      <Dialog
        open={Boolean(selectedTransaction)}
        onOpenChange={(open) => !open && setSelectedTransaction(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Append payment correction</DialogTitle>
            <DialogDescription>
              Original transaction tetap settled dan immutable. Adjustment ini menjadi record audit
              baru.
            </DialogDescription>
          </DialogHeader>
          {selectedTransaction && (
            <div className="grid gap-3">
              <div className="flex justify-between rounded-md bg-secondary p-3 text-xs">
                <span>{selectedTransaction.invoice_number}</span>
                <strong>{formatCurrency(selectedTransaction.total)}</strong>
              </div>
              <label className="grid gap-1.5">
                <span className="text-xs font-medium">Reason</span>
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  className="min-h-20 rounded-md border bg-transparent p-2.5 text-sm outline-none focus:ring-[3px] focus:ring-ring/30"
                  placeholder="Contoh: pembayaran QRIS ternyata tidak masuk"
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-medium">Adjustment amount</span>
                <Input
                  type="number"
                  value={adjustment || ""}
                  onChange={(event) => setAdjustment(Number(event.target.value))}
                  placeholder="-22000"
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-medium">Evidence reference</span>
                <Input
                  value={evidence}
                  onChange={(event) => setEvidence(event.target.value)}
                  placeholder="Bank statement / ticket ID"
                />
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTransaction(null)}>
              Batal
            </Button>
            <Button disabled={reason.length < 8 || adjustment === 0} onClick={submitCorrection}>
              Simpan correction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(selectedDiscrepancy)}
        onOpenChange={(open) => !open && setSelectedDiscrepancy(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve inventory discrepancy</DialogTitle>
            <DialogDescription>Catat hasil stock opname atau penyesuaian admin.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <label className="grid gap-1.5">
              <span className="text-xs font-medium">Resolution note</span>
              <textarea
                value={resolution}
                onChange={(event) => setResolution(event.target.value)}
                className="min-h-20 rounded-md border bg-transparent p-2.5 text-sm outline-none focus:ring-[3px] focus:ring-ring/30"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-medium">Adjusted stock</span>
              <Input
                type="number"
                value={adjustedStock ?? ""}
                onChange={(event) =>
                  setAdjustedStock(
                    event.target.value === "" ? undefined : Number(event.target.value),
                  )
                }
              />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDiscrepancy(null)}>
              Batal
            </Button>
            <Button disabled={resolution.length < 8} onClick={submitResolution}>
              Resolve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function EmptyState({
  icon: Icon,
  title,
  copy,
}: {
  icon: typeof IconCheck
  title: string
  copy: string
}) {
  return (
    <div className="grid min-h-72 place-items-center rounded-lg border border-dashed text-center">
      <div>
        <Icon className="mx-auto mb-3 size-7 text-muted-foreground" />
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{copy}</p>
      </div>
    </div>
  )
}
