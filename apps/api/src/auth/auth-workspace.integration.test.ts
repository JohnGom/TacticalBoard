import assert from "node:assert/strict";
import type { OutgoingHttpHeaders } from "node:http";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import type { BoardStateV1, FootballTeamSummary } from "@tactical-board/contracts";
import { createLineupFromRoster } from "@tactical-board/domain";
import { AuthService } from "./auth-service.js";
import { readRuntimeConfig } from "../config.js";
import { createDatabasePool } from "../db/pool.js";
import { runMigrations } from "../db/migrations.js";
import { createApp } from "../app.js";
import { WorkspaceService } from "../services/workspace-service.js";

const localOrigin = "http://127.0.0.1:5173";

function cookieFrom(response: { headers: OutgoingHttpHeaders }): string {
  const setCookie = response.headers["set-cookie"];
  const firstCookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  assert.ok(firstCookie, "registration should set the signed session cookie");
  return String(firstCookie).split(";")[0]!;
}

test("private accounts, custom teams, and boards are isolated by owner and restorable", async (context) => {
  const runtime = readRuntimeConfig();
  const database = createDatabasePool(runtime);
  try {
    await database.query("SELECT 1");
  } catch {
    await database.end();
    context.skip("Start the local PostgreSQL service to run persistence integration tests.");
    return;
  }

  await runMigrations(database);
  const auth = new AuthService(database);
  const workspace = new WorkspaceService(database);
  const provider: { searchTeams: () => Promise<FootballTeamSummary[]>; getTeamSquad: () => Promise<never> } = {
    searchTeams: async () => [],
    getTeamSquad: async () => { throw new Error("Not used in this test"); },
  };
  const app = createApp({ auth, workspace, provider, runtime });
  const emailSuffix = randomUUID();
  const emails = [`owner-${emailSuffix}@example.test`, `other-${emailSuffix}@example.test`];

  try {
    const registerOwner = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      headers: { origin: localOrigin },
      payload: { displayName: "Board Owner", email: emails[0], password: "correct-horse-battery-staple" },
    });
    assert.equal(registerOwner.statusCode, 201);
    assert.equal(JSON.stringify(registerOwner.json()).includes("correct-horse-battery-staple"), false);
    let ownerCookie = cookieFrom(registerOwner);

    const duplicateEmail = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      headers: { origin: localOrigin },
      payload: { displayName: "Duplicate", email: emails[0], password: "correct-horse-battery-staple" },
    });
    assert.equal(duplicateEmail.statusCode, 409);

    const wrongPassword = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      headers: { origin: localOrigin },
      payload: { email: emails[0], password: "not-the-password" },
    });
    assert.equal(wrongPassword.statusCode, 401);

    const providers = await app.inject({ method: "GET", url: "/api/auth/providers" });
    assert.deepEqual(providers.json(), { emailPassword: true, google: false });
    const googleWhenUnconfigured = await app.inject({ method: "GET", url: "/api/auth/google/start" });
    assert.equal(googleWhenUnconfigured.statusCode, 503);

    const ownerSession = await app.inject({ method: "GET", url: "/api/auth/me", headers: { cookie: ownerCookie } });
    assert.equal(ownerSession.statusCode, 200);
    const ownerId = ownerSession.json().user.id as string;

    const correctLogin = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      headers: { origin: localOrigin },
      payload: { email: emails[0], password: "correct-horse-battery-staple" },
    });
    assert.equal(correctLogin.statusCode, 200);
    ownerCookie = cookieFrom(correctLogin);

    const teamRoster = Array.from({ length: 11 }, (_, index) => ({
      id: `custom-player-${index + 1}`,
      snapshot: {
        name: `Custom Player ${index + 1}`,
        shirtNumber: index + 1,
        position: index === 0 ? "Goalkeeper" : index < 5 ? "Defender" : index < 8 ? "Midfielder" : "Forward",
        providerReference: null,
      },
    }));
    const teamResponse = await app.inject({
      method: "POST",
      url: "/api/teams",
      headers: { origin: localOrigin, cookie: ownerCookie },
      payload: { name: "Owner XI", primaryColor: "#2b684a", roster: teamRoster },
    });
    assert.equal(teamResponse.statusCode, 201);
    const team = teamResponse.json().team as { id: string; name: string };

    const lineup = createLineupFromRoster("4-3-3", teamRoster);
    const boardState: BoardStateV1 = {
      schemaVersion: 1,
      team: {
        name: team.name,
        kind: "custom",
        primaryColor: "#2b684a",
        customTeamId: team.id,
        externalReference: null,
      },
      formation: "4-3-3",
      pitchView: "full",
      players: lineup.players,
      bench: lineup.bench,
    };
    const boardResponse = await app.inject({
      method: "POST",
      url: "/api/boards",
      headers: { origin: localOrigin, cookie: ownerCookie },
      payload: { title: "Pressing shape", state: boardState },
    });
    assert.equal(boardResponse.statusCode, 201);
    const boardId = boardResponse.json().board.id as string;

    const registerOther = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      headers: { origin: localOrigin },
      payload: { displayName: "Other User", email: emails[1], password: "another-correct-horse-battery" },
    });
    assert.equal(registerOther.statusCode, 201);
    const otherCookie = cookieFrom(registerOther);

    const crossUserBoard = await app.inject({ method: "GET", url: `/api/boards/${boardId}`, headers: { cookie: otherCookie } });
    const crossUserTeam = await app.inject({ method: "GET", url: `/api/teams/${team.id}`, headers: { cookie: otherCookie } });
    const crossUserDuplicate = await app.inject({
      method: "POST",
      url: `/api/boards/${boardId}/duplicate`,
      headers: { origin: localOrigin, cookie: otherCookie },
    });
    assert.equal(crossUserBoard.statusCode, 404);
    assert.equal(crossUserTeam.statusCode, 404);
    assert.equal(crossUserDuplicate.statusCode, 404);

    const firstSave = await app.inject({
      method: "PATCH",
      url: `/api/boards/${boardId}`,
      headers: { origin: localOrigin, cookie: ownerCookie },
      payload: { revision: 1, title: "Pressing shape v2" },
    });
    assert.equal(firstSave.statusCode, 200);
    assert.equal(firstSave.json().board.revision, 2);
    const staleSave = await app.inject({
      method: "PATCH",
      url: `/api/boards/${boardId}`,
      headers: { origin: localOrigin, cookie: ownerCookie },
      payload: { revision: 1, title: "Stale overwrite" },
    });
    assert.equal(staleSave.statusCode, 409);

    const restored = await app.inject({ method: "GET", url: `/api/boards/${boardId}`, headers: { cookie: ownerCookie } });
    assert.equal(restored.statusCode, 200);
    assert.equal(restored.json().board.title, "Pressing shape v2");
    assert.equal(restored.json().board.revision, 2);
    assert.equal(restored.json().board.state.players.length, 11);
    assert.equal(restored.json().board.state.players[0].snapshot.name, "Custom Player 1");
    assert.equal(restored.json().board.state.team.customTeamId, team.id);

    const deletedTeam = await app.inject({
      method: "DELETE",
      url: `/api/teams/${team.id}`,
      headers: { origin: localOrigin, cookie: ownerCookie },
    });
    assert.equal(deletedTeam.statusCode, 204);
    const boardAfterTeamDelete = await app.inject({ method: "GET", url: `/api/boards/${boardId}`, headers: { cookie: ownerCookie } });
    assert.equal(boardAfterTeamDelete.statusCode, 200);
    assert.equal(boardAfterTeamDelete.json().board.revision, 3);
    assert.equal(boardAfterTeamDelete.json().board.state.team.customTeamId, null);
    assert.equal(boardAfterTeamDelete.json().board.state.players[0].snapshot.name, "Custom Player 1");
    const staleAfterTeamDelete = await app.inject({
      method: "PATCH",
      url: `/api/boards/${boardId}`,
      headers: { origin: localOrigin, cookie: ownerCookie },
      payload: { revision: 2, title: "Restore deleted team reference" },
    });
    assert.equal(staleAfterTeamDelete.statusCode, 409);

    const csrfLogout = await app.inject({ method: "POST", url: "/api/auth/logout", headers: { origin: "https://attacker.example", cookie: ownerCookie } });
    assert.equal(csrfLogout.statusCode, 403);

    const logout = await app.inject({ method: "POST", url: "/api/auth/logout", headers: { origin: localOrigin, cookie: ownerCookie } });
    assert.equal(logout.statusCode, 204);
    const afterLogout = await app.inject({ method: "GET", url: "/api/auth/me", headers: { cookie: ownerCookie } });
    assert.equal(afterLogout.json().user, null);
    assert.notEqual(ownerId, registerOther.json().user.id);
  } finally {
    await app.close();
    await database.query("DELETE FROM app_users WHERE email_normalized = ANY($1::text[])", [emails]);
    await database.end();
  }
});
