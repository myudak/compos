import { z } from "zod"

import { operatorAppRoleSchema } from "./primitives.js"

export const adminOperatorSchema = z.object({
  id: z.string().min(1),
  code: z.string(),
  name: z.string(),
  role: operatorAppRoleSchema,
  active: z.boolean(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
})

export const createOperatorRequestSchema = z.object({
  code: z.string().trim().min(2).max(32),
  name: z.string().trim().min(1).max(120),
  role: operatorAppRoleSchema,
  pin: z.string().regex(/^\d{4,8}$/, "PIN must contain 4 to 8 digits"),
})

export const updateOperatorRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    role: operatorAppRoleSchema.optional(),
    active: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required")

export const resetPinRequestSchema = z.object({
  pin: z.string().regex(/^\d{4,8}$/, "PIN must contain 4 to 8 digits"),
})

export const operatorListResponseSchema = z.object({ operators: z.array(adminOperatorSchema) })

export const adminDeviceSchema = z.object({
  id: z.string(),
  name: z.string(),
  registeredAt: z.iso.datetime({ offset: true }),
  revokedAt: z.iso.datetime({ offset: true }).nullable(),
})

export const deviceListResponseSchema = z.object({ devices: z.array(adminDeviceSchema) })

export type AdminOperator = z.infer<typeof adminOperatorSchema>
export type CreateOperatorRequest = z.infer<typeof createOperatorRequestSchema>
export type UpdateOperatorRequest = z.infer<typeof updateOperatorRequestSchema>
export type ResetPinRequest = z.infer<typeof resetPinRequestSchema>
export type AdminDevice = z.infer<typeof adminDeviceSchema>
