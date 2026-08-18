import { IconArrowRight, IconBox, IconHistory, IconPackageImport } from "@tabler/icons-react"
import { useState } from "react"

import { loginEntry, type EntrySession } from "./api"

export function LoginPage({ onLogin }: { onLogin: (session: EntrySession) => void }) {
  const [email, setEmail] = useState("entry@kedai-nusa.test")
  const [password, setPassword] = useState("entry123")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError("")
    try {
      onLogin(await loginEntry(email, password))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Login gagal")
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login-shell">
      <section className="login-copy">
        <Brand />
        <div>
          <h1>Catalog rapi. Stok kebaca. Counter tetap ngebut.</h1>
          <p>
            Workspace operasional untuk update produk, harga, foto, dan penyesuaian stok tanpa masuk
            ke layar kasir.
          </p>
        </div>
        <div className="capability-row">
          <span>
            <IconBox /> Catalog
          </span>
          <span>
            <IconPackageImport /> Stock adjustment
          </span>
          <span>
            <IconHistory /> Audit trail
          </span>
        </div>
      </section>
      <form className="login-card" onSubmit={submit}>
        <div>
          <h2>Masuk ke Entry</h2>
          <p>Perubahan catalog membutuhkan koneksi ke backend.</p>
        </div>
        <label>
          <span>Email</span>
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
        </label>
        <label>
          <span>Password</span>
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
          />
        </label>
        {error && <div className="error-box">{error}</div>}
        <button className="primary" disabled={busy}>
          {busy ? "Menghubungkan…" : "Masuk"} <IconArrowRight size={18} />
        </button>
        <div className="role-links">
          <a href="/">Operator app</a>
          <a href="/owner/">Owner app</a>
        </div>
      </form>
    </main>
  )
}

export function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark">K</span>
      <strong>K-POS</strong>
      <small>ENTRY</small>
    </div>
  )
}
