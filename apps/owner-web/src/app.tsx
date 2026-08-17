import type { BusinessInsight, InsightJob, OwnerDashboard } from "@operator/contracts"
import {
  IconArrowUpRight,
  IconBolt,
  IconChartBar,
  IconClock,
  IconLogout,
  IconRefresh,
  IconSparkles,
} from "@tabler/icons-react"
import { useCallback, useEffect, useState } from "react"

import { clearSession, loginOwner, ownerApi, storedSession, type OwnerSession } from "./api"

const rupiah = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" })

export function App() {
  const [session, setSession] = useState<OwnerSession | null>(() => storedSession())
  return session ? (
    <Dashboard session={session} onLogout={() => (clearSession(), setSession(null))} />
  ) : (
    <Login onLogin={setSession} />
  )
}

function Login({ onLogin }: { onLogin: (session: OwnerSession) => void }) {
  const [merchantCode, setMerchantCode] = useState("KEDAI-NUSA")
  const [operatorCode, setOperatorCode] = useState("OWNER")
  const [pin, setPin] = useState("7777")
  const [activationCode, setActivationCode] = useState("COMPOS-DEMO")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError("")
    try {
      onLogin(await loginOwner({ merchantCode, operatorCode, pin, activationCode }))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Login gagal")
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login-shell">
      <section className="login-story">
        <Brand />
        <div>
          <h1>Lihat bisnis dengan data yang sudah settle.</h1>
          <p>
            Penjualan dari setiap counter masuk ke read model secara asynchronous. Kamu tetap tahu
            kapan laporan terakhir diperbarui—tanpa mengganggu jalur transaksi kasir.
          </p>
        </div>
        <div className="flow-line">
          <span>Counter</span>
          <i />
          <span>Ledger</span>
          <i />
          <strong>Owner view</strong>
        </div>
      </section>
      <form className="login-card" onSubmit={submit}>
        <div>
          <span className="muted">COMPOS OWNER</span>
          <h2>Masuk ke merchant</h2>
          <p>Laporan bersifat online-first dan merchant-scoped.</p>
        </div>
        <Field label="Kode merchant" value={merchantCode} onChange={setMerchantCode} />
        <Field label="Kode owner" value={operatorCode} onChange={setOperatorCode} />
        <Field label="PIN" value={pin} onChange={setPin} type="password" />
        <Field label="Kode aktivasi device" value={activationCode} onChange={setActivationCode} />
        {error && <div className="error">{error}</div>}
        <button className="primary" disabled={busy}>
          {busy ? "Menghubungkan…" : "Masuk"}
        </button>
        <a className="operator-link" href="/">
          Bukan Owner? Buka COMPOS Operator →
        </a>
      </form>
    </main>
  )
}

function Field(props: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
}) {
  return (
    <label className="field">
      <span>{props.label}</span>
      <input
        type={props.type ?? "text"}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </label>
  )
}

