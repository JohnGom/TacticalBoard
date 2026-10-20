import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import type {
  CreateBoardRequest,
  CreateCustomTeamRequest,
  UpdateBoardRequest,
  UpdateCustomTeamRequest,
  FootballDataErrorResponse,
  FootballTeamSearchResponse,
  HealthResponse,
  TeamSquadResponse,
} from "@tactical-board/contracts";
import {
  CreateBoardRequestSchema,
  CreateCustomTeamRequestSchema,
  UpdateBoardRequestSchema,
  UpdateCustomTeamRequestSchema,
} from "@tactical-board/contracts";
import type { FootballDataProvider } from "@tactical-board/domain";
import { type FastifyReply } from "fastify";
import { getAuthenticatedUser, type CookieRuntimeOptions } from "./auth/session.js";
import type { AuthService } from "./auth/auth-service.js";
import { registerAuthRoutes, sameOriginMutationGuard } from "./auth/routes.js";
import { GoogleOAuthService } from "./auth/google-oauth.js";
import type { RuntimeConfig } from "./config.js";
import { ApiFootballProvider, ApiFootballProviderError } from "./providers/api-football.js";
import { BoardRevisionConflictError, OwnedResourceNotFoundError, WorkspaceService } from "./services/workspace-service.js";

export interface AppOptions {
  provider?: FootballDataProvider;
  auth?: AuthService;
  workspace?: WorkspaceService;
  runtime?: RuntimeConfig;
}

export function createApp(options: AppOptions = {}) {
  const provider = options.provider ?? new ApiFootballProvider();
  const app = Fastify({
    logger: {
      redact: {
        paths: ["req.headers.cookie", "req.headers.authorization", "req.url"],
        censor: "[REDACTED]",
      },
    },
    disableRequestLogging: true,
  });

  const canAuthenticate = options.auth !== undefined && options.runtime !== undefined;
  const cookieOptions: CookieRuntimeOptions = { production: options.runtime?.nodeEnv === "production" };

  if (options.auth && options.runtime) {
    app.addHook("preHandler", sameOriginMutationGuard(options.runtime.appOrigin));
    registerAuthRoutes(app, options.auth, GoogleOAuthService.fromConfig(options.runtime), options.runtime);
  }

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
      if (canAuthenticate && options.auth) {
        const user = await getAuthenticatedUser(request, reply, options.auth, cookieOptions);
        if (!user) return reply.status(401).send({ error: "authentication_required", message: "Inicia sesión para buscar equipos." });
      }
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
      if (canAuthenticate && options.auth) {
        const user = await getAuthenticatedUser(request, reply, options.auth, cookieOptions);
        if (!user) return reply.status(401).send({ error: "authentication_required", message: "Inicia sesión para cargar un plantel." });
      }
      try {
        return await provider.getTeamSquad(request.params.teamId);
      } catch (error) {
        return sendProviderError(error, reply);
      }
    },
  );

  if (options.auth && options.workspace && options.runtime) {
    registerWorkspaceRoutes(app, options.auth, options.workspace, cookieOptions);
  }

  return app;
}

