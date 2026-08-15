import { lazy, Suspense, useEffect, useState } from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { Toaster } from "sonner"

import { AppShell } from "@/components/app-shell"
import { db, getAuthSession, initializeDatabase } from "@/lib/db"
import { startSyncScheduler } from "@/lib/sync-engine"
import type { AuthSession, DeviceIdentity } from "@/lib/types"
import { usePosStore } from "@/stores/pos-store"

const CheckoutPage = lazy(() => import("@/pages/checkout-page").then((module) => ({ default: module.CheckoutPage })))
const ProductsPage = lazy(() => import("@/pages/products-page").then((module) => ({ default: module.ProductsPage })))
const SettingsPage = lazy(() => import("@/pages/settings-page").then((module) => ({ default: module.SettingsPage })))
const SyncPage = lazy(() => import("@/pages/sync-page").then((module) => ({ default: module.SyncPage })))
const TransactionDetailPage = lazy(() => import("@/pages/transaction-detail-page").then((module) => ({ default: module.TransactionDetailPage })))
const TransactionsPage = lazy(() => import("@/pages/transactions-page").then((module) => ({ default: module.TransactionsPage })))
const LoginPage = lazy(() => import("@/pages/login-page").then((module) => ({ default: module.LoginPage })))
const ReconciliationPage = lazy(() => import("@/pages/reconciliation-page").then((module) => ({ default: module.ReconciliationPage })))

function RouteFallback() {
  return <div className="grid min-h-[60svh] place-items-center"><div className="text-center"><div className="mx-auto mb-2 size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /><p className="text-[10px] text-muted-foreground">Membuka data lokal…</p></div></div>
}

export default function App() {
  const [ready, setReady] = useState(false)
  const [device, setDevice] = useState<DeviceIdentity | null>(null)
  const [session, setSession] = useState<AuthSession | null>(null)

  useEffect(() => {
    void (async () => {
      const initializedDevice = await initializeDatabase()
      const draft = await db.drafts.get("active")
      if (draft) usePosStore.getState().hydrateCart(draft.cart)
      setDevice(initializedDevice)
      setSession(await getAuthSession())
      setReady(true)
    })()
  }, [])

  useEffect(() => {
    if (!session) return
    return startSyncScheduler()
  }, [session])

  if (!ready) return <main className="grid min-h-svh place-items-center bg-background text-foreground"><div className="text-center"><div className="mx-auto mb-3 grid size-9 place-items-center rounded-md bg-primary text-xs font-black text-primary-foreground">OP</div><p className="text-xs text-muted-foreground">Membuka database lokal…</p></div></main>
  if (!session && device) return <Suspense fallback={<RouteFallback />}><LoginPage device={device} onAuthenticated={setSession} /></Suspense>

  return (
    <BrowserRouter>
      <AppShell>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<CheckoutPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/transactions/:id" element={<TransactionDetailPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/sync" element={<SyncPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/reconciliation" element={session?.operator.role === "ADMIN" ? <ReconciliationPage /> : <Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AppShell>
      <Toaster theme="dark" position="top-center" richColors closeButton />
    </BrowserRouter>
  )
}
