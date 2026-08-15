import { z } from "zod"

import { settlementStatusSchema, syncResultStatusSchema } from "./primitives.js"
export const syncEnvelopeSchema = z.object({
  schemaVersion: z.literal(1),
  merchantId: z.string().min(1),
  deviceId: z.string().min(8).max(128),
  batchId: z.string().min(8).max(128),
  transactions: z.array(z.unknown()).min(1).max(25),
})

export const syncResultSchema = z.object({
  transactionId: z.string(),
  status: syncResultStatusSchema,
  settlementStatus: settlementStatusSchema.extract(["SETTLED"]).optional(),
  receivedAtBackend: z.iso.datetime({ offset: true }).optional(),
  reason: z.string().optional(),
})

export const syncResponseSchema = z.object({
  schemaVersion: z.literal(1),
  batchId: z.string(),
  results: z.array(syncResultSchema),
})

export type SyncEnvelope = z.infer<typeof syncEnvelopeSchema>
export type SyncResult = z.infer<typeof syncResultSchema>
export type SyncResponse = z.infer<typeof syncResponseSchema>
