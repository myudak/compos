import { z } from "zod"

import { operatorSummarySchema } from "./auth.js"
import { productSchema } from "./catalog.js"

export const deviceSummarySchema = z.object({ id: z.string(), name: z.string() })

export const bootstrapResponseSchema = z.object({
  merchant: z.object({ id: z.string().min(1), name: z.string() }),
  device: deviceSummarySchema,
  operator: operatorSummarySchema,
  products: z.array(productSchema),
  serverTime: z.iso.datetime({ offset: true }),
  syncCursor: z.iso.datetime({ offset: true }),
})

export type DeviceSummary = z.infer<typeof deviceSummarySchema>
export type BootstrapResponse = z.infer<typeof bootstrapResponseSchema>
