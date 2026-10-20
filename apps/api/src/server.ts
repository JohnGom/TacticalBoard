import "dotenv/config";
import { AuthService } from "./auth/auth-service.js";
import { createApp } from "./app.js";
import { readRuntimeConfig } from "./config.js";
import { createDatabasePool } from "./db/pool.js";
import { runMigrations } from "./db/migrations.js";
import { WorkspaceService } from "./services/workspace-service.js";

const runtime = readRuntimeConfig();
const database = createDatabasePool(runtime);

if (runtime.nodeEnv !== "production") await runMigrations(database);

const app = createApp({
  auth: new AuthService(database),
  workspace: new WorkspaceService(database),
  runtime,
});
const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? "127.0.0.1";

app.addHook("onClose", async () => database.end());
if (runtime.sessionCookieSecretEphemeral) {
  app.log.warn("No SESSION_COOKIE_SECRET is set; local sessions will expire when the API restarts.");
}

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  await database.end();
  process.exitCode = 1;
}
