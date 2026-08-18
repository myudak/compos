import type { PaymentDto, ReconciliationDto } from "@k-pos/api-client"
import { IconAlertCircle, IconCircleCheck, IconCircleX, IconPlus } from "@tabler/icons-react"
import { useCallback, useEffect, useState } from "react"

import { ownerApi, type OwnerSession } from "../api"
import { Modal, Panel, Status } from "../ui"

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
})

export function ReconciliationPage({
  session,
  refreshKey,
}: {
  session: OwnerSession
  refreshKey: number
}) {
  const [payments, setPayments] = useState<PaymentDto[]>([])
  const [cases, setCases] = useState<ReconciliationDto[]>([])
  const [openFor, setOpenFor] = useState<PaymentDto | null>(null)
  const [resolve, setResolve] = useState<ReconciliationDto | null>(null)
  const [error, setError] = useState("")
  const refresh = useCallback(async () => {
    try {
      const [paymentRows, caseRows] = await Promise.all([
        ownerApi.payments(session),
        ownerApi.reconciliations(session),
      ])
      setPayments(paymentRows)
      setCases(caseRows)
      setError("")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Payment desk gagal dimuat")
    }
  }, [session])
  useEffect(() => void refresh(), [refresh, refreshKey])
  const openPaymentIds = new Set(
    cases.filter((item) => item.status === "OPEN").map((item) => item.id_payment),
  )
  return (
    <div className="page">
      <div className="page-title">
        <div>
          <h1>Payment exceptions</h1>
          <p>Semua payment normal langsung VERIFIED. Case hanya dibuat saat ada masalah.</p>
        </div>
      </div>
      {error && <div className="error-box">{error}</div>}
      <Panel
        title="Open cases"
        copy="Invalid resolution atomically marks payment FAILED and creates append-only void."
      >
        <div className="case-list">
          {cases
            .filter((item) => item.status === "OPEN")
            .map((item) => (
              <article key={item.id_reconciliation}>
                <IconAlertCircle />
                <span className="grow">
                  <strong>{item.reason}</strong>
                  <small>Payment {item.id_payment}</small>
                </span>
                <Status tone="warn">OPEN</Status>
                <button onClick={() => setResolve(item)}>Resolve</button>
              </article>
            ))}
          {!cases.some((item) => item.status === "OPEN") && (
            <div className="empty">Tidak ada payment exception terbuka.</div>
          )}
        </div>
      </Panel>
      <Panel
        title="Recent payments"
        copy="Operator sudah memeriksa pembayaran sebelum menyelesaikan checkout."
      >
        <div className="table-list">
          {payments.map((payment) => (
            <div className="table-row" key={payment.id_payment}>
              <span className="payment-icon">{payment.method.slice(0, 1)}</span>
              <span className="grow">
                <strong>{rupiah.format(payment.amount)}</strong>
                <small>
                  {payment.method} · {new Date(payment.created_at).toLocaleString("id-ID")}
                </small>
              </span>
              <Status tone={payment.status === "VERIFIED" ? "good" : "bad"}>
                {payment.status}
              </Status>
              {payment.status === "VERIFIED" && !openPaymentIds.has(payment.id_payment) && (
                <button className="row-button" onClick={() => setOpenFor(payment)}>
                  <IconPlus /> Buka kasus
                </button>
              )}
            </div>
          ))}
        </div>
      </Panel>
      {openFor && (
        <OpenCase
          session={session}
          payment={openFor}
          onClose={() => setOpenFor(null)}
          onSaved={() => (setOpenFor(null), void refresh())}
        />
      )}
      {resolve && (
        <ResolveCase
          session={session}
          item={resolve}
          onClose={() => setResolve(null)}
          onSaved={() => (setResolve(null), void refresh())}
        />
      )}
    </div>
  )
}

function OpenCase({
  session,
  payment,
  onClose,
  onSaved,
}: {
  session: OwnerSession
  payment: PaymentDto
  onClose: () => void
  onSaved: () => void
}) {
  const [reason, setReason] = useState("")
  const [evidence, setEvidence] = useState("")
  const [error, setError] = useState("")
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    try {
      await ownerApi.openReconciliation(session, payment.id_payment, reason, evidence || undefined)
      onSaved()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Case gagal dibuat")
    }
  }
  return (
    <Modal title="Buka payment case" onClose={onClose}>
      <form className="modal-form" onSubmit={submit}>
        <p>Payment tetap VERIFIED selama case belum diputuskan.</p>
        <label>
          <span>Alasan pemeriksaan</span>
          <textarea
            required
            minLength={5}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
        <label>
          <span>Bukti / catatan opsional</span>
          <textarea value={evidence} onChange={(event) => setEvidence(event.target.value)} />
        </label>
        {error && <div className="error-box">{error}</div>}
        <button className="primary">Buka kasus</button>
      </form>
    </Modal>
  )
}

function ResolveCase({
  session,
  item,
  onClose,
  onSaved,
}: {
  session: OwnerSession
  item: ReconciliationDto
  onClose: () => void
  onSaved: () => void
}) {
  const [note, setNote] = useState("")
  const [returnStock, setReturnStock] = useState(true)
  const [error, setError] = useState("")
  async function resolve(action: "VALID" | "INVALID") {
    try {
      await ownerApi.resolveReconciliation(session, item.id_reconciliation, {
        action,
        resolution_note: note,
        inventory_returned: action === "INVALID" ? returnStock : undefined,
      })
      onSaved()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Case gagal diselesaikan")
    }
  }
  return (
    <Modal title="Resolve payment case" onClose={onClose}>
      <div className="modal-form">
        <p>{item.reason}</p>
        <label>
          <span>Resolution note</span>
          <textarea
            required
            minLength={5}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={returnStock}
            onChange={(event) => setReturnStock(event.target.checked)}
          />
          <span>Kembalikan stok jika payment invalid</span>
        </label>
        {error && <div className="error-box">{error}</div>}
        <div className="resolution-actions">
          <button
            disabled={note.length < 5}
            className="valid"
            onClick={() => void resolve("VALID")}
          >
            <IconCircleCheck /> Valid—tutup case
          </button>
          <button
            disabled={note.length < 5}
            className="invalid"
            onClick={() => void resolve("INVALID")}
          >
            <IconCircleX /> Invalid—FAILED + void
          </button>
        </div>
      </div>
    </Modal>
  )
}