function registerWorkspaceRoutes(
  app: FastifyInstance,
  auth: AuthService,
  workspace: WorkspaceService,
  cookieOptions: CookieRuntimeOptions,
): void {
  async function requireOwner(request: Parameters<typeof getAuthenticatedUser>[0], reply: FastifyReply): Promise<string | null> {
    const user = await getAuthenticatedUser(request, reply, auth, cookieOptions);
    if (!user) {
      reply.status(401).send({ message: "Inicia sesión para acceder a tus datos." });
      return null;
    }
    return user.id;
  }

  const teamIdSchema = {
    params: {
      type: "object",
      required: ["teamId"],
      additionalProperties: false,
      properties: { teamId: { type: "string", format: "uuid" } },
    },
  };
  const boardIdSchema = {
    params: {
      type: "object",
      required: ["boardId"],
      additionalProperties: false,
      properties: { boardId: { type: "string", format: "uuid" } },
    },
  };

  app.get("/api/teams", async (request, reply) => {
    const ownerId = await requireOwner(request, reply);
    return ownerId ? { teams: await workspace.listTeams(ownerId) } : reply;
  });

  app.post<{ Body: unknown }>("/api/teams", async (request, reply) => {
    const ownerId = await requireOwner(request, reply);
    if (!ownerId) return reply;
    const parsed = CreateCustomTeamRequestSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ message: "Revisa el nombre, color y plantel del equipo." });
    const team = await workspace.createTeam(ownerId, parsed.data as CreateCustomTeamRequest);
    return reply.status(201).send({ team });
  });

  app.get<{ Params: { teamId: string } }>("/api/teams/:teamId", { schema: teamIdSchema }, async (request, reply) => {
    const ownerId = await requireOwner(request, reply);
    if (!ownerId) return reply;
    const team = await workspace.getTeam(ownerId, request.params.teamId);
    return team ? { team } : reply.status(404).send({ message: "No se encontró ese equipo." });
  });

  app.patch<{ Params: { teamId: string }; Body: unknown }>("/api/teams/:teamId", { schema: teamIdSchema }, async (request, reply) => {
    const ownerId = await requireOwner(request, reply);
    if (!ownerId) return reply;
    const parsed = UpdateCustomTeamRequestSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ message: "Revisa los cambios del equipo." });
    try {
      const team = await workspace.updateTeam(ownerId, request.params.teamId, parsed.data as UpdateCustomTeamRequest);
      return team ? { team } : reply.status(404).send({ message: "No se encontró ese equipo." });
    } catch (error) {
      if (error instanceof OwnedResourceNotFoundError) return reply.status(404).send({ message: "No se encontró ese equipo." });
      throw error;
    }
  });

  app.delete<{ Params: { teamId: string } }>("/api/teams/:teamId", { schema: teamIdSchema }, async (request, reply) => {
    const ownerId = await requireOwner(request, reply);
    if (!ownerId) return reply;
    const deleted = await workspace.deleteTeam(ownerId, request.params.teamId);
    return deleted ? reply.status(204).send() : reply.status(404).send({ message: "No se encontró ese equipo." });
  });

  app.get("/api/boards", async (request, reply) => {
    const ownerId = await requireOwner(request, reply);
    return ownerId ? { boards: await workspace.listBoards(ownerId) } : reply;
  });

  app.post<{ Body: unknown }>("/api/boards", async (request, reply) => {
    const ownerId = await requireOwner(request, reply);
    if (!ownerId) return reply;
    const parsed = CreateBoardRequestSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ message: "La pizarra contiene datos no válidos." });
    try {
      const board = await workspace.createBoard(ownerId, parsed.data.title, parsed.data.state);
      return reply.status(201).send({ board });
    } catch (error) {
      if (error instanceof OwnedResourceNotFoundError) return reply.status(404).send({ message: "No se encontró el equipo guardado." });
      throw error;
    }
  });

  app.get<{ Params: { boardId: string } }>("/api/boards/:boardId", { schema: boardIdSchema }, async (request, reply) => {
    const ownerId = await requireOwner(request, reply);
    if (!ownerId) return reply;
    const board = await workspace.getBoard(ownerId, request.params.boardId);
    return board ? { board } : reply.status(404).send({ message: "No se encontró esa pizarra." });
  });

  app.patch<{ Params: { boardId: string }; Body: unknown }>("/api/boards/:boardId", { schema: boardIdSchema }, async (request, reply) => {
    const ownerId = await requireOwner(request, reply);
    if (!ownerId) return reply;
    const parsed = UpdateBoardRequestSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ message: "La pizarra contiene datos no válidos." });
    try {
      const board = await workspace.updateBoard(ownerId, request.params.boardId, parsed.data as UpdateBoardRequest);
      return board ? { board } : reply.status(404).send({ message: "No se encontró esa pizarra." });
    } catch (error) {
      if (error instanceof OwnedResourceNotFoundError) return reply.status(404).send({ message: "No se encontró el equipo guardado." });
      if (error instanceof BoardRevisionConflictError) return reply.status(409).send({ message: error.message });
      throw error;
    }
  });

  app.post<{ Params: { boardId: string } }>("/api/boards/:boardId/duplicate", { schema: boardIdSchema }, async (request, reply) => {
    const ownerId = await requireOwner(request, reply);
    if (!ownerId) return reply;
    const board = await workspace.duplicateBoard(ownerId, request.params.boardId);
    return board ? reply.status(201).send({ board }) : reply.status(404).send({ message: "No se encontró esa pizarra." });
  });

  app.delete<{ Params: { boardId: string } }>("/api/boards/:boardId", { schema: boardIdSchema }, async (request, reply) => {
    const ownerId = await requireOwner(request, reply);
    if (!ownerId) return reply;
    const deleted = await workspace.deleteBoard(ownerId, request.params.boardId);
    return deleted ? reply.status(204).send() : reply.status(404).send({ message: "No se encontró esa pizarra." });
  });
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
