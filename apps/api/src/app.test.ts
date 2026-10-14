import assert from "node:assert/strict";
import { test } from "node:test";
import type {
  FootballTeamSummary,
  TeamSquadResponse,
} from "@tactical-board/contracts";
import type { FootballDataProvider } from "@tactical-board/domain";
import { createApp } from "./app.js";
import { ApiFootballProviderError } from "./providers/api-football.js";

const team: FootballTeamSummary = {
  id: "api-football:541",
  name: "Real Madrid",
  country: "Spain",
  kind: "club",
  crestUrl: null,
  externalReference: { provider: "api-football", providerId: "541" },
};

const squad: TeamSquadResponse = {
  team,
  players: [],
  retrievedAt: "2026-10-13T00:00:00.000Z",
};

class FakeProvider implements FootballDataProvider {
  async searchTeams(query: string): Promise<readonly FootballTeamSummary[]> {
    return query === "Real Madrid" ? [team] : [];
  }

  async getTeamSquad(teamId: string): Promise<TeamSquadResponse> {
    if (teamId !== "541") {
      throw new ApiFootballProviderError("team_not_found", 404, "Search for the team first.");
    }
    return squad;
  }
}

test("team search validates input and returns normalized data", async () => {
  const app = createApp(new FakeProvider());
  try {
    const invalid = await app.inject({ method: "GET", url: "/api/football/teams?query=ab" });
    assert.equal(invalid.statusCode, 400);

    const result = await app.inject({ method: "GET", url: "/api/football/teams?query=Real%20Madrid" });
    assert.equal(result.statusCode, 200);
    assert.equal(result.json().teams[0].externalReference.providerId, "541");
  } finally {
    await app.close();
  }
});

test("squad route accepts numeric provider IDs and maps errors safely", async () => {
  const app = createApp(new FakeProvider());
  try {
    const result = await app.inject({ method: "GET", url: "/api/football/teams/541/squad" });
    assert.equal(result.statusCode, 200);
    assert.equal(result.json().team.name, "Real Madrid");

    const invalid = await app.inject({ method: "GET", url: "/api/football/teams/not-an-id/squad" });
    assert.equal(invalid.statusCode, 400);

    const missing = await app.inject({ method: "GET", url: "/api/football/teams/999/squad" });
    assert.equal(missing.statusCode, 404);
    assert.equal(missing.json().error, "team_not_found");
  } finally {
    await app.close();
  }
});
