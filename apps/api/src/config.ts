import { randomBytes } from "node:crypto";

export interface RuntimeConfig {
  nodeEnv: string;
  databaseUrl: string;
  sessionCookieSecret: string;
  sessionCookieSecretEphemeral: boolean;
  appOrigin: string;
  googleClientId: string | null;
  googleClientSecret: string | null;
  googleRedirectUri: string;
}

export function readRuntimeConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  const nodeEnv = env.NODE_ENV ?? "development";
  const development = nodeEnv !== "production";
  const appOrigin = (env.APP_ORIGIN?.trim() || "http://127.0.0.1:5173").replace(/\/$/, "");
  const databaseUrl = env.DATABASE_URL?.trim() || (development
    ? "postgresql://tacticalboard:tacticalboard-local-only@127.0.0.1:5434/tacticalboard"
    : "");
  const configuredSessionSecret = env.SESSION_COOKIE_SECRET?.trim();
  const sessionCookieSecret = configuredSessionSecret || (development
    ? randomBytes(48).toString("base64url")
    : "");
  const googleClientId = env.GOOGLE_CLIENT_ID?.trim() || null;
  const googleClientSecret = env.GOOGLE_CLIENT_SECRET?.trim() || null;
  const googleRedirectUri = env.GOOGLE_REDIRECT_URI ?? `${appOrigin}/api/auth/google/callback`;

  if (!databaseUrl) throw new Error("DATABASE_URL must be configured outside local development.");
  if (sessionCookieSecret.length < 32) {
    throw new Error("SESSION_COOKIE_SECRET must contain at least 32 characters.");
  }
  if (Boolean(googleClientId) !== Boolean(googleClientSecret)) {
    throw new Error("Set both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable Google sign-in.");
  }
  if (googleClientId && new URL(googleRedirectUri).origin !== appOrigin) {
    throw new Error("GOOGLE_REDIRECT_URI must use the same origin as APP_ORIGIN.");
  }

  return {
    nodeEnv,
    databaseUrl,
    sessionCookieSecret,
    sessionCookieSecretEphemeral: !configuredSessionSecret,
    appOrigin,
    googleClientId,
    googleClientSecret,
    googleRedirectUri,
  };
}
