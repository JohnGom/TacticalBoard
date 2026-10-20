import "dotenv/config";
import { createDatabasePool } from "./pool.js";
import { readRuntimeConfig } from "../config.js";
import { runMigrations } from "./migrations.js";

const pool = createDatabasePool(readRuntimeConfig());

try {
  await runMigrations(pool);
  process.stdout.write("Database migrations are up to date.\n");
} finally {
  await pool.end();
}
