import { z } from "zod"

const moneySchema = z.number().int().nonnegative()

export const productSchema = z.object({
  id: z.string().min(1),
  sku: z.string().min(1).max(64),
  name: z.string().min(1).max(160),
  description: z.string().max(500).default(""),
  category: z.string().min(1).max(80),
  price: moneySchema,
  stock: z.number().int(),
  lowStockThreshold: z.number().int().nonnegative(),
  accent: z.string().min(1).max(40),
  active: z.boolean(),
  updatedAt: z.iso.datetime({ offset: true }),
})

export const productInputSchema = z.object({
  sku: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(500).default(""),
  category: z.string().trim().min(1).max(80),
  price: moneySchema,
  lowStockThreshold: z.number().int().nonnegative().default(0),
  accent: z.string().trim().min(1).max(40).default("cyan"),
})

export const productPatchSchema = productInputSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one product field is required")

export const productListResponseSchema = z.object({ products: z.array(productSchema) })

export type Product = z.infer<typeof productSchema>
export type ProductInput = z.infer<typeof productInputSchema>
export type ProductPatch = z.infer<typeof productPatchSchema>
export type ProductListResponse = z.infer<typeof productListResponseSchema>
