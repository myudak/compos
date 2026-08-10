import { create } from "zustand"

import type { ConnectionState } from "@/lib/types"

type PosState = {
  connection: ConnectionState
  cart: Record<string, number>
  setConnection: (connection: ConnectionState) => void
  addItem: (productId: string) => void
  decrementItem: (productId: string) => void
  removeItem: (productId: string) => void
  clearCart: () => void
}

export const usePosStore = create<PosState>((set) => ({
  connection: navigator.onLine ? "ONLINE" : "OFFLINE",
  cart: {},
  setConnection: (connection) => set({ connection }),
  addItem: (productId) => set((state) => ({ cart: { ...state.cart, [productId]: (state.cart[productId] ?? 0) + 1 } })),
  decrementItem: (productId) => set((state) => {
    const next = { ...state.cart }
    const quantity = (next[productId] ?? 0) - 1
    if (quantity <= 0) delete next[productId]
    else next[productId] = quantity
    return { cart: next }
  }),
  removeItem: (productId) => set((state) => {
    const next = { ...state.cart }
    delete next[productId]
    return { cart: next }
  }),
  clearCart: () => set({ cart: {} }),
}))
