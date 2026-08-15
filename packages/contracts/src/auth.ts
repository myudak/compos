import { z } from "zod"

import { operatorAppRoleSchema } from "./primitives.js"

export const operatorSummarySchema = z.object({
  id: z.string().min(1),
  code: z.string().min(2).max(32).optional(),
  name: z.string().min(1).max(120),
  role: operatorAppRoleSchema,
})

export const loginRequestSchema = z.object({
  merchantCode: z.string().min(2).max(48),
  operatorCode: z.string().min(2).max(32),
  pin: z.string().regex(/^\d{4,8}$/, "PIN must contain 4 to 8 digits"),
  deviceId: z.string().min(8).max(128),
})

export const loginResponseSchema = z.object({
  token: z.string().min(1),
  expiresInSeconds: z.number().int().positive(),
  offlineLeaseExpiresAt: z.iso.datetime({ offset: true }),
  merchantId: z.string().min(1),
  operator: operatorSummarySchema,
})

export const logoutResponseSchema = z.object({ success: z.literal(true) })

export type OperatorSummary = z.infer<typeof operatorSummarySchema>
export type LoginRequest = z.infer<typeof loginRequestSchema>
export type LoginResponse = z.infer<typeof loginResponseSchema>
export type LogoutResponse = z.infer<typeof logoutResponseSchema>
