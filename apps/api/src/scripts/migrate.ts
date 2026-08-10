import { readdir, readFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { pool } from "../db.js"

const currentDir = dirname(fileURLToPath(import.meta.url))
const migrationsDir = join(currentDir, "../../migrations")

await pool.query("CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())")
const files = (await readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort()
for (const file of files) {
  const applied = await pool.query("SELECT 1 FROM schema_migrations WHERE version = $1", [file])
  if (applied.rows[0]) continue
  const sql = await readFile(join(migrationsDir, file), "utf8")
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    await client.query(sql)
    await client.query("INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING", [file])
    await client.query("COMMIT")
    console.log(`Applied ${file}`)
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}
await pool.end()
