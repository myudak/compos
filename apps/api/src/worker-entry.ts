import { pool } from "./db.js"
import { processBackendOutbox } from "./modules/inventory/processor.js"

const controller = new AbortController()

function stop(signal: string) {
  console.info(JSON.stringify({ level: "info", message: "worker stopping", signal }))
  controller.abort()
}

process.on("SIGINT", () => stop("SIGINT"))
process.on("SIGTERM", () => stop("SIGTERM"))

try {
  while (!controller.signal.aborted) {
    const processed = await processBackendOutbox(pool)
    await wait(processed > 0 ? 100 : 1_000, controller.signal)
  }
} finally {
  await pool.end()
}

function wait(milliseconds: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, milliseconds)
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer)
        resolve()
      },
      { once: true },
    )
  })
}
