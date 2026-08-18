import { expect, test } from "@playwright/test"
import { randomUUID } from "node:crypto"

import {
  apiLogin,
  checkout,
  createProduct,
  credentials,
  enqueueSale,
  localState,
  loginOperatorUi,
  loginOwnerUi,
  salePayload,
  waitReceipt,
} from "./helpers"

test.describe.serial("K-POS cross-app workflow", () => {
  test("4. stock conflict is visible and voidable from Owner", async ({ page, request }) => {
    const entry = await apiLogin(request, "entry")
    const operator = await apiLogin(request, "operator", "KPOS-DEMO-DEVICE")
    const product = await createProduct(request, entry.access_token, { stock: 0 })
    const offlineUuid = await enqueueSale(
      request,
      operator.access_token,
      "KPOS-DEMO-DEVICE",
      salePayload(product),
    )
    await waitReceipt(request, operator.access_token, offlineUuid, "CONFLICT")

    await loginOwnerUi(page)
    await page.getByRole("button", { name: "Sync failures" }).click()
    const row = page.locator("article").filter({ hasText: offlineUuid })
    await expect(row).toBeVisible()
    await row.getByRole("button", { name: "Void" }).click()
    await expect(row).not.toBeVisible()
  })

  test("5. Entry can archive while an offline Operator keeps its cached catalog", async ({
    browser,
    request,
  }) => {
    const entry = await apiLogin(request, "entry")
    const product = await createProduct(request, entry.access_token, {
      name: `Stale Catalog ${randomUUID().slice(0, 6)}`,
      stock: 20,
    })
    const operatorContext = await browser.newContext()
    const entryContext = await browser.newContext()
    try {
      const operatorPage = await operatorContext.newPage()
      await loginOperatorUi(operatorPage)
      await expect(
        operatorPage.getByRole("button", { name: new RegExp(product.name) }),
      ).toBeVisible()
      await operatorContext.setOffline(true)

      const entryPage = await entryContext.newPage()
      await entryPage.goto("/entry/")
      await entryPage.getByLabel("Email").fill(credentials.entry.email)
      await entryPage.getByLabel("Password").fill(credentials.entry.password)
      await entryPage.getByRole("button", { name: "Masuk" }).click()
      await expect(entryPage.getByRole("heading", { name: "Catalog & inventory" })).toBeVisible()
      await entryPage.getByPlaceholder("Cari nama atau SKU").fill(product.sku)
      const card = entryPage.locator("article").filter({ hasText: product.sku })
      await card.getByRole("button", { name: "Arsip" }).click()
      await expect(card.getByText("Archived")).toBeVisible()

      await expect(
        operatorPage.getByRole("button", { name: new RegExp(product.name) }),
      ).toBeVisible()
    } finally {
      await operatorContext.close()
      await entryContext.close()
    }
  })

  test("6. invalid payment case becomes FAILED plus append-only void", async ({
    page,
    request,
  }) => {
    const entry = await apiLogin(request, "entry")
    const operator = await apiLogin(request, "operator", "KPOS-DEMO-DEVICE")
    const product = await createProduct(request, entry.access_token, {
      price: 12_347,
      stock: 10,
    })
    const sale = salePayload(product)
    await enqueueSale(request, operator.access_token, "KPOS-DEMO-DEVICE", sale)
    const receipt = await waitReceipt(request, operator.access_token, sale.offline_uuid)

    await loginOwnerUi(page)
    await page.getByRole("button", { name: "Payment cases" }).click()
    const amount = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(product.price)
    const paymentRow = page.locator(".table-row").filter({ hasText: amount }).first()
    await paymentRow.getByRole("button", { name: "Buka kasus" }).click()
    const reason = `Provider mismatch ${randomUUID().slice(0, 6)}`
    await page.getByLabel("Alasan pemeriksaan").fill(reason)
    await page.getByRole("button", { name: "Buka kasus" }).last().click()
    const caseRow = page.locator("article").filter({ hasText: reason })
    await caseRow.getByRole("button", { name: "Resolve" }).click()
    await page.getByLabel("Resolution note").fill("Provider confirms the payment never settled")
    await page.getByRole("button", { name: /Invalid—FAILED/ }).click()
    await expect(caseRow).not.toBeVisible()

    const original = await request.get(`/api/v1/transactions/${receipt.id_transaction}`, {
      headers: { authorization: `Bearer ${(await apiLogin(request, "owner")).access_token}` },
    })
    expect((await original.json()).data).toMatchObject({
      status: "CONFIRMED",
      effective_status: "VOIDED",
      payment: { status: "FAILED" },
    })
  })

  test("7. role isolation is enforced by UI and API", async ({ page, request }) => {
    await page.goto("/owner/")
    await page.getByLabel("Email").fill(credentials.entry.email)
    await page.getByLabel("Password").fill(credentials.entry.password)
    await page.getByRole("button", { name: "Masuk" }).click()
    await expect(page.getByText(/bukan Owner/)).toBeVisible()

    const operator = await apiLogin(request, "operator", "KPOS-DEMO-DEVICE")
    const entry = await apiLogin(request, "entry")
    expect(
      (await request.get("/api/v1/users", { headers: bearer(operator.access_token) })).status(),
    ).toBe(403)
    expect(
      (
        await request.get("/api/v1/owner/dashboard", {
          headers: bearer(entry.access_token),
        })
      ).status(),
    ).toBe(403)
  })

  test("8. device revocation preserves an offline queued sale", async ({
    page,
    context,
    request,
  }) => {
    const owner = await apiLogin(request, "owner")
    const created = await request.post("/api/v1/devices", {
      headers: bearer(owner.access_token),
      data: { name: `Revocation ${randomUUID().slice(0, 6)}` },
    })
    const pairingCode = (await created.json()).data.pairing_code as string
    const paired = await request.post("/api/v1/devices/pair", {
      data: { pairing_code: pairingCode, hardware_id: `hardware-${randomUUID()}` },
    })
    const deviceId = (await paired.json()).data.id_device as string
    await loginOperatorUi(page, deviceId)
    await context.setOffline(true)
    await checkout(page)
    await expect(page.getByText("Provisional tersimpan")).toBeVisible()
    await request.delete(`/api/v1/devices/${deviceId}`, { headers: bearer(owner.access_token) })
    const state = await localState(page)
    expect(state.sales).toHaveLength(1)
    expect(state.outbox).toHaveLength(1)
  })

  test("9. settled Operator sale converges into Owner reporting", async ({ browser, request }) => {
    const operatorContext = await browser.newContext()
    const ownerContext = await browser.newContext()
    try {
      const operatorPage = await operatorContext.newPage()
      await loginOperatorUi(operatorPage)
      await checkout(operatorPage)
      await expect(operatorPage.getByText("Penjualan settled")).toBeVisible({ timeout: 25_000 })

      const ownerSession = await apiLogin(request, "owner")
      await expect
        .poll(async () => {
          const response = await request.get("/api/v1/owner/dashboard", {
            headers: bearer(ownerSession.access_token),
          })
          const dashboard = (await response.json()).data as {
            top_products: Array<{ product_name: string }>
          }
          return dashboard.top_products.some((item) => item.product_name === "Kopi Susu Aren")
        })
        .toBe(true)

      const ownerPage = await ownerContext.newPage()
      await loginOwnerUi(ownerPage)
      await expect(ownerPage.getByText("Kopi Susu Aren", { exact: true })).toBeVisible({
        timeout: 20_000,
      })
    } finally {
      await operatorContext.close()
      await ownerContext.close()
    }
  })
})

function bearer(token: string) {
  return { authorization: `Bearer ${token}` }
}
