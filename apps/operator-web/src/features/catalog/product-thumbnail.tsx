import { IconCoffee, IconGlass, IconShoppingBag } from "@tabler/icons-react"

import { cn } from "@/shared/lib/utils"

type ProductThumbnailData = {
  sku: string
  name: string
  category: string
  accent: string
}

const imageBySku: Readonly<Record<string, string>> = {
  "KSA-01": "/products/kopi-susu-aren.png",
  "IA-01": "/products/iced-americano.png",
  "CL-01": "/products/caramel-latte.png",
  "MC-01": "/products/matcha-cloud.png",
  "CS-01": "/products/choco-sea-salt.png",
  "YS-01": "/products/yuzu-sparkling.png",
  "NAM-01": "/products/nasi-ayam-matah.png",
  "AC-01": "/products/aren-croffle.png",
}

export function ProductThumbnail({
  product,
  className,
}: {
  product: ProductThumbnailData
  className?: string
}) {
  const image = imageBySku[product.sku]
  const Icon =
    product.category === "Kopi"
      ? IconCoffee
      : product.category === "Makanan"
        ? IconShoppingBag
        : IconGlass

  return (
    <div
      className={cn("grid place-items-center overflow-hidden bg-secondary", className)}
      style={{
        background: `linear-gradient(145deg, color-mix(in srgb, ${product.accent} 16%, #18181b), #151517)`,
      }}
    >
      {image ? (
        <img
          src={image}
          alt=""
          loading="lazy"
          decoding="async"
          className="size-full object-cover transition-transform duration-200 group-hover:scale-[1.025]"
        />
      ) : (
        <Icon className="size-1/3" style={{ color: product.accent }} stroke={1.5} />
      )}
    </div>
  )
}
