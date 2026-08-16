import { existsSync, readdirSync, readFileSync } from "node:fs"
import { dirname, join, relative, resolve } from "node:path"

const ignoredDirectories = new Set([
  ".agents",
  ".claude",
  ".git",
  ".pnpm-store",
  "coverage",
  "dist",
  "node_modules",
  "playwright-report",
  "test-results",
])
const markdownFiles = findMarkdownFiles(".")

const missingLinks = []
let checkedLinks = 0

for (const file of markdownFiles) {
  const markdown = readFileSync(file, "utf8")
  const targets = [
    ...extractMatches(markdown, /!?\[[^\]]*\]\(([^)]+)\)/g),
    ...extractMatches(markdown, /(?:href|src)="([^"]+)"/g),
  ]

  for (const rawTarget of targets) {
    const target = normalizeTarget(rawTarget)
    if (!target || isExternalTarget(target)) continue

    checkedLinks += 1
    const localPath = resolve(dirname(file), decodeURIComponent(target.split(/[?#]/, 1)[0] ?? ""))
    if (!existsSync(localPath)) missingLinks.push(`${file} -> ${rawTarget}`)
  }
}

if (missingLinks.length > 0) {
  console.error(`Found ${missingLinks.length} broken local Markdown link(s):`)
  for (const link of missingLinks) console.error(`- ${link}`)
  process.exitCode = 1
} else {
  console.log(`Checked ${checkedLinks} local Markdown links across ${markdownFiles.length} files.`)
}

function extractMatches(markdown, pattern) {
  return [...markdown.matchAll(pattern)].map((match) => match[1]).filter(Boolean)
}

function normalizeTarget(rawTarget) {
  const withoutTitle = rawTarget
    .trim()
    .replace(/^<|>$/g, "")
    .split(/\s+["']/u, 1)[0]
  return withoutTitle ?? ""
}

function isExternalTarget(target) {
  return (
    target.startsWith("#") ||
    target.startsWith("http://") ||
    target.startsWith("https://") ||
    target.startsWith("mailto:") ||
    target.startsWith("data:")
  )
}

function findMarkdownFiles(directory) {
  const files = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue

    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...findMarkdownFiles(path))
    else if (entry.isFile() && entry.name.endsWith(".md")) files.push(relative(".", path))
  }
  return files
}
