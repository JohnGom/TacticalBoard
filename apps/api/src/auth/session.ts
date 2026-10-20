import type { FastifyReply, FastifyRequest } from "fastify";
import type { AuthUser } from "@tactical-board/contracts";
import type { AuthService } from "./auth-service.js";

export const SESSION_COOKIE_NAME = "tactical_session";
export const GOOGLE_STATE_COOKIE_NAME = "tactical_google_state";

export interface CookieRuntimeOptions {
  production: boolean;
}

export async function getAuthenticatedUser(
  request: FastifyRequest,
  reply: FastifyReply,
  auth: AuthService,
  cookieOptions: CookieRuntimeOptions,
): Promise<AuthUser | null> {
  const cookie = request.cookies[SESSION_COOKIE_NAME];
  if (!cookie) return null;

  const unsigned = request.unsignCookie(cookie);
  if (!unsigned.valid || !unsigned.value) {
    clearSessionCookie(reply, cookieOptions);
    return null;
  }

  return auth.getSessionUser(unsigned.value);
}

export function setSessionCookie(
  reply: FastifyReply,
  token: string,
  expiresAt: Date,
  options: CookieRuntimeOptions,
): void {
  reply.setCookie(SESSION_COOKIE_NAME, token, {
    signed: true,
    httpOnly: true,
    secure: options.production,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(reply: FastifyReply, options: CookieRuntimeOptions): void {
  reply.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: options.production,
    sameSite: "lax",
    path: "/",
  });
}

export function setGoogleStateCookie(
  reply: FastifyReply,
  state: string,
  options: CookieRuntimeOptions,
): void {
  reply.setCookie(GOOGLE_STATE_COOKIE_NAME, state, {
    signed: true,
    httpOnly: true,
    secure: options.production,
    sameSite: "lax",
    path: "/api/auth/google/callback",
    maxAge: 10 * 60,
  });
}

export function clearGoogleStateCookie(reply: FastifyReply, options: CookieRuntimeOptions): void {
  reply.clearCookie(GOOGLE_STATE_COOKIE_NAME, {
    httpOnly: true,
    secure: options.production,
    sameSite: "lax",
    path: "/api/auth/google/callback",
  });
}
