import { workerPool } from "./db.js"
import { processInsightJobs } from "./modules/insights/processor.js"
import { processBackendOutbox } from "./modules/inventory/processor.js"
import { processReportingOutbox } from "./modules/reporting/projection.js"

const controller = new AbortController()

function stop(signal: string) {
  console.info(JSON.stringify({ level: "info", message: "worker stopping", signal }))
  controller.abort()
}

process.on("SIGINT", () => stop("SIGINT"))
process.on("SIGTERM", () => stop("SIGTERM"))

async function runLane(processLane: () => Promise<number>, idleMilliseconds: number) {
  while (!controller.signal.aborted) {
    try {
      const processed = await processLane()
      await wait(processed > 0 ? 100 : idleMilliseconds, controller.signal)
    } catch (error) {
      console.error(JSON.stringify({ level: "error", message: "worker lane failed", error }))
      await wait(idleMilliseconds, controller.signal)
    }
  }
}

try {
  await Promise.all([
    runLane(() => processBackendOutbox(workerPool), 1_000),
    runLane(() => processReportingOutbox(workerPool), 1_000),
    runLane(() => processInsightJobs(workerPool), 2_000),
  ])
} finally {
  await workerPool.end()
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
