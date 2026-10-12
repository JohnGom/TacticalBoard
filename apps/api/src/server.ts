import Fastify from "fastify";
import type { HealthResponse } from "@tactical-board/contracts";

const app = Fastify({ logger: true });
const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? "127.0.0.1";

app.get<{ Reply: HealthResponse }>("/api/health", async () => ({
  status: "ok",
  service: "api",
}));

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}
