import { z } from "zod"

import { config } from "../../config.js"
import { incrementMetric, observeMetric } from "../../metrics.js"

const providerResponseSchema = z.object({
  choices: z.array(
    z.object({
      message: z.object({ content: z.string() }),
    }),
  ),
})
const insightContentSchema = z.object({
  title: z.string().min(1).max(120),
  summary: z.string().min(1).max(1_000),
  recommendations: z.array(z.string().min(1).max(240)).min(1).max(5),
})

export type InsightFeatures = {
  periodStart: string
  periodEnd: string
  grossSales: number
  netSales: number
  transactionCount: number
  averageOrderValue: number
  topProducts: { name: string; quantity: number; revenue: number }[]
}

export type GeneratedInsight = z.infer<typeof insightContentSchema> & {
  source: "EXTERNAL_AI" | "LOCAL_ANALYTICS"
}

export async function generateInsight(features: InsightFeatures): Promise<GeneratedInsight> {
  if (!config.AI_INSIGHT_BASE_URL || !config.AI_INSIGHT_API_KEY) {
    return localInsight(features)
  }

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await requestExternalInsight(features)
    } catch {
      if (attempt < 3) await wait(250 * 2 ** (attempt - 1))
    }
  }
  incrementMetric("insight_provider_fallback_total")
  return localInsight(features)
}

async function requestExternalInsight(features: InsightFeatures): Promise<GeneratedInsight> {
  const startedAt = performance.now()
  incrementMetric("insight_external_requests_total")
  const response = await fetch(
    new URL("chat/completions", ensureTrailingSlash(config.AI_INSIGHT_BASE_URL!)),
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.AI_INSIGHT_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: config.AI_INSIGHT_MODEL,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Analyze only the aggregate merchant metrics provided. Return JSON with title, summary, and 1-5 concise recommendations. Never invent customer or operator data.",
          },
          { role: "user", content: JSON.stringify(features) },
        ],
      }),
      signal: AbortSignal.timeout(config.AI_INSIGHT_TIMEOUT_MS),
    },
  )
  observeMetric("insight_provider_latency_ms", performance.now() - startedAt)
  if (!response.ok) throw new Error(`Insight provider returned ${response.status}`)
  const envelope = providerResponseSchema.parse(await response.json())
  const content = envelope.choices[0]?.message.content
  if (!content) throw new Error("Insight provider returned no content")
  return { ...insightContentSchema.parse(JSON.parse(content)), source: "EXTERNAL_AI" }
}

function localInsight(features: InsightFeatures): GeneratedInsight {
  const leadingProduct = features.topProducts[0]
  const recommendations = features.transactionCount
    ? [
        leadingProduct
          ? `Jaga ketersediaan ${leadingProduct.name}, produk dengan revenue tertinggi periode ini.`
          : "Review kembali kelengkapan data produk pada transaksi.",
        `Pantau average order value Rp${features.averageOrderValue.toLocaleString("id-ID")} sebagai baseline periode berikutnya.`,
      ]
    : ["Belum ada transaksi pada periode ini. Pastikan catalog aktif dan counter siap berjualan."]
  return {
    title: features.transactionCount ? "Ringkasan performa 30 hari" : "Belum ada penjualan",
    summary: features.transactionCount
      ? `${features.transactionCount} transaksi menghasilkan net sales Rp${features.netSales.toLocaleString("id-ID")}.`
      : "Projection belum mencatat transaksi untuk rentang laporan ini.",
    recommendations,
    source: "LOCAL_ANALYTICS",
  }
}

function ensureTrailingSlash(value: string) {
  return value.endsWith("/") ? value : `${value}/`
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}
