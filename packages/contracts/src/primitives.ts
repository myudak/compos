import { z } from "zod"

export const roleSchema = z.enum(["OPERATOR", "ADMIN", "OWNER"])
export const operatorAppRoleSchema = z.enum(["OPERATOR", "ADMIN"])
export const paymentMethodSchema = z.enum(["CASH", "STATIC_QRIS", "TRANSFER"])
export const paymentVerificationTypeSchema = z.enum(["SYSTEM_VERIFIABLE", "OPERATOR_ASSERTED"])
export const transactionStatusSchema = z.enum(["PENDING", "CONFIRMED", "VOIDED"])
export const settlementStatusSchema = z.enum(["PROVISIONAL", "SETTLED"])
export const syncStatusSchema = z.enum(["LOCAL_ONLY", "SYNCING", "SYNCED", "FAILED"])
export const syncResultStatusSchema = z.enum([
  "ACCEPTED",
  "ALREADY_PROCESSED",
  "REJECTED_PERMANENT",
  "RETRYABLE_ERROR",
])

export const errorCodeSchema = z.enum([
  "INVALID_REQUEST",
  "INVALID_CREDENTIALS",
  "AUTH_REQUIRED",
  "AUTH_EXPIRED",
  "SESSION_REVOKED",
  "FORBIDDEN",
  "DEVICE_REVOKED_OR_UNKNOWN",
  "NOT_FOUND",
  "CONFLICT",
  "FINAL_ADMIN_REQUIRED",
  "ID_REUSE_PAYLOAD_MISMATCH",
  "INTERNAL_ERROR",
])

export const apiErrorResponseSchema = z.object({
  code: errorCodeSchema,
  message: z.string().min(1),
  details: z.unknown().optional(),
  requestId: z.string().min(1),
})

export type Role = z.infer<typeof roleSchema>
export type OperatorAppRole = z.infer<typeof operatorAppRoleSchema>
export type PaymentMethod = z.infer<typeof paymentMethodSchema>
export type PaymentVerificationType = z.infer<typeof paymentVerificationTypeSchema>
export type TransactionStatus = z.infer<typeof transactionStatusSchema>
export type SettlementStatus = z.infer<typeof settlementStatusSchema>
export type SyncStatus = z.infer<typeof syncStatusSchema>
export type SyncResultStatus = z.infer<typeof syncResultStatusSchema>
export type ErrorCode = z.infer<typeof errorCodeSchema>
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>
