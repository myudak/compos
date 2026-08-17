import pg from "pg"

import { config } from "./config.js"

const { Pool } = pg

export type DatabasePool = pg.Pool
export type DatabaseClient = pg.PoolClient

type PoolOptions = {
  max?: number
  statementTimeoutMs?: number
  applicationName?: string
}

export function createPool(connectionString = config.DATABASE_URL, options: PoolOptions = {}) {
  return new Pool({
    connectionString,
    max: options.max ?? config.OPERATIONAL_DB_POOL_MAX,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    statement_timeout: options.statementTimeoutMs ?? 2_000,
    application_name: options.applicationName ?? "compos-operational",
  })
}

export const pool = createPool(config.DATABASE_URL, {
  max: config.OPERATIONAL_DB_POOL_MAX,
  statementTimeoutMs: 2_000,
  applicationName: "compos-operational",
})
export const adminPool = createPool(config.DATABASE_URL, {
  max: config.ADMIN_DB_POOL_MAX,
  statementTimeoutMs: 5_000,
  applicationName: "compos-admin",
})
export const reportingPool = createPool(config.DATABASE_URL, {
  max: config.REPORTING_DB_POOL_MAX,
  statementTimeoutMs: 3_000,
  applicationName: "compos-reporting",
})
export const workerPool = createPool(config.DATABASE_URL, {
  max: config.WORKER_DB_POOL_MAX,
  statementTimeoutMs: 10_000,
  applicationName: "compos-worker",
})

export type AppPools = {
  operational: DatabasePool
  admin: DatabasePool
  reporting: DatabasePool
}

export const appPools: AppPools = {
  operational: pool,
  admin: adminPool,
  reporting: reportingPool,
}
