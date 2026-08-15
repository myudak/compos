import { config } from "../config.js"
import { pool } from "../db.js"

const databaseUrl = new URL(config.DATABASE_URL)
const databaseName = databaseUrl.pathname.replace(/^\//, "")

if (!/^operator_pos(?:_[a-z0-9_]+)?$/i.test(databaseName)) {
  throw new Error(
    `Refusing to reset database '${databaseName}'. The name must be operator_pos or operator_pos_*`,
  )
}

console.warn(`Resetting project database '${databaseName}' on '${databaseUrl.hostname}'`)
await pool.query("DROP SCHEMA public CASCADE")
await pool.query("CREATE SCHEMA public")
await pool.query("GRANT ALL ON SCHEMA public TO public")
await pool.end()
