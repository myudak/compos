import { IconCash, IconChartBar, IconClock, IconReceipt } from "@tabler/icons-react"
import { useEffect, useState } from "react"

import { ownerApi, type OwnerSession } from "../api"
import { Empty, Panel } from "../ui"

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
})
type Dashboard = Awaited<ReturnType<typeof ownerApi.dashboard>>

export function DashboardPage({
  session,
  refreshKey,
}: {
  session: OwnerSession
  refreshKey: number
}) {
  const { data, error } = useDashboard(session, refreshKey)
  return (
    <div className="page">
      <div className="page-title">
        <div>
          <h1>Business pulse</h1>
          <p>Read model yang diproyeksikan dari immutable transaction ledger.</p>
        </div>
        <Freshness data={data} />
      </div>
      {error && <div className="error-box">{error}</div>}
      <section className="metric-grid">
        <Metric icon={<IconCash />} label="Net sales" value={rupiah.format(data?.net_sales ?? 0)} />
        <Metric
          icon={<IconReceipt />}
          label="Transaksi"
          value={String(data?.transaction_count ?? 0)}
        />
        <Metric
          icon={<IconChartBar />}
          label="Average order"
          value={rupiah.format(data?.average_order_value ?? 0)}
        />
      </section>
      <section className="content-grid">
        <DailySales data={data} />
        <TopProducts products={data?.top_products ?? []} />
      </section>
    </div>
  )
}

function useDashboard(session: OwnerSession, refreshKey: number) {
  const [data, setData] = useState<Dashboard | null>(null)
  const [error, setError] = useState("")
  useEffect(() => {
    void ownerApi
      .dashboard(session)
      .then(setData)
      .then(() => setError(""))
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : "Laporan belum dapat dimuat"),
      )
  }, [refreshKey, session])
  return { data, error }
}

function Freshness({ data }: { data: Dashboard | null }) {
  return (
    <div className="freshness">
      <IconClock />
      <span>
        <strong>{data?.projection_lag_seconds ?? 0}s lag</strong>
        <small>
          {data?.data_as_of
            ? new Date(data.data_as_of).toLocaleString("id-ID")
            : "Belum ada projection"}
        </small>
      </span>
    </div>
  )
}

function DailySales({ data }: { data: Dashboard | null }) {
  const rows = data?.daily_series ?? []
  const max = Math.max(1, ...rows.map((row) => row.net_sales))
  return (
    <Panel
      title="Penjualan harian"
      copy={`${data?.from ?? "—"} sampai ${data?.to ?? "—"} · ${data?.timezone ?? "Asia/Jakarta"}`}
    >
      <div className="bar-chart">
        {rows.map((row) => (
          <div
            className="bar-slot"
            key={row.date}
            title={`${row.date}: ${rupiah.format(row.net_sales)}`}
          >
            <i style={{ height: `${Math.max(4, (row.net_sales / max) * 100)}%` }} />
            <span>{row.date.slice(8)}</span>
          </div>
        ))}
        {!rows.length && <Empty>Belum ada settlement pada periode ini.</Empty>}
      </div>
    </Panel>
  )
}

function TopProducts({ products }: { products: Dashboard["top_products"] }) {
  return (
    <Panel title="Produk teratas" copy="Diurutkan dari net sales">
      <div className="rank-list">
        {products.map((product, index) => (
          <div key={product.id_product}>
            <b>{String(index + 1).padStart(2, "0")}</b>
            <span>
              <strong>{product.product_name}</strong>
              <small>{product.quantity} item</small>
            </span>
            <em>{rupiah.format(product.net_sales)}</em>
          </div>
        ))}
        {!products.length && <Empty>Belum ada data produk.</Empty>}
      </div>
    </Panel>
  )
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <article className="metric">
      <i>{icon}</i>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}
