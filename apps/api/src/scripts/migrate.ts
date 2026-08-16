import { readdir, readFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { pool } from "../db.js"

const currentDir = dirname(fileURLToPath(import.meta.url))
const migrationsDir = join(currentDir, "../../migrations")
const migrationLockKey = "compos_schema_migrations"
const client = await pool.connect()

try {
  await client.query("SELECT pg_advisory_lock(hashtext($1))", [migrationLockKey])
  await client.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
  )

  const files = (await readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort()
  for (const file of files) {
    await client.query("BEGIN")
    try {
      const applied = await client.query("SELECT 1 FROM schema_migrations WHERE version = $1", [
        file,
      ])
      if (!applied.rows[0]) {
        const sql = await readFile(join(migrationsDir, file), "utf8")
        await client.query(sql)
        await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [file])
        console.log(`Applied ${file}`)
      }
      await client.query("COMMIT")
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    }
  }
} finally {
  await client.query("SELECT pg_advisory_unlock(hashtext($1))", [migrationLockKey])
  client.release()
  await pool.end()
}
