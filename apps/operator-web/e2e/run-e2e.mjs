import { spawn } from "node:child_process"
import { once } from "node:events"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..")
const repositoryRoot = join(webRoot, "../..")

await run("docker", ["compose", "up", "-d", "--build"], repositoryRoot)
await waitFor(async () => {
  const response = await fetch("http://127.0.0.1:8080/health")
  const body = await response.json()
  return response.ok && body.data?.status === "healthy"
}, "full stack health")

const playwrightCli = join(webRoot, "node_modules/@playwright/test/cli.js")
await run(process.execPath, [playwrightCli, "test", ...process.argv.slice(2)], webRoot)
await verifyDegradedMode()

async function verifyDegradedMode() {
  await run("docker", ["compose", "stop", "rabbitmq"], repositoryRoot)
  try {
    await waitFor(async () => {
      const response = await fetch("http://127.0.0.1:8080/health")
      const body = await response.json()
      return body.data?.status === "degraded" && body.data?.dependencies.rabbitmq === "down"
    }, "RabbitMQ degraded health")
    const login = await fetch("http://127.0.0.1:8080/api/v1/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "owner@kedai-nusa.test", password: "owner123" }),
    })
    if (!login.ok) throw new Error(`REST degraded-mode login failed (${login.status})`)
  } finally {
    await run("docker", ["compose", "start", "rabbitmq"], repositoryRoot)
    await waitFor(async () => {
      const response = await fetch("http://127.0.0.1:8080/health")
      const body = await response.json()
      return body.data?.dependencies.rabbitmq === "up"
    }, "RabbitMQ recovery")
  }
}

async function run(command, arguments_, cwd) {
  const child = spawn(command, arguments_, { cwd, stdio: "inherit", shell: false })
  const [code] = await once(child, "exit")
  if (code !== 0) throw new Error(`${command} exited with code ${code ?? "null"}`)
}

async function waitFor(assertion, label) {
  const deadline = Date.now() + 90_000
  let lastError
  while (Date.now() < deadline) {
    try {
      if (await assertion()) return
    } catch (error) {
      lastError = error
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(`${label} did not become ready`, { cause: lastError })
}
