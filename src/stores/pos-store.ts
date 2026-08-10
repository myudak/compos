import { create } from "zustand"

import { db } from "@/lib/db"
import type { ConnectionState } from "@/lib/types"

type PosState = {
  connection: ConnectionState
  cart: Record<string, number>
  forcedOffline: boolean
  setConnection: (connection: ConnectionState) => void
  setForcedOffline: (forcedOffline: boolean) => void
  hydrateCart: (cart: Record<string, number>) => void
  addItem: (productId: string) => void
  decrementItem: (productId: string) => void
  removeItem: (productId: string) => void
  clearCart: () => void
}

export const usePosStore = create<PosState>((set) => ({
  connection: navigator.onLine ? "ONLINE" : "OFFLINE",
  cart: {},
  forcedOffline: false,
  setConnection: (connection) => set({ connection }),
  setForcedOffline: (forcedOffline) => set({ forcedOffline }),
  hydrateCart: (cart) => set({ cart }),
  addItem: (productId) => set((state) => {
    const cart = { ...state.cart, [productId]: (state.cart[productId] ?? 0) + 1 }
    void persistDraft(cart)
    return { cart }
  }),
  decrementItem: (productId) => set((state) => {
    const next = { ...state.cart }
    const quantity = (next[productId] ?? 0) - 1
    if (quantity <= 0) delete next[productId]
    else next[productId] = quantity
    void persistDraft(next)
    return { cart: next }
  }),
  removeItem: (productId) => set((state) => {
    const next = { ...state.cart }
    delete next[productId]
    void persistDraft(next)
    return { cart: next }
  }),
  clearCart: () => {
    void db.drafts.delete("active")
    set({ cart: {} })
  },
}))

async function persistDraft(cart: Record<string, number>) {
  if (Object.keys(cart).length === 0) {
    await db.drafts.delete("active")
    return
  }
  const existing = await db.drafts.get("active")
  const now = new Date().toISOString()
  await db.drafts.put({ id: "active", cart, transactionStatus: "PENDING", createdAt: existing?.createdAt ?? now, updatedAt: now })
}
