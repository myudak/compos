import { expect, test } from "@playwright/test"
import { randomUUID } from "node:crypto"

const apiUrl = "http://127.0.0.1:3102"
const ownerUrl = "http://127.0.0.1:4174/owner/"

test("9. Owner sees a settled sale and completes a local insight", async ({ page, request }) => {
  const deviceId = `e2e-owner-${randomUUID()}`
  await request.post(`${apiUrl}/v1/devices/register`, {
    data: {
      merchantCode: "KEDAI-NUSA",
      activationCode: "COMPOS-DEMO",
      deviceId,
      deviceName: "E2E Owner Device",
    },
  })
  const [cashierResponse, ownerResponse] = await Promise.all([
    request.post(`${apiUrl}/v1/auth/login`, {
      data: { merchantCode: "KEDAI-NUSA", operatorCode: "RANI", pin: "1234", deviceId },
    }),
    request.post(`${apiUrl}/v1/auth/login`, {
      data: { merchantCode: "KEDAI-NUSA", operatorCode: "OWNER", pin: "7777", deviceId },
    }),
  ])
  const cashier = (await cashierResponse.json()) as {
    token: string
    merchantId: string
    operator: { id: string }
  }
  const owner = (await ownerResponse.json()) as { token: string }
  const transactionId = randomUUID()
  const settlement = await request.post(`${apiUrl}/v1/sync/transactions`, {
    headers: { authorization: `Bearer ${cashier.token}` },
    data: {
      schemaVersion: 1,
      merchantId: cashier.merchantId,
      deviceId,
      batchId: randomUUID(),
      transactions: [
        {
          transactionId,
          invoiceNumber: `OWN-${transactionId.slice(0, 8)}`,
          operatorId: cashier.operator.id,
          transactionStatus: "CONFIRMED",
          paymentMethod: "CASH",
          paymentVerificationType: "SYSTEM_VERIFIABLE",
          subtotal: 22_000,
          discount: 0,
          tax: 0,
          total: 22_000,
          createdAtDevice: new Date().toISOString(),
          items: [
            {
              productId: "prd-aren",
              name: "Kopi Susu Aren",
              quantity: 1,
              unitPrice: 22_000,
              subtotal: 22_000,
            },
          ],
        },
      ],
    },
  })
  expect(settlement.ok()).toBe(true)
  await expect
    .poll(async () => {
      const response = await request.get(`${apiUrl}/v1/owner/dashboard`, {
        headers: { authorization: `Bearer ${owner.token}` },
      })
      const dashboard = (await response.json()) as {
        topProducts: Array<{ name: string }>
      }
      return dashboard.topProducts.some((product) => product.name === "Kopi Susu Aren")
    })
    .toBe(true)

  await page.goto(ownerUrl)
  await page.getByRole("button", { name: "Masuk" }).click()
  await expect(page.getByRole("heading", { name: "Business pulse" })).toBeVisible()
  await expect(page.getByText("Kopi Susu Aren", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Generate insight" }).click()
  await expect(page.getByText(/Local analytics/i).first()).toBeVisible({ timeout: 15_000 })
})
