import { lazy, Suspense, useEffect, useState } from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { Toaster } from "sonner"

import { AppShell } from "@/components/app-shell"
import { initializeDatabase } from "@/lib/db"

const CheckoutPage = lazy(() => import("@/pages/checkout-page").then((module) => ({ default: module.CheckoutPage })))
const ProductsPage = lazy(() => import("@/pages/products-page").then((module) => ({ default: module.ProductsPage })))
const SettingsPage = lazy(() => import("@/pages/settings-page").then((module) => ({ default: module.SettingsPage })))
const SyncPage = lazy(() => import("@/pages/sync-page").then((module) => ({ default: module.SyncPage })))
const TransactionDetailPage = lazy(() => import("@/pages/transaction-detail-page").then((module) => ({ default: module.TransactionDetailPage })))
const TransactionsPage = lazy(() => import("@/pages/transactions-page").then((module) => ({ default: module.TransactionsPage })))

function RouteFallback() {
  return <div className="grid min-h-[60svh] place-items-center"><div className="text-center"><div className="mx-auto mb-2 size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /><p className="text-[10px] text-muted-foreground">Membuka data lokal…</p></div></div>
}

export default function App() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    void initializeDatabase().then(() => setReady(true))
  }, [])

  if (!ready) return <main className="grid min-h-svh place-items-center bg-background text-foreground"><div className="text-center"><div className="mx-auto mb-3 grid size-9 place-items-center rounded-md bg-primary text-xs font-black text-primary-foreground">OP</div><p className="text-xs text-muted-foreground">Membuka database lokal…</p></div></main>

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
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AppShell>
      <Toaster theme="dark" position="top-center" richColors closeButton />
    </BrowserRouter>
  )
}
