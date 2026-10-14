import Fastify from "fastify";
import type {
  FootballDataErrorResponse,
  FootballTeamSearchResponse,
  HealthResponse,
  TeamSquadResponse,
} from "@tactical-board/contracts";
import type { FootballDataProvider } from "@tactical-board/domain";
import { type FastifyReply } from "fastify";
import { ApiFootballProvider, ApiFootballProviderError } from "./providers/api-football.js";

export function createApp(provider: FootballDataProvider = new ApiFootballProvider()) {
  const app = Fastify({ logger: true });

  app.get<{ Reply: HealthResponse }>("/api/health", async () => ({
    status: "ok",
    service: "api",
  }));

  app.get<{
    Querystring: { query: string };
    Reply: FootballTeamSearchResponse | FootballDataErrorResponse;
  }>(
    "/api/football/teams",
    {
      schema: {
        querystring: {
          type: "object",
          required: ["query"],
          additionalProperties: false,
          properties: { query: { type: "string", minLength: 3, maxLength: 80 } },
        },
      },
    },
    async (request, reply) => {
      try {
        const teams = await provider.searchTeams(request.query.query);
        return { teams: [...teams] };
      } catch (error) {
        return sendProviderError(error, reply);
      }
    },
  );

  app.get<{
    Params: { teamId: string };
    Reply: TeamSquadResponse | FootballDataErrorResponse;
  }>(
    "/api/football/teams/:teamId/squad",
    {
      schema: {
        params: {
          type: "object",
          required: ["teamId"],
          additionalProperties: false,
          properties: { teamId: { type: "string", pattern: "^[0-9]{1,16}$" } },
        },
      },
    },
    async (request, reply) => {
      try {
        return await provider.getTeamSquad(request.params.teamId);
      } catch (error) {
        return sendProviderError(error, reply);
      }
    },
  );

  return app;
}

function sendProviderError(
  error: unknown,
  reply: FastifyReply,
): FastifyReply {
  if (error instanceof ApiFootballProviderError) {
    return reply.status(error.httpStatus).send({ error: error.code, message: error.message });
  }

  return reply.status(502).send({
    error: "provider_unavailable",
    message: "Football data is temporarily unavailable.",
  });
}
