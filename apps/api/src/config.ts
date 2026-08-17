import "dotenv/config"
import { fileURLToPath } from "node:url"

import { z } from "zod"

const defaultWebDistPath = fileURLToPath(new URL("../../operator-web/dist", import.meta.url))
const defaultOwnerWebDistPath = fileURLToPath(new URL("../../owner-web/dist", import.meta.url))

const configSchema = z.object({
  DATABASE_URL: z.string().default("postgres://operator:operator@localhost:5432/operator_pos"),
  PORT: z.coerce.number().int().positive().default(3001),
  HOST: z.string().default("0.0.0.0"),
  JWT_SECRET: z.string().min(16).default("operator-pos-local-secret"),
  CORS_ORIGIN: z
    .string()
    .default(
      "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:4173,http://127.0.0.1:4173,http://localhost:4174,http://127.0.0.1:4174,https://compos.myudak.com",
    ),
  DEVICE_ACTIVATION_CODE: z.string().default("COMPOS-DEMO"),
  DEMO_MERCHANT_CODE: z.string().default("KEDAI-NUSA"),
  SERVE_WEB: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  WEB_DIST_PATH: z.string().min(1).default(defaultWebDistPath),
  OWNER_WEB_DIST_PATH: z.string().min(1).default(defaultOwnerWebDistPath),
  OPERATIONAL_DB_POOL_MAX: z.coerce.number().int().positive().default(12),
  ADMIN_DB_POOL_MAX: z.coerce.number().int().positive().default(4),
  REPORTING_DB_POOL_MAX: z.coerce.number().int().positive().default(4),
  WORKER_DB_POOL_MAX: z.coerce.number().int().positive().default(4),
  AI_INSIGHT_BASE_URL: z.string().url().optional(),
  AI_INSIGHT_API_KEY: z.string().min(1).optional(),
  AI_INSIGHT_MODEL: z.string().min(1).default("gpt-4.1-mini"),
  AI_INSIGHT_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
})

export const config = configSchema.parse(process.env)
