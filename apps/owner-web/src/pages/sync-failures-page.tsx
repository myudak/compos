import type { SyncReceiptDto } from "@k-pos/api-client"
import { IconAlertTriangle, IconRefresh } from "@tabler/icons-react"
import { useCallback, useEffect, useState } from "react"

import { ownerApi, type OwnerSession } from "../api"
import { Empty, Panel, Status } from "../ui"

export function SyncFailuresPage({
  session,
  refreshKey,
}: {
  session: OwnerSession
  refreshKey: number
}) {
  const [items, setItems] = useState<SyncReceiptDto[]>([])
  const [error, setError] = useState("")
  const refresh = useCallback(
    () =>
      ownerApi
        .failures(session)
        .then(setItems)
        .catch((cause: unknown) =>
          setError(cause instanceof Error ? cause.message : "Failure queue gagal dimuat"),
        ),
    [session],
  )
  useEffect(() => void refresh(), [refresh, refreshKey])
  async function retry(item: SyncReceiptDto) {
    try {
      await ownerApi.retryReceipt(session, item.id_receipt)
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Retry gagal diantrikan")
    }
  }
  async function resolveConflict(item: SyncReceiptDto, action: "CONFIRM" | "VOID") {
    if (!item.id_transaction) return
    try {
      await ownerApi.resolveConflict(session, item.id_transaction, action)
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Conflict gagal diselesaikan")
    }
  }
  return (
    <div className="page">
      <div className="page-title">
        <div>
          <h1>Sync failures</h1>
          <p>
            Terminal failure tidak menghapus sale lokal. Hanya retryable failure yang bisa
            diantrikan ulang.
          </p>
        </div>
      </div>
      {error && <div className="error-box">{error}</div>}
      <Panel
        title="Terminal receipt queue"
        copy="Rabbit retry 5s, 30s, dan 120s terjadi otomatis sebelum DLQ."
      >
        <div className="failure-list">
          {items.map((item) => (
            <article key={item.id_receipt}>
              <i>
                <IconAlertTriangle />
              </i>
              <span className="grow">
                <strong>{item.last_error_code ?? item.status}</strong>
                <small>{item.offline_uuid}</small>
                <p>{item.last_error_message ?? "Tidak ada detail error"}</p>
              </span>
              <Status tone={item.status === "CONFLICT" ? "warn" : "bad"}>{item.status}</Status>
              {item.status === "CONFLICT" && item.id_transaction && (
                <div className="conflict-actions">
                  <button onClick={() => void resolveConflict(item, "CONFIRM")}>Confirm</button>
                  <button onClick={() => void resolveConflict(item, "VOID")}>Void</button>
                </div>
              )}
              {item.retryable && item.status === "FAILED" && (
                <button onClick={() => void retry(item)}>
                  <IconRefresh /> Retry
                </button>
              )}
            </article>
          ))}
          {!items.length && <Empty>Tidak ada receipt conflict atau failed.</Empty>}
        </div>
      </Panel>
    </div>
  )
}
