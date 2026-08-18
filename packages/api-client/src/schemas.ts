import { z } from "zod"

export const roleSchema = z.enum(["OWNER", "ENTRY", "OPERATOR"])
export const paymentMethodSchema = z.enum(["CASH", "STATIC_QRIS", "BANK_TRANSFER"])
export const paymentStatusSchema = z.enum(["VERIFIED", "FAILED"])
export const reconciliationStatusSchema = z.enum(["OPEN", "RESOLVED_VALID", "RESOLVED_INVALID"])
export const receiptStatusSchema = z.enum(["QUEUED", "PROCESSING", "SYNCED", "CONFLICT", "FAILED"])

export const apiErrorSchema = z.object({
  status: z.literal("error"),
  message: z.string(),
  error: z.object({
    code: z.string(),
    details: z.unknown().optional(),
    request_id: z.string(),
  }),
})

export function successSchema<T extends z.ZodType>(data: T) {
  return z.object({ status: z.literal("success"), message: z.string(), data })
}

export const userSchema = z.object({
  id_user: z.string(),
  id_merchant: z.string(),
  full_name: z.string(),
  email: z.string(),
  role: roleSchema,
})

export const loginResponseSchema = successSchema(
  z.object({
    access_token: z.string(),
    offline_lease: z.string().nullable(),
    expires_in_seconds: z.number().int().positive(),
    user: userSchema,
  }),
)

export const healthResponseSchema = successSchema(
  z.object({
    status: z.enum(["healthy", "degraded"]),
    dependencies: z.object({
      database: z.enum(["up", "down"]),
      rabbitmq: z.enum(["up", "down"]),
      reporting: z.enum(["fresh", "lagging"]),
    }),
    projection_lag_seconds: z.number().int(),
    timestamp: z.string(),
  }),
)

export const productSchema = z.object({
  id_product: z.string(),
  id_merchant: z.string(),
  sku: z.string(),
  name: z.string(),
  price: z.number().int().nonnegative(),
  image_url: z.string().nullable(),
  is_active: z.boolean(),
  catalog_version: z.number().int().positive(),
  archived_at: z.coerce.date().nullable(),
  updated_at: z.coerce.date(),
  inventory: z.object({ current_stock: z.number().int() }).nullable(),
})
export const productListResponseSchema = successSchema(
  z.object({
    items: z.array(productSchema),
    meta: z.object({ next_cursor: z.string().nullable(), limit: z.number().int() }),
  }),
)

export const syncAcceptedResponseSchema = successSchema(
  z.object({ accepted: z.number().int(), queued_at: z.string() }),
)
export const syncReceiptSchema = z.object({
  id_receipt: z.string(),
  offline_uuid: z.string(),
  status: receiptStatusSchema,
  id_transaction: z.string().nullable(),
  retryable: z.boolean(),
  last_error_code: z.string().nullable(),
  last_error_message: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  terminal_at: z.string().nullable(),
})
export const syncReceiptsResponseSchema = successSchema(
  z.object({ items: z.array(syncReceiptSchema) }),
)

export const ownerDashboardResponseSchema = successSchema(
  z.object({
    timezone: z.string(),
    from: z.string(),
    to: z.string(),
    gross_sales: z.number().int(),
    net_sales: z.number().int(),
    transaction_count: z.number().int(),
    average_order_value: z.number(),
    daily_series: z.array(
      z.object({
        date: z.string(),
        gross_sales: z.number().int(),
        net_sales: z.number().int(),
        transaction_count: z.number().int(),
      }),
    ),
    top_products: z.array(
      z.object({
        id_product: z.string(),
        product_name: z.string(),
        quantity: z.number().int(),
        gross_sales: z.number().int(),
        net_sales: z.number().int(),
      }),
    ),
    data_as_of: z.string().nullable(),
    projection_lag_seconds: z.number().int(),
  }),
)

