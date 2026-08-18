import { readFile } from "node:fs/promises"
import { resolve } from "node:path"

const repositoryRoot = resolve(import.meta.dirname, "..")
const backendContractPath = resolve(repositoryRoot, "../k-pos-be/openapi.json")
const pinnedContractPath = resolve(repositoryRoot, "packages/api-client/openapi.json")

const [backendSource, pinnedSource] = await Promise.all([
  readFile(backendContractPath, "utf8"),
  readFile(pinnedContractPath, "utf8"),
])

const backendContract = JSON.parse(backendSource)
const pinnedContract = JSON.parse(pinnedSource)

if (stableJson(backendContract) !== stableJson(pinnedContract)) {
  console.error("OpenAPI snapshot drift terdeteksi.")
  console.error("Copy ../k-pos-be/openapi.json ke packages/api-client/openapi.json,")
  console.error("jalankan pnpm openapi:generate, lalu review perubahan client sebelum commit.")
  process.exitCode = 1
} else {
  console.log("OpenAPI snapshot sesuai dengan backend canonical.")
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`
  }
  return JSON.stringify(value)
}
