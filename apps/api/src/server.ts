import { buildApp } from "./app.js"
import { config } from "./config.js"
import { pool } from "./db.js"

const app = await buildApp(pool)

async function shutdown(signal: string) {
  app.log.info({ signal }, "shutting down")
  await app.close()
  await pool.end()
  process.exit(0)
}

process.on("SIGINT", () => void shutdown("SIGINT"))
process.on("SIGTERM", () => void shutdown("SIGTERM"))

await app.listen({ host: config.HOST, port: config.PORT })
