import { loginResponseSchema, productListResponseSchema, successSchema } from "@k-pos/api-client"
import { z } from "zod"

import { requestApi } from "@/infrastructure/api/kpos-client"
import { replaceCatalog } from "@/infrastructure/persistence/catalog-repository"
import { saveDeviceIdentity } from "@/infrastructure/persistence/device-repository"
import type { AuthSession, DeviceIdentity, Product } from "@/infrastructure/persistence/models"
import { saveAuthSession } from "@/infrastructure/persistence/session-repository"
import { writeSetting } from "@/infrastructure/persistence/settings-repository"

export async function activateAndLogin(input: {
  email: string
  password: string
  device: DeviceIdentity
}): Promise<AuthSession> {
  const response = await requestApi("/api/v1/auth/login", loginResponseSchema, {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      device_id: input.device.id,
    }),
  })
  const result = response.data
  if (result.user.role === "OWNER") {
    window.location.assign("/owner/")
    throw new Error("Akun Owner dibuka melalui K-POS Owner.")
  }
  if (result.user.role === "ENTRY") {
    window.location.assign("/entry/")
    throw new Error("Akun Entry dibuka melalui K-POS Entry.")
  }
  if (!result.offline_lease) throw new Error("Backend tidak menerbitkan offline lease Operator")
  const session: AuthSession = {
    token: result.access_token,
    merchantId: result.user.id_merchant,
    operator: {
      id: result.user.id_user,
      name: result.user.full_name,
      role: "OPERATOR",
    },
    offlineLease: result.offline_lease,
    expiresAt: new Date(Date.now() + result.expires_in_seconds * 1_000).toISOString(),
    offlineLeaseExpiresAt: jwtExpiry(result.offline_lease),
  }
  await saveAuthSession(session)
  await saveDeviceIdentity({ ...input.device, registeredAt: new Date().toISOString() })
  return session
}

export async function bootstrapLocalData(session: AuthSession) {
  const response = await requestApi(
    "/api/v1/products?is_active=true&limit=100",
    productListResponseSchema,
    {},
    session.token,
  )
  const products: Product[] = response.data.items.map((product) => ({
    id: product.id_product,
    sku: product.sku,
    name: product.name,
    description: "",
    category: "Menu",
    price: product.price,
    stock: product.inventory?.current_stock ?? 0,
    accent: "#06b6d4",
    active: product.is_active,
    catalogVersion: product.catalog_version,
    updatedAt: product.updated_at.toISOString(),
  }))
  await replaceCatalog(products)
  await writeSetting(
    "merchantProfile",
    JSON.stringify({ id: session.merchantId, name: "Kedai Nusa" }),
  )
  return products
}

export async function logoutOnline(session: AuthSession) {
  return requestApi(
    "/api/v1/auth/logout",
    successSchema(z.object({ success: z.literal(true) })),
    { method: "POST" },
    session.token,
  )
}

function jwtExpiry(token: string): string {
  const payload = token.split(".")[1]
  if (!payload) throw new Error("Offline lease tidak valid")
  const base64 = payload.replaceAll("-", "+").replaceAll("_", "/")
  const normalized = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")
  const decoded = JSON.parse(atob(normalized)) as { exp?: number }
  if (!decoded.exp) throw new Error("Offline lease tidak memiliki expiry")
  return new Date(decoded.exp * 1_000).toISOString()
}
