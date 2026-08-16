import { spawn, type ChildProcess } from "node:child_process"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import pg from "pg"

const currentDir = dirname(fileURLToPath(import.meta.url))
const repositoryRoot = join(currentDir, "../../../..")
const pnpmCommand =
  process.platform === "win32"
    ? { executable: process.env.ComSpec ?? "cmd.exe", prefix: ["/d", "/s", "/c", "pnpm"] }
    : { executable: "pnpm", prefix: [] }
const testDatabaseName = "operator_pos_test"
const sourceUrl = new URL(
  process.env.DATABASE_URL ?? "postgres://operator:operator@localhost:5432/operator_pos",
)
const testUrl = new URL(sourceUrl)
testUrl.pathname = `/${testDatabaseName}`
const adminUrl = new URL(sourceUrl)
adminUrl.pathname = "/postgres"
const environment = {
  ...process.env,
  DATABASE_URL: testUrl.toString(),
  API_URL: "http://127.0.0.1:3101",
  PORT: "3101",
  LOG_LEVEL: "warn",
}

if (!/^operator_pos_test$/i.test(testDatabaseName)) {
  throw new Error(`Refusing to recreate unexpected integration database '${testDatabaseName}'`)
}

const admin = new pg.Client({ connectionString: adminUrl.toString() })
let server: ChildProcess | undefined
let adminConnected = false

try {
  await admin.connect()
  adminConnected = true
  await admin.query(
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity
     WHERE datname = $1 AND pid <> pg_backend_pid()`,
    [testDatabaseName],
  )
  await admin.query(`DROP DATABASE IF EXISTS ${testDatabaseName}`)
  await admin.query(`CREATE DATABASE ${testDatabaseName}`)
  await Promise.all([
    run(["--filter", "@operator/api", "db:migrate"]),
    run(["--filter", "@operator/api", "db:migrate"]),
  ])
  await run(["--filter", "@operator/api", "db:seed"])
  server = spawnPnpm(
    ["--filter", "@operator/api", "exec", "tsx", "src/server.ts"],
    ["ignore", "pipe", "pipe"],
  )
  await waitForHealth(server)
  await run(["--filter", "@operator/api", "exec", "tsx", "src/scripts/failure-scenarios.ts"])
} finally {
  await stop(server)
  if (adminConnected) {
    await admin.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity
       WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [testDatabaseName],
    )
    await admin.query(`DROP DATABASE IF EXISTS ${testDatabaseName}`)
    await admin.end()
  }
}

function run(arguments_: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawnPnpm(arguments_, "inherit")
    child.once("error", reject)
    child.once("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`Command failed with exit code ${code ?? "null"}`)),
    )
  })
}

function spawnPnpm(arguments_: string[], stdio: "inherit" | ["ignore", "pipe", "pipe"]) {
  return spawn(pnpmCommand.executable, [...pnpmCommand.prefix, ...arguments_], {
    cwd: repositoryRoot,
    env: environment,
    stdio,
  })
}

async function waitForHealth(child: ChildProcess) {
  const deadline = Date.now() + 20_000
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error("Integration API exited before becoming healthy")
    try {
      const response = await fetch(`${environment.API_URL}/health`)
      if (response.ok) return
    } catch {
      // API is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error("Integration API did not become healthy within 20 seconds")
}

async function stop(child?: ChildProcess) {
  if (!child || child.exitCode !== null) return
  if (process.platform === "win32" && child.pid) {
    await new Promise<void>((resolve) => {
      const killer = spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
      })
      killer.once("exit", () => resolve())
      killer.once("error", () => resolve())
    })
    return
  }
  child.kill("SIGTERM")
  await new Promise<void>((resolve) => child.once("exit", () => resolve()))
}
