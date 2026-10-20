import { randomBytes, timingSafeEqual } from "node:crypto";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { LoginRequestSchema, RegisterRequestSchema } from "@tactical-board/contracts";
import type { RuntimeConfig } from "../config.js";
import { AuthService, DuplicateAccountError, InvalidCredentialsError, IdentityConflictError } from "./auth-service.js";
import { GoogleOAuthService } from "./google-oauth.js";
import {
  clearGoogleStateCookie,
  clearSessionCookie,
  GOOGLE_STATE_COOKIE_NAME,
  getAuthenticatedUser,
  setGoogleStateCookie,
  setSessionCookie,
  type CookieRuntimeOptions,
} from "./session.js";

interface GoogleTransaction {
  state: string;
  nonce: string;
  issuedAt: number;
}

function safeStringEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function decodeGoogleTransaction(value: string | undefined): GoogleTransaction | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (typeof parsed !== "object" || parsed === null) return null;
    if (!("state" in parsed) || typeof parsed.state !== "string") return null;
    if (!("nonce" in parsed) || typeof parsed.nonce !== "string") return null;
    if (!("issuedAt" in parsed) || typeof parsed.issuedAt !== "number") return null;
    return { state: parsed.state, nonce: parsed.nonce, issuedAt: parsed.issuedAt };
  } catch {
    return null;
  }
}

function authError(reply: FastifyReply, statusCode: number, message: string) {
  return reply.status(statusCode).send({ message });
}

export function registerAuthRoutes(
  app: FastifyInstance,
  auth: AuthService,
  google: GoogleOAuthService | null,
  config: RuntimeConfig,
): void {
  const cookieOptions: CookieRuntimeOptions = { production: config.nodeEnv === "production" };
  app.register(cookie, { secret: config.sessionCookieSecret });
  app.register(rateLimit, { global: false });

  app.get("/api/auth/providers", async () => ({ emailPassword: true, google: google !== null }));

  app.get("/api/auth/me", async (request, reply) => {
    const user = await getAuthenticatedUser(request, reply, auth, cookieOptions);
    return { user };
  });

  app.post<{ Body: unknown }>(
    "/api/auth/register",
    {
      config: { rateLimit: { max: 5, timeWindow: 15 * 60 * 1000 } },
    },
    async (request, reply) => {
      const parsed = RegisterRequestSchema.safeParse(request.body);
      if (!parsed.success) return authError(reply, 400, "Completa nombre, correo y contraseña (mínimo 12 caracteres).");
      try {
        const user = await auth.register(parsed.data);
        const session = await auth.createSession(user.id);
        setSessionCookie(reply, session.token, session.expiresAt, cookieOptions);
        return reply.status(201).send({ user });
      } catch (error) {
        if (error instanceof DuplicateAccountError) return authError(reply, 409, "Ya existe una cuenta con ese correo.");
        request.log.error({ err: error }, "account registration failed");
        return authError(reply, 500, "No se pudo crear la cuenta. Inténtalo de nuevo.");
      }
    },
  );

  app.post<{ Body: unknown }>(
    "/api/auth/login",
    {
      config: { rateLimit: { max: 8, timeWindow: 15 * 60 * 1000 } },
    },
    async (request, reply) => {
      const parsed = LoginRequestSchema.safeParse(request.body);
      if (!parsed.success) return authError(reply, 400, "Escribe un correo y una contraseña válidos.");
      try {
        const user = await auth.login(parsed.data.email, parsed.data.password);
        const session = await auth.createSession(user.id);
        setSessionCookie(reply, session.token, session.expiresAt, cookieOptions);
        return { user };
      } catch (error) {
        if (error instanceof InvalidCredentialsError) return authError(reply, 401, error.message);
        request.log.error({ err: error }, "account login failed");
        return authError(reply, 500, "No se pudo iniciar sesión. Inténtalo de nuevo.");
      }
    },
  );

  app.post("/api/auth/logout", async (request, reply) => {
    const sessionCookie = request.cookies.tactical_session;
    if (sessionCookie) {
      const unsigned = request.unsignCookie(sessionCookie);
      if (unsigned.valid && unsigned.value) await auth.deleteSession(unsigned.value);
    }
    clearSessionCookie(reply, cookieOptions);
    return reply.status(204).send();
  });

  app.get<{ Querystring: { code?: string; state?: string; error?: string } }>(
    "/api/auth/google/start",
    async (_request, reply) => {
      if (!google) return authError(reply, 503, "El acceso con Google aún no está configurado en el servidor.");
      const transaction: GoogleTransaction = {
        state: randomBytes(32).toString("base64url"),
        nonce: randomBytes(32).toString("base64url"),
        issuedAt: Date.now(),
      };
      setGoogleStateCookie(
        reply,
        Buffer.from(JSON.stringify(transaction)).toString("base64url"),
        cookieOptions,
      );
      return reply.redirect(google.createAuthorizationUrl(transaction));
    },
  );

  app.get<{ Querystring: { code?: string; state?: string; error?: string } }>(
    "/api/auth/google/callback",
    {
      schema: {
        querystring: {
          type: "object",
          additionalProperties: false,
          properties: {
            code: { type: "string", maxLength: 4096 },
            state: { type: "string", maxLength: 256 },
            error: { type: "string", maxLength: 120 },
          },
        },
      },
    },
    async (request, reply) => {
      if (!google) return reply.redirect(`${config.appOrigin}/login?error=google_unavailable`);
      const cookieValue = request.cookies[GOOGLE_STATE_COOKIE_NAME];
      const signed = cookieValue ? request.unsignCookie(cookieValue) : null;
      const transaction = signed?.valid && signed.value ? decodeGoogleTransaction(signed.value) : null;
      clearGoogleStateCookie(reply, cookieOptions);

      const validTransaction = transaction &&
        transaction.issuedAt <= Date.now() &&
        Date.now() - transaction.issuedAt <= 10 * 60 * 1000 &&
        request.query.state && safeStringEqual(transaction.state, request.query.state);
      if (!validTransaction) return reply.redirect(`${config.appOrigin}/login?error=google_state`);
      if (request.query.error || !request.query.code) return reply.redirect(`${config.appOrigin}/login?error=google_cancelled`);

      try {
        const profile = await google.verifyAuthorizationCode(request.query.code, transaction.nonce);
        const user = await auth.getOrCreateGoogleUser(profile);
        const session = await auth.createSession(user.id);
        setSessionCookie(reply, session.token, session.expiresAt, cookieOptions);
        return reply.redirect(`${config.appOrigin}/app`);
      } catch (error) {
        request.log.warn({ err: error instanceof IdentityConflictError ? error.name : "google_auth_failed" }, "Google sign-in failed");
        return reply.redirect(`${config.appOrigin}/login?error=google_failed`);
      }
    },
  );
}

export function sameOriginMutationGuard(appOrigin: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return;
    if (request.headers.origin !== appOrigin) {
      return reply.status(403).send({ message: "La solicitud no tiene un origen permitido." });
    }
  };
}
