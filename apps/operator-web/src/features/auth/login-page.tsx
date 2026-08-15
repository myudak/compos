import { useState } from "react"
import {
  IconArrowRight,
  IconDatabase,
  IconDeviceTablet,
  IconKey,
  IconLock,
  IconShieldCheck,
  IconWifi,
} from "@tabler/icons-react"

import { Button } from "@/shared/ui/components/button"
import { Card } from "@/shared/ui/components/card"
import { Input } from "@/shared/ui/components/input"
import { activateAndLogin, bootstrapLocalData } from "@/infrastructure/api/api-client"
import type { AuthSession, DeviceIdentity } from "@/infrastructure/persistence/models"

export function LoginPage({
  device,
  onAuthenticated,
}: {
  device: DeviceIdentity
  onAuthenticated: (session: AuthSession) => void
}) {
  const [merchantCode, setMerchantCode] = useState("KEDAI-NUSA")
  const [operatorCode, setOperatorCode] = useState("RANI")
  const [pin, setPin] = useState("1234")
  const [activationCode, setActivationCode] = useState("COMP18-DEMO")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError("")
    try {
      const session = await activateAndLogin({
        merchantCode,
        operatorCode,
        pin,
        activationCode,
        device,
      })
      await bootstrapLocalData(session, device)
      onAuthenticated(session)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Aktivasi gagal")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="grain relative grid min-h-svh overflow-hidden bg-background lg:grid-cols-[minmax(0,1fr)_520px]">
      <div className="app-grid pointer-events-none absolute inset-0 opacity-45" />
      <section className="relative hidden flex-col justify-between border-r p-10 lg:flex">
        <div className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-md bg-primary text-sm font-black text-primary-foreground">
            OP
          </div>
          <div>
            <div className="text-sm font-semibold">operator.</div>
            <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
              POS / local-first
            </div>
          </div>
        </div>
        <div className="max-w-2xl">
          <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">
            Sync without signal
          </p>
          <h1 className="max-w-xl text-5xl font-semibold leading-[1.05] tracking-[-0.06em]">
            Jual sekarang.
            <br />
            <span className="text-muted-foreground">Sinkron nanti.</span>
          </h1>
          <p className="mt-5 max-w-lg text-sm leading-6 text-muted-foreground">
            Checkout kritikal tidak menunggu jaringan. Device ini menulis transaksi secara lokal,
            mempertahankan identitas yang stabil, lalu melakukan reconciliation ke backend saat
            koneksi tersedia.
          </p>
          <div className="mt-8 grid max-w-xl grid-cols-3 gap-2">
            {[
              [IconDatabase, "Local write", "IndexedDB"],
              [IconShieldCheck, "Safe retry", "Idempotent"],
              [IconWifi, "Reconnect", "Automatic"],
            ].map(([Icon, title, copy]) => {
              const ItemIcon = Icon as typeof IconDatabase
              return (
                <Card key={String(title)} className="bg-card/65 p-3">
                  <ItemIcon className="mb-5 size-4 text-primary" />
                  <div className="text-xs font-semibold">{String(title)}</div>
                  <div className="mt-1 text-[10px] text-muted-foreground">{String(copy)}</div>
                </Card>
              )
            })}
          </div>
        </div>
        <div className="text-[10px] text-muted-foreground">
          COMPFEST 18 · Operator reliability prototype
        </div>
      </section>

      <section className="relative grid place-items-center p-5 sm:p-10">
        <form onSubmit={submit} className="w-full max-w-sm">
          <div className="mb-7 lg:hidden">
            <div className="mb-5 grid size-10 place-items-center rounded-md bg-primary text-sm font-black text-primary-foreground">
              OP
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.05em]">Aktifkan perangkat</h1>
          </div>
          <div className="hidden lg:block">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
              Registered checkout
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">Aktifkan counter</h2>
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Aktivasi pertama membutuhkan jaringan. Setelah itu, session dan katalog tersimpan untuk
            penggunaan offline.
          </p>

          <div className="mt-6 grid gap-3">
            <label className="grid gap-1.5">
              <span className="text-xs font-medium">Kode merchant</span>
              <Input
                value={merchantCode}
                onChange={(event) => setMerchantCode(event.target.value.toUpperCase())}
                autoComplete="organization"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-medium">Kode operator</span>
              <Input
                value={operatorCode}
                onChange={(event) => setOperatorCode(event.target.value.toUpperCase())}
                autoComplete="username"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-medium">PIN operator</span>
              <div className="relative">
                <IconLock className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={pin}
                  onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
                  className="pl-8"
                  type="password"
                  inputMode="numeric"
                  autoComplete="current-password"
                />
              </div>
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-medium">Kode aktivasi device</span>
              <div className="relative">
                <IconKey className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={activationCode}
                  onChange={(event) => setActivationCode(event.target.value.toUpperCase())}
                  className="pl-8"
                />
              </div>
            </label>
          </div>

          {error && (
            <div className="mt-4 rounded-md border border-red-500/20 bg-red-500/8 p-2.5 text-xs text-red-300">
              {error}
            </div>
          )}
          <Button type="submit" size="lg" className="mt-5 w-full" disabled={loading}>
            {loading ? "Mendaftarkan device…" : "Aktifkan & masuk"}
            <IconArrowRight />
          </Button>
          <div className="mt-4 flex items-start gap-2 rounded-md border bg-card p-2.5 text-[10px] leading-4 text-muted-foreground">
            <IconDeviceTablet className="mt-0.5 size-3.5 shrink-0 text-primary" />
            <span>
              Device ID dibuat sekali dan disimpan di IndexedDB:
              <br />
              <code className="mt-1 block break-all text-[9px] text-foreground">{device.id}</code>
            </span>
          </div>
          <p className="mt-4 text-center text-[9px] text-muted-foreground">
            Demo: KEDAI-NUSA · RANI · PIN 1234 · COMP18-DEMO
          </p>
        </form>
      </section>
    </main>
  )
}
