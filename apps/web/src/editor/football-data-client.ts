import type {
  FootballDataErrorResponse,
  FootballTeamSearchResponse,
  FootballTeamSummary,
  TeamSquadResponse,
} from "@tactical-board/contracts";

export class FootballDataClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FootballDataClientError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTeamSummary(value: unknown): value is FootballTeamSummary {
  if (!isRecord(value) || !isRecord(value.externalReference)) return false;
  return typeof value.id === "string" &&
    typeof value.name === "string" &&
    (typeof value.country === "string" || value.country === null) &&
    (value.kind === "club" || value.kind === "national" || value.kind === "unknown") &&
    (typeof value.crestUrl === "string" || value.crestUrl === null) &&
    typeof value.externalReference.provider === "string" &&
    typeof value.externalReference.providerId === "string";
}

function isSearchResponse(value: unknown): value is FootballTeamSearchResponse {
  return isRecord(value) && Array.isArray(value.teams) && value.teams.every(isTeamSummary);
}

function isFootballDataErrorResponse(value: unknown): value is FootballDataErrorResponse {
  if (!isRecord(value) || typeof value.error !== "string" || typeof value.message !== "string") {
    return false;
  }
  return [
    "provider_not_configured",
    "provider_rate_limited",
    "provider_unavailable",
    "provider_timeout",
    "provider_invalid_response",
    "provider_plan_restricted",
    "team_not_found",
  ].includes(value.error);
}

function isSquadResponse(value: unknown): value is TeamSquadResponse {
  if (!isRecord(value) || !isTeamSummary(value.team) || !Array.isArray(value.players)) return false;
  return typeof value.retrievedAt === "string" && value.players.every((player) => {
    if (!isRecord(player) || !isRecord(player.externalReference)) return false;
    return typeof player.id === "string" &&
      typeof player.name === "string" &&
      (typeof player.shirtNumber === "number" || player.shirtNumber === null) &&
      (typeof player.position === "string" || player.position === null) &&
      (typeof player.imageUrl === "string" || player.imageUrl === null) &&
      typeof player.externalReference.provider === "string" &&
      typeof player.externalReference.providerId === "string";
  });
}

async function readPayload(response: Response): Promise<unknown> {
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const errorPayload = isFootballDataErrorResponse(payload) ? payload : null;
    throw new FootballDataClientError(
      errorPayload && typeof errorPayload.message === "string"
        ? errorPayload.message
        : "Football data is temporarily unavailable.",
    );
  }
  return payload;
}

export async function searchFootballTeams(query: string): Promise<FootballTeamSummary[]> {
  const response = await fetch(`/api/football/teams?query=${encodeURIComponent(query)}`);
  const payload = await readPayload(response);
  if (!isSearchResponse(payload)) {
    throw new FootballDataClientError("The API returned an invalid team list.");
  }
  return payload.teams;
}

export async function getFootballTeamSquad(teamId: string): Promise<TeamSquadResponse> {
  const response = await fetch(`/api/football/teams/${encodeURIComponent(teamId)}/squad`);
  const payload = await readPayload(response);
  if (!isSquadResponse(payload)) {
    throw new FootballDataClientError("The API returned an invalid squad.");
  }
  return payload;
}
