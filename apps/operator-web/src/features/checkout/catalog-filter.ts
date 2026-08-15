export const catalogCategories = ["Semua", "Kopi", "Non Kopi", "Makanan"] as const
export type CatalogCategory = (typeof catalogCategories)[number]
