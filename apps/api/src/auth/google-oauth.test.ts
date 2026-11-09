import assert from "node:assert/strict";
import type { OutgoingHttpHeaders } from "node:http";
import { test } from "node:test";
import { AuthService } from "./auth-service.js";
import { createApp } from "../app.js";
import { readRuntimeConfig } from "../config.js";
import { createDatabasePool } from "../db/pool.js";

const appOrigin = "http://localhost:5173";
const callbackUri = `${appOrigin}/api/auth/google/callback`;

function firstSetCookie(headers: OutgoingHttpHeaders): string {
  const setCookie = headers["set-cookie"];
  const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  assert.ok(cookie, "Google start should set an OAuth state cookie");
  return cookie;
}

test("configured Google OAuth exposes the provider and builds a protected callback flow", async () => {
  const runtime = readRuntimeConfig({
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://tacticalboard:tacticalboard-local-only@127.0.0.1:5434/tacticalboard",
    SESSION_COOKIE_SECRET: "test-session-secret-that-is-at-least-thirty-two-characters",
    APP_ORIGIN: appOrigin,
    GOOGLE_CLIENT_ID: "unit-test-client.apps.googleusercontent.com",
    GOOGLE_CLIENT_SECRET: "unit-test-client-secret",
    GOOGLE_REDIRECT_URI: callbackUri,
  });
  const database = createDatabasePool(runtime);
  const app = createApp({ auth: new AuthService(database), runtime });

  try {
    const providers = await app.inject({ method: "GET", url: "/api/auth/providers" });
    assert.equal(providers.statusCode, 200);
    assert.deepEqual(providers.json(), { emailPassword: true, google: true });

    const started = await app.inject({ method: "GET", url: "/api/auth/google/start" });
    assert.equal(started.statusCode, 302);
    const authorizationUrl = new URL(started.headers.location!);
    assert.equal(authorizationUrl.origin, "https://accounts.google.com");
    assert.equal(authorizationUrl.searchParams.get("client_id"), "unit-test-client.apps.googleusercontent.com");
    assert.equal(authorizationUrl.searchParams.get("redirect_uri"), callbackUri);
    assert.equal(authorizationUrl.searchParams.get("response_type"), "code");
    assert.match(authorizationUrl.searchParams.get("scope") ?? "", /openid/);
    assert.match(authorizationUrl.searchParams.get("scope") ?? "", /email/);

    const stateCookie = firstSetCookie(started.headers);
    assert.match(stateCookie, /tactical_google_state=/);
    assert.match(stateCookie, /HttpOnly/i);
    assert.match(stateCookie, /Path=\/api\/auth\/google\/callback/i);

    const rejectedCallback = await app.inject({
      method: "GET",
      url: "/api/auth/google/callback?code=not-used&state=wrong-state",
      headers: { cookie: stateCookie.split(";")[0]! },
    });
    assert.equal(rejectedCallback.statusCode, 302);
    assert.equal(rejectedCallback.headers.location, `${appOrigin}/login?error=google_state`);
  } finally {
    await app.close();
    await database.end();
  }
});
