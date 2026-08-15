import { randomUUID } from "node:crypto"

type Request = <T>(path: string, init?: RequestInit) => Promise<T>
type Session = { token: string; operator: { id: string }; merchantId: string }

export async function verifyAdministration(input: {
  request: Request
  admin: Session
  operatorDeviceId: string
  registerOtherMerchant: () => Promise<void>
  loginOtherMerchant: () => Promise<Session>
}) {
  const headers = { authorization: `Bearer ${input.admin.token}` }
  const operatorList = await input.request<{ operators: unknown[] }>("/v1/admin/operators", {
    headers,
  })
  const deviceList = await input.request<{ devices: unknown[] }>("/v1/admin/devices", { headers })
  if (operatorList.operators.length < 2 || deviceList.devices.length < 2) {
    throw new Error("merchant-scoped operator/device administration list is incomplete")
  }

  const operatorCode = `TST${randomUUID().slice(0, 6).toUpperCase()}`
  const createdOperator = await input.request<{ operator: { id: string } }>("/v1/admin/operators", {
    method: "POST",
    headers,
    body: JSON.stringify({
      code: operatorCode,
      name: "Integration Cashier",
      role: "OPERATOR",
      pin: "4567",
    }),
  })
  await input.request(`/v1/admin/operators/${createdOperator.operator.id}/reset-pin`, {
    method: "POST",
    headers,
    body: JSON.stringify({ pin: "5678" }),
  })
  await input.request(`/v1/admin/operators/${createdOperator.operator.id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ active: false }),
  })
  const inactiveLogin = await rejectedStatus(() =>
    input.request("/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({
        merchantCode: "KEDAI-NUSA",
        operatorCode,
        pin: "5678",
        deviceId: input.operatorDeviceId,
      }),
    }),
  )
  if (inactiveLogin !== 401) throw new Error("deactivated operator was still able to login")
  const selfDeactivation = await rejectedStatus(() =>
    input.request(`/v1/admin/operators/${input.admin.operator.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ active: false }),
    }),
  )
  if (selfDeactivation !== 409) throw new Error("admin self-deactivation policy was not enforced")

  const createdProduct = await input.request<{ product: { id: string } }>("/v1/admin/products", {
    method: "POST",
    headers,
    body: JSON.stringify({
      sku: `TST-${randomUUID().slice(0, 8)}`,
      name: "Integration Catalog Item",
      description: "Created by isolated integration test",
      category: "Test",
      price: 10_000,
      lowStockThreshold: 1,
      accent: "#06b6d4",
    }),
  })
  const updatedProduct = await input.request<{ product: { price: number } }>(
    `/v1/admin/products/${createdProduct.product.id}`,
    { method: "PATCH", headers, body: JSON.stringify({ price: 11_000 }) },
  )
  if (updatedProduct.product.price !== 11_000) throw new Error("catalog price update was lost")
  await input.request(`/v1/admin/products/${createdProduct.product.id}/archive`, {
    method: "POST",
    headers,
  })
  await input.request(`/v1/admin/products/${createdProduct.product.id}/restore`, {
    method: "POST",
    headers,
  })

  await input.registerOtherMerchant()
  const otherAdmin = await input.loginOtherMerchant()
  const isolationStatus = await rejectedStatus(() =>
    input.request(`/v1/admin/products/${createdProduct.product.id}`, {
      method: "PATCH",
      headers: { authorization: `Bearer ${otherAdmin.token}` },
      body: JSON.stringify({ price: 1 }),
    }),
  )
  if (isolationStatus !== 404) throw new Error("merchant catalog isolation was not enforced")

  return {
    operatorId: createdOperator.operator.id,
    productId: createdProduct.product.id,
  }
}

async function rejectedStatus(operation: () => Promise<unknown>) {
  try {
    await operation()
    return 0
  } catch (error) {
    return (error as { status?: number }).status ?? 0
  }
}
