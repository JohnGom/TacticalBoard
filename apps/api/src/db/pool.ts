import { Pool } from "pg";
import type { RuntimeConfig } from "../config.js";

export function createDatabasePool(config: RuntimeConfig): Pool {
  return new Pool({
    connectionString: config.databaseUrl,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
}