export const paymentSchema = z.object({
  id_payment: z.string(),
  id_transaction: z.string(),
  amount: z.number().int(),
  method: paymentMethodSchema,
  status: paymentStatusSchema,
  created_at: z.string(),
  transaction: z.object({
    total: z.number().int(),
    created_at_local: z.string(),
    id_user: z.string(),
  }),
  reconciliations: z
    .array(z.object({ status: reconciliationStatusSchema }).passthrough())
    .optional(),
})
export const paymentListResponseSchema = successSchema(z.object({ items: z.array(paymentSchema) }))

export const reconciliationSchema = z.object({
  id_reconciliation: z.string(),
  id_payment: z.string(),
  status: reconciliationStatusSchema,
  reason: z.string(),
  evidence_note: z.string().nullable(),
  resolution_note: z.string().nullable(),
  created_at: z.string(),
  resolved_at: z.string().nullable(),
})
export const reconciliationListResponseSchema = successSchema(
  z.object({ items: z.array(reconciliationSchema.passthrough()) }),
)

export const managedUserSchema = userSchema.extend({
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
})
export const managedUserListResponseSchema = successSchema(
  z.object({ items: z.array(managedUserSchema) }),
)
export const managedUserResponseSchema = successSchema(managedUserSchema)

export const deviceSchema = z.object({
  id_device: z.string(),
  name: z.string(),
  status: z.enum(["UNPAIRED", "PAIRED", "REVOKED"]),
  is_active: z.boolean().optional(),
  pairing_code: z.string().nullable().optional(),
  pairing_expires_at: z.string().nullable().optional(),
  last_online_at: z.string().nullable().optional(),
  last_sync_at: z.string().nullable().optional(),
  created_at: z.string().optional(),
})
export const deviceListResponseSchema = successSchema(z.array(deviceSchema))
export const deviceResponseSchema = successSchema(deviceSchema)

export const productResponseSchema = successSchema(
  productSchema.omit({ inventory: true }).extend({
    inventory: z.object({ current_stock: z.number().int() }).nullable().optional(),
  }),
)
export const stockAdjustmentResponseSchema = successSchema(
  z.object({
    id_product: z.string(),
    previous_stock: z.number().int(),
    current_stock: z.number().int(),
    stock_history: z.record(z.string(), z.unknown()),
  }),
)
export const stockHistorySchema = z.object({
  id_stock_history: z.string(),
  movement_type: z.string(),
  quantity: z.number().int(),
  notes: z.string().nullable(),
  date: z.string(),
})
export const stockHistoryResponseSchema = successSchema(z.array(stockHistorySchema))

export const transactionSummarySchema = z.object({
  id_transaction: z.string(),
  offline_uuid: z.string(),
  total: z.number().int(),
  status: z.string(),
  sync_status: z.string(),
  effective_status: z.string(),
  created_at_local: z.string(),
  payment: z
    .object({
      id_payment: z.string(),
      method: paymentMethodSchema,
      status: paymentStatusSchema,
    })
    .nullable(),
})
export const transactionListResponseSchema = successSchema(
  z.object({
    items: z.array(transactionSummarySchema.passthrough()),
    meta: z.object({ next_cursor: z.string().nullable(), limit: z.number().int() }),
  }),
)

export const auditEventSchema = z.object({
  id_event: z.string(),
  action: z.string(),
  entity_type: z.string(),
  entity_id: z.string().nullable(),
  created_at: z.string(),
  actor: z.object({ full_name: z.string(), role: roleSchema }).nullable(),
})
export const auditEventListResponseSchema = successSchema(
  z.object({
    items: z.array(auditEventSchema.passthrough()),
    meta: z.object({ next_cursor: z.string().nullable() }),
  }),
)

export const mutationResponseSchema = successSchema(z.record(z.string(), z.unknown()))

export type Role = z.infer<typeof roleSchema>
export type ProductDto = z.infer<typeof productSchema>
export type SyncReceiptDto = z.infer<typeof syncReceiptSchema>
export type ManagedUserDto = z.infer<typeof managedUserSchema>
export type DeviceDto = z.infer<typeof deviceSchema>
export type PaymentDto = z.infer<typeof paymentSchema>
export type ReconciliationDto = z.infer<typeof reconciliationSchema>
