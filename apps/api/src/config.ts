import "dotenv/config"
import { z } from "zod"

const configSchema = z.object({
  DATABASE_URL: z.string().default("postgres://operator:operator@localhost:5432/operator_pos"),
  PORT: z.coerce.number().int().positive().default(3001),
  HOST: z.string().default("0.0.0.0"),
  JWT_SECRET: z.string().min(16).default("operator-pos-local-secret"),
  CORS_ORIGIN: z
    .string()
    .default(
      "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173",
    ),
  DEVICE_ACTIVATION_CODE: z.string().default("COMP18-DEMO"),
  DEMO_MERCHANT_CODE: z.string().default("KEDAI-NUSA"),
})

export const config = configSchema.parse(process.env)
