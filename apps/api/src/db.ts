import pg from "pg"

import { config } from "./config.js"

const { Pool } = pg

export type DatabasePool = pg.Pool
export type DatabaseClient = pg.PoolClient

export function createPool(connectionString = config.DATABASE_URL) {
  return new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  })
}

export const pool = createPool()
