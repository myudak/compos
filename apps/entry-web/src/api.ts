import {
  loginResponseSchema,
  mutationResponseSchema,
  productListResponseSchema,
  productResponseSchema,
  requestKpos,
  resolveApiUrl,
  stockAdjustmentResponseSchema,
  stockHistoryResponseSchema,
  type ProductDto,
} from "@k-pos/api-client"

const API_URL = resolveApiUrl(import.meta.env.VITE_API_URL, import.meta.env.DEV)
const SESSION_KEY = "kpos-entry-session"

export type EntrySession = {
  token: string
  name: string
  email: string
  merchantId: string
}

export async function loginEntry(email: string, password: string) {
  const response = await requestKpos(API_URL, "/api/v1/auth/login", loginResponseSchema, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })
  if (response.data.user.role !== "ENTRY") {
    const destination = response.data.user.role === "OWNER" ? "/owner/" : "/"
    throw new Error(`Akun ini bukan Entry. Buka ${destination === "/" ? "Operator" : "Owner"} app.`)
  }
  const session: EntrySession = {
    token: response.data.access_token,
    name: response.data.user.full_name,
    email: response.data.user.email,
    merchantId: response.data.user.id_merchant,
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return session
}

export function storedEntrySession(): EntrySession | null {
  const raw = localStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as EntrySession
  } catch {
    localStorage.removeItem(SESSION_KEY)
    return null
  }
}

export async function logoutEntry(session: EntrySession) {
  try {
    await requestKpos(
      API_URL,
      "/api/v1/auth/logout",
      mutationResponseSchema,
      { method: "POST" },
      session.token,
    )
  } catch {
    // Logout lokal tetap harus bisa selesai ketika token sudah expired.
  }
  localStorage.removeItem(SESSION_KEY)
}

export async function listProducts(session: EntrySession, includeArchived = true) {
  const query = includeArchived ? "?limit=100" : "?limit=100&is_active=true"
  return (
    await requestKpos(
      API_URL,
      `/api/v1/products${query}`,
      productListResponseSchema,
      {},
      session.token,
    )
  ).data.items
}

export async function saveProduct(
  session: EntrySession,
  input: { id?: string; name: string; sku: string; price: number; image?: File },
) {
  const body = new FormData()
  body.set("name", input.name)
  body.set("sku", input.sku)
  body.set("price", String(input.price))
  if (input.image) body.set("image", input.image)
  return (
    await requestKpos(
      API_URL,
      input.id ? `/api/v1/products/${input.id}` : "/api/v1/products",
      productResponseSchema,
      { method: input.id ? "PATCH" : "POST", body },
      session.token,
    )
  ).data
}

export async function setProductArchived(
  session: EntrySession,
  product: ProductDto,
  archived: boolean,
) {
  return (
    await requestKpos(
      API_URL,
      `/api/v1/products/${product.id_product}/${archived ? "archive" : "restore"}`,
      productResponseSchema,
      { method: "POST" },
      session.token,
    )
  ).data
}

export async function adjustStock(
  session: EntrySession,
  productId: string,
  quantity: number,
  notes: string,
) {
  return (
    await requestKpos(
      API_URL,
      `/api/v1/products/${productId}/stock-adjustments`,
      stockAdjustmentResponseSchema,
      { method: "POST", body: JSON.stringify({ quantity, notes }) },
      session.token,
    )
  ).data
}

export async function getStockHistory(session: EntrySession, productId: string) {
  return (
    await requestKpos(
      API_URL,
      `/api/v1/products/${productId}/stock-history`,
      stockHistoryResponseSchema,
      {},
      session.token,
    )
  ).data
}
