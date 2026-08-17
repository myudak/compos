import { buildApp } from "./app.js"
import { config } from "./config.js"
import { adminPool, appPools, pool, reportingPool } from "./db.js"

const app = await buildApp(appPools)

async function shutdown(signal: string) {
  app.log.info({ signal }, "shutting down")
  await app.close()
  await Promise.all([pool.end(), adminPool.end(), reportingPool.end()])
  process.exit(0)
}

process.on("SIGINT", () => void shutdown("SIGINT"))
process.on("SIGTERM", () => void shutdown("SIGTERM"))

await app.listen({ host: config.HOST, port: config.PORT })