function Dashboard({ session, onLogout }: { session: OwnerSession; onLogout: () => void }) {
  const [dashboard, setDashboard] = useState<OwnerDashboard | null>(null)
  const [insights, setInsights] = useState<BusinessInsight[]>([])
  const [job, setJob] = useState<InsightJob | null>(null)
  const [error, setError] = useState("")

  const refresh = useCallback(async () => {
    try {
      const [dashboardResult, insightResult] = await Promise.all([
        ownerApi.dashboard(session),
        ownerApi.insights(session),
      ])
      setDashboard(dashboardResult)
      setInsights(insightResult.insights)
      setError("")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Data belum dapat dimuat")
    }
  }, [session])

  useEffect(() => void refresh(), [refresh])
  useEffect(() => {
    if (!job || !["QUEUED", "PROCESSING"].includes(job.status)) return
    const timer = window.setInterval(async () => {
      const result = await ownerApi.job(session, job.id)
      setJob(result.job)
      if (result.job.status === "COMPLETED") await refresh()
    }, 1_500)
    return () => window.clearInterval(timer)
  }, [job, refresh, session])

  async function generateInsight() {
    try {
      const result = await ownerApi.generate(session)
      setJob(result.job)
      if (result.job.status === "COMPLETED") await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Insight gagal diantrikan")
    }
  }

  return (
    <main className="dashboard-shell">
      <header>
        <Brand />
        <div className="header-actions">
          <span>{session.ownerName}</span>
          <button className="icon-button" onClick={() => void refresh()} aria-label="Refresh">
            <IconRefresh size={18} />
          </button>
          <button className="icon-button" onClick={onLogout} aria-label="Logout">
            <IconLogout size={18} />
          </button>
        </div>
      </header>
      <section className="title-row">
        <div>
          <h1>Business pulse</h1>
          <p>Angka yang sudah diproyeksikan dari canonical ledger.</p>
        </div>
        <Freshness dashboard={dashboard} />
      </section>
      {error && <div className="error">{error}</div>}
      <section className="metric-grid">
        <Metric
          label="Net sales"
          value={rupiah.format(dashboard?.summary.netSales ?? 0)}
          icon={<IconBolt />}
        />
        <Metric
          label="Transaksi"
          value={`${dashboard?.summary.transactionCount ?? 0}`}
          icon={<IconChartBar />}
        />
        <Metric
          label="Average order"
          value={rupiah.format(dashboard?.summary.averageOrderValue ?? 0)}
          icon={<IconArrowUpRight />}
        />
      </section>
      <section className="content-grid">
        <div className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <h2>Penjualan harian</h2>
              <p>Gross sales, 30 hari terakhir</p>
            </div>
          </div>
          <SalesChart dashboard={dashboard} />
        </div>
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>Produk teratas</h2>
              <p>Berdasarkan revenue</p>
            </div>
          </div>
          <div className="product-list">
            {dashboard?.topProducts.map((product, index) => (
              <div className="product-row" key={product.productId}>
                <span className="rank">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{product.name}</strong>
                  <small>{product.quantity} terjual</small>
                </div>
                <b>{rupiah.format(product.revenue)}</b>
              </div>
            ))}
            {!dashboard?.topProducts.length && <Empty text="Belum ada produk pada periode ini." />}
          </div>
        </div>
      </section>
      <section className="panel insights-panel">
        <div className="panel-heading">
          <div>
            <h2>Insight history</h2>
            <p>Analisis agregat—tanpa data operator atau transaksi mentah.</p>
          </div>
          <button
            className="secondary"
            onClick={() => void generateInsight()}
            disabled={job?.status === "PROCESSING"}
          >
            <IconSparkles size={17} />{" "}
            {job && ["QUEUED", "PROCESSING"].includes(job.status)
              ? "Sedang diproses"
              : "Generate insight"}
          </button>
        </div>
        <div className="insight-grid">
          {insights.map((insight) => (
            <InsightCard insight={insight} key={insight.id} />
          ))}
          {!insights.length && (
            <Empty text="Generate insight pertama untuk membaca pola penjualan." />
          )}
        </div>
      </section>
    </main>
  )
}

function Brand() {
  return (
    <div className="brand">
      <img src="/owner/brand/compos-icon.png" alt="" />
      <strong>COMPOS</strong>
      <span>OWNER</span>
    </div>
  )
}

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="metric">
      <div className="metric-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function Freshness({ dashboard }: { dashboard: OwnerDashboard | null }) {
  return (
    <div className="freshness">
      <IconClock size={17} />
      <div>
        <strong>{dashboard?.projectionLagSeconds ?? 0}s projection lag</strong>
        <span>
          {dashboard?.dataAsOf
            ? `Data as of ${new Date(dashboard.dataAsOf).toLocaleTimeString("id-ID")}`
            : "Menunggu transaksi pertama"}
        </span>
      </div>
    </div>
  )
}

function SalesChart({ dashboard }: { dashboard: OwnerDashboard | null }) {
  const rows = dashboard?.dailySales ?? []
  const max = Math.max(1, ...rows.map((row) => row.grossSales))
  return (
    <div className="bars">
      {rows.map((row) => (
        <div
          className="bar-slot"
          key={row.date}
          title={`${row.date}: ${rupiah.format(row.grossSales)}`}
        >
          <i style={{ height: `${Math.max(4, (row.grossSales / max) * 100)}%` }} />
          <span>{row.date.slice(8)}</span>
        </div>
      ))}
      {!rows.length && <Empty text="Chart akan terisi setelah worker memproyeksikan transaksi." />}
    </div>
  )
}

function InsightCard({ insight }: { insight: BusinessInsight }) {
  return (
    <article className="insight-card">
      <div>
        <span className={`source ${insight.source === "EXTERNAL_AI" ? "external" : ""}`}>
          {insight.source === "EXTERNAL_AI" ? "External AI" : "Local analytics"}
        </span>
        <small>{new Date(insight.generatedAt).toLocaleDateString("id-ID")}</small>
      </div>
      <h3>{insight.title}</h3>
      <p>{insight.summary}</p>
      <ul>
        {insight.recommendations.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </article>
  )
}

function Empty({ text }: { text: string }) {
  return <div className="empty">{text}</div>
}
