import { expect, test } from "@playwright/test"

import { checkout, localState, loginOperatorUi } from "./helpers"

test.describe.serial("Operator offline-first flow", () => {
  test("1. offline checkout survives a browser reload", async ({ page, context }) => {
    await loginOperatorUi(page)
    await context.setOffline(true)
    await checkout(page)
    await expect(page.getByText("Provisional tersimpan")).toBeVisible()
    await page.getByRole("button", { name: "Transaksi baru" }).click()
    await page.reload()
    await expect(page.getByText("Selamat bekerja, Rani Operator")).toBeVisible()
    const state = await localState(page)
    expect(state.sales).toHaveLength(1)
    expect(state.outbox).toHaveLength(1)
  })

  test("2. reconnect automatically settles the queued sale", async ({ page, context }) => {
    await loginOperatorUi(page)
    await context.setOffline(true)
    await checkout(page)
    await expect(page.getByText("Provisional tersimpan")).toBeVisible()
    await context.setOffline(false)
    await expect(page.getByText("Penjualan settled")).toBeVisible({ timeout: 25_000 })
    await expect.poll(async () => (await localState(page)).outbox.length).toBe(0)
  })

  test("3. dropped enqueue response retries without duplicate business effect", async ({
    page,
    request,
  }) => {
    await loginOperatorUi(page)
    let dropped = false
    await page.route("**/api/v1/sync", async (route) => {
      if (dropped) return route.continue()
      dropped = true
      await route.fetch()
      await route.abort("failed")
    })
    await checkout(page)
    await expect(page.getByText("Provisional tersimpan")).toBeVisible()
    await page.getByRole("button", { name: "Transaksi baru" }).click()
    await expect(page.getByText(/transaksi sudah settled/)).toBeVisible({ timeout: 25_000 })
    const state = await localState(page)
    const saleId = state.sales[0]!.id
    const response = await request.get("/api/v1/transactions?limit=100", {
      headers: { authorization: `Bearer ${state.session.token}` },
    })
    const rows = ((await response.json()).data.items as Array<{ offline_uuid: string }>).filter(
      (item) => item.offline_uuid === saleId,
    )
    expect(rows).toHaveLength(1)
  })
})
