import {
  IconAlertTriangle,
  IconChartBar,
  IconDevices,
  IconHistory,
  IconLogout,
  IconReceipt,
  IconRefresh,
  IconUsers,
} from "@tabler/icons-react"
import { useState } from "react"

import { logoutOwner, type OwnerSession } from "./api"
import { AuditPage } from "./pages/audit-page"
import { DashboardPage } from "./pages/dashboard-page"
import { DevicesPage } from "./pages/devices-page"
import { ReconciliationPage } from "./pages/reconciliation-page"
import { SyncFailuresPage } from "./pages/sync-failures-page"
import { UsersPage } from "./pages/users-page"
import { Brand } from "./ui"

type View = "dashboard" | "users" | "devices" | "payments" | "sync" | "audit"
const navigation: Array<{ id: View; label: string; icon: React.ReactNode }> = [
  { id: "dashboard", label: "Ringkasan", icon: <IconChartBar /> },
  { id: "users", label: "Tim", icon: <IconUsers /> },
  { id: "devices", label: "Counter", icon: <IconDevices /> },
  { id: "payments", label: "Payment cases", icon: <IconReceipt /> },
  { id: "sync", label: "Sync failures", icon: <IconAlertTriangle /> },
  { id: "audit", label: "Audit trail", icon: <IconHistory /> },
]

export function OwnerWorkspace({
  session,
  onSessionEnd,
}: {
  session: OwnerSession
  onSessionEnd: () => void
}) {
  const [view, setView] = useState<View>("dashboard")
  const [refreshKey, setRefreshKey] = useState(0)
  const page = {
    dashboard: <DashboardPage session={session} refreshKey={refreshKey} />,
    users: <UsersPage session={session} refreshKey={refreshKey} />,
    devices: <DevicesPage session={session} refreshKey={refreshKey} />,
    payments: <ReconciliationPage session={session} refreshKey={refreshKey} />,
    sync: <SyncFailuresPage session={session} refreshKey={refreshKey} />,
    audit: <AuditPage session={session} refreshKey={refreshKey} />,
  }[view]

  return (
    <main className="app-shell">
      <aside>
        <Brand />
        <nav>
          {navigation.map((item) => (
            <button
              className={view === item.id ? "active" : ""}
              key={item.id}
              onClick={() => setView(item.id)}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
        <div className="owner-identity">
          <strong>{session.name}</strong>
          <span>{session.email}</span>
        </div>
        <button className="logout" onClick={() => void logoutOwner(session).finally(onSessionEnd)}>
          <IconLogout /> Keluar
        </button>
      </aside>
      <section className="main-column">
        <header className="mobile-header">
          <Brand />
          <button onClick={() => setRefreshKey((key) => key + 1)}>
            <IconRefresh />
          </button>
        </header>
        <div className="desktop-actions">
          <button onClick={() => setRefreshKey((key) => key + 1)}>
            <IconRefresh /> Refresh data
          </button>
        </div>
        {page}
        <nav className="mobile-nav">
          {navigation.slice(0, 5).map((item) => (
            <button
              className={view === item.id ? "active" : ""}
              aria-label={item.label}
              key={item.id}
              onClick={() => setView(item.id)}
            >
              {item.icon}
            </button>
          ))}
        </nav>
      </section>
    </main>
  )
}
