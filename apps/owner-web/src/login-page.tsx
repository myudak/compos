import { IconArrowRight, IconChartBar, IconReceipt, IconShieldCheck } from "@tabler/icons-react"
import { useState } from "react"

import { loginOwner, type OwnerSession } from "./api"
import { Brand } from "./ui"

export function LoginPage({ onLogin }: { onLogin: (session: OwnerSession) => void }) {
  const [email, setEmail] = useState("owner@kedai-nusa.test")
  const [password, setPassword] = useState("owner123")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError("")
    try {
      onLogin(await loginOwner(email, password))
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
          <h1>Yang normal jalan sendiri. Yang aneh baru masuk meja Owner.</h1>
          <p>
            Pantau penjualan yang sudah settle, kelola akses counter, dan tangani payment atau sync
            exception tanpa mengubah ledger asli.
          </p>
        </div>
        <div className="promise-row">
          <span>
            <IconChartBar /> Reporting eventual
          </span>
          <span>
            <IconReceipt /> Exception-only reconciliation
          </span>
          <span>
            <IconShieldCheck /> Merchant scoped
          </span>
        </div>
      </section>
      <form className="login-card" onSubmit={submit}>
        <div>
          <h2>Masuk ke Owner</h2>
          <p>Control room ini online-first dan seluruh action masuk audit trail.</p>
        </div>
        <label>
          <span>Email</span>
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label>
          <span>Password</span>
          <input
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error && <div className="error-box">{error}</div>}
        <button className="primary" disabled={busy}>
          {busy ? "Menghubungkan…" : "Masuk"}
          <IconArrowRight size={18} />
        </button>
        <div className="role-links">
          <a href="/">Operator app</a>
          <a href="/entry/">Entry app</a>
        </div>
      </form>
    </main>
  )
}
