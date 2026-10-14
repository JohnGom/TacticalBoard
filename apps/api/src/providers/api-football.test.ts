import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiFootballProvider, ApiFootballProviderError } from "./api-football.js";

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function fakeFetcher(responses: Response[]): typeof fetch {
  let index = 0;
  return async (input) => {
    assert.ok(String(input).startsWith("https://v3.football.api-sports.io/"));
    const response = responses[index];
    index += 1;
    if (!response) throw new Error("Unexpected provider request");
    return response;
  };
}

test("team search normalizes clubs and national teams without returning copyrighted images", async () => {
  const provider = new ApiFootballProvider("test-key", fakeFetcher([
    jsonResponse({
      errors: [],
      response: [
        { team: { id: 541, name: "Real Madrid", country: "Spain", national: false, logo: "https://example.invalid/logo.png" } },
        { team: { id: 541, name: "Real Madrid", country: "Spain", national: false } },
        { team: { id: 9, name: "Spain", country: "Spain", national: true, logo: "https://example.invalid/flag.png" } },
      ],
    }),
  ]));

  const teams = await provider.searchTeams("Real Madrid");

  assert.equal(teams.length, 2);
  assert.equal(teams[0]?.kind, "club");
  assert.equal(teams[0]?.country, "Spain");
  assert.equal(teams[1]?.kind, "national");
  assert.equal(teams[0]?.crestUrl, null);
  assert.equal(teams[0]?.externalReference.providerId, "541");
});

test("squad normalization deduplicates player IDs and keeps available shirt/position data", async () => {
  const provider = new ApiFootballProvider("test-key", fakeFetcher([
    jsonResponse({
      errors: [],
      response: [{ team: { id: 541, name: "Real Madrid" }, players: [] }],
    }),
    jsonResponse({
      errors: [],
      response: [{
        team: { id: 541, name: "Real Madrid" },
        players: [
          { id: 99, name: "Player A", number: null, position: null, photo: "https://example.invalid/player.png" },
          { id: 99, name: "Player A", number: 10, position: "Midfielder", photo: "https://example.invalid/player.png" },
          { id: 100, name: "Player B", number: 1, position: "Goalkeeper" },
          { id: 101, name: "Player C", number: 99, position: "Forward" },
          { id: 101, name: "Player C", number: 1, position: "Goalkeeper" },
          { id: 101, name: "Player C", number: 1, position: "Goalkeeper" },
          { name: "Missing ID", number: 7, position: "Forward" },
        ],
      }],
    }),
  ]));

  const [team] = await provider.searchTeams("Real Madrid");
  assert.ok(team);
  const squad = await provider.getTeamSquad(team.externalReference.providerId);

  assert.equal(squad.players.length, 3);
  assert.equal(squad.players[0]?.shirtNumber, 10);
  assert.equal(squad.players[0]?.position, "Midfielder");
  assert.equal(squad.players[0]?.imageUrl, null);
  assert.equal(squad.players[2]?.shirtNumber, 1);
  assert.equal(squad.players[2]?.position, "Goalkeeper");
  assert.equal(squad.team.name, "Real Madrid");
});

test("provider key absence, rate limit, and free-plan restrictions return safe typed errors", async () => {
  const missingKey = new ApiFootballProvider(undefined, fakeFetcher([]));
  await assert.rejects(
    missingKey.searchTeams("Spain"),
    (error: unknown) => error instanceof ApiFootballProviderError && error.code === "provider_not_configured",
  );

  const rateLimited = new ApiFootballProvider("test-key", fakeFetcher([
    jsonResponse({ errors: [], response: [] }, 429),
  ]));
  await assert.rejects(
    rateLimited.searchTeams("Spain"),
    (error: unknown) => error instanceof ApiFootballProviderError && error.code === "provider_rate_limited",
  );

  const planRestricted = new ApiFootballProvider("test-key", fakeFetcher([
    jsonResponse({ errors: { plan: "Private provider-specific details" }, response: [] }),
  ]));
  await assert.rejects(
    planRestricted.searchTeams("Spain"),
    (error: unknown) => error instanceof ApiFootballProviderError &&
      error.code === "provider_plan_restricted" &&
      !error.message.includes("Private provider-specific details"),
  );
});

test("preserves a five-request margin when API-Football reports its daily quota", async () => {
  let calls = 0;
  const fetcher: typeof fetch = async () => {
    calls += 1;
    return new Response(JSON.stringify({ errors: [], response: [] }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "x-ratelimit-requests-remaining": "5",
      },
    });
  };
  const provider = new ApiFootballProvider("test-key", fetcher);

  await provider.searchTeams("Spain");
  await assert.rejects(
    provider.searchTeams("Brazil"),
    (error: unknown) => error instanceof ApiFootballProviderError && error.code === "provider_rate_limited",
  );
  assert.equal(calls, 1);
});

test("releases its local quota guard when API-Football's UTC daily quota resets", async () => {
  let calls = 0;
  let now = Date.parse("2026-10-13T23:59:00.000Z");
  const fetcher: typeof fetch = async () => {
    calls += 1;
    return new Response(JSON.stringify({ errors: [], response: [] }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        ...(calls === 1 ? { "x-ratelimit-requests-remaining": "5" } : {}),
      },
    });
  };
  const provider = new ApiFootballProvider("test-key", fetcher, () => now);

  await provider.searchTeams("Spain");
  await assert.rejects(provider.searchTeams("Brazil"));
  now = Date.parse("2026-10-14T00:01:00.000Z");
  await provider.searchTeams("Brazil");
  assert.equal(calls, 2);
});
