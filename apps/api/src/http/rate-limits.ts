export const adminMutationRateLimit = { max: 60, timeWindow: "1 minute" } as const
export const reportingRateLimit = { max: 30, timeWindow: "1 minute" } as const
export const insightGenerationRateLimit = { max: 2, timeWindow: "1 day" } as const
