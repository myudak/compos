import { useEffect, useState } from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { Toaster } from "sonner"

import { AppShell } from "@/components/app-shell"
import { initializeDatabase } from "@/lib/db"
import { CheckoutPage } from "@/pages/checkout-page"
import { ProductsPage } from "@/pages/products-page"
import { SettingsPage } from "@/pages/settings-page"
import { SyncPage } from "@/pages/sync-page"
import { TransactionDetailPage } from "@/pages/transaction-detail-page"
import { TransactionsPage } from "@/pages/transactions-page"

export default function App() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    void initializeDatabase().then(() => setReady(true))
  }, [])

  if (!ready) return <main className="grid min-h-svh place-items-center bg-background text-foreground"><div className="text-center"><div className="mx-auto mb-3 grid size-9 place-items-center rounded-md bg-primary text-xs font-black text-primary-foreground">OP</div><p className="text-xs text-muted-foreground">Membuka database lokal…</p></div></main>

  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<CheckoutPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/transactions/:id" element={<TransactionDetailPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/sync" element={<SyncPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
      <Toaster theme="dark" position="top-center" richColors closeButton />
    </BrowserRouter>
  )
}
