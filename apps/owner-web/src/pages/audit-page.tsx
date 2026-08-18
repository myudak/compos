import { IconActivity } from "@tabler/icons-react"
import { useEffect, useState } from "react"

import { ownerApi, type OwnerSession } from "../api"
import { Empty, Panel, Status } from "../ui"

type AuditEvent = Awaited<ReturnType<typeof ownerApi.audit>>[number]

export function AuditPage({ session, refreshKey }: { session: OwnerSession; refreshKey: number }) {
  const [items, setItems] = useState<AuditEvent[]>([])
  const [error, setError] = useState("")
  useEffect(() => {
    void ownerApi
      .audit(session)
      .then(setItems)
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : "Audit trail gagal dimuat"),
      )
  }, [refreshKey, session])
  return (
    <div className="page">
      <div className="page-title">
        <div>
          <h1>Audit trail</h1>
          <p>Jejak perubahan user, device, payment, conflict, dan correction.</p>
        </div>
      </div>
      {error && <div className="error-box">{error}</div>}
      <Panel title="Recent activity" copy="PIN dan password tidak pernah masuk metadata audit.">
        <div className="timeline">
          {items.map((item) => (
            <article key={item.id_event}>
              <i>
                <IconActivity />
              </i>
              <div>
                <strong>{humanize(item.action)}</strong>
                <p>
                  {item.actor?.full_name ?? "System"} · {item.entity_type}
                </p>
                <code>{item.entity_id ?? "—"}</code>
              </div>
              <Status>{item.actor?.role ?? "SYSTEM"}</Status>
              <time>{new Date(item.created_at).toLocaleString("id-ID")}</time>
            </article>
          ))}
          {!items.length && <Empty>Belum ada audit event.</Empty>}
        </div>
      </Panel>
    </div>
  )
}

function humanize(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}
