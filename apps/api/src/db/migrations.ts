import { readFile } from "node:fs/promises";
import type { Pool } from "pg";

const migrations = [
  { version: "001_initial", path: new URL("../../migrations/001_initial.sql", import.meta.url) },
  { version: "002_board_revisions", path: new URL("../../migrations/002_board_revisions.sql", import.meta.url) },
] as const;

export async function runMigrations(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  for (const migration of migrations) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock($1)", [7173240101]);
      const applied = await client.query<{ version: string }>(
        "SELECT version FROM schema_migrations WHERE version = $1",
        [migration.version],
      );
      if (!applied.rowCount) {
        const sql = await readFile(migration.path, "utf8");
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [migration.version]);
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
