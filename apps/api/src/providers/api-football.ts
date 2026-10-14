import type {
  FootballPlayerSummary,
  FootballTeamSummary,
  TeamSquadResponse,
} from "@tactical-board/contracts";
import type { FootballDataProvider } from "@tactical-board/domain";

const API_BASE_URL = "https://v3.football.api-sports.io";
const CACHE_TTL_MS = 5 * 60 * 1000;

type ApiFootballErrorCode =
  | "provider_not_configured"
  | "provider_rate_limited"
  | "provider_unavailable"
  | "provider_timeout"
  | "provider_invalid_response"
  | "provider_plan_restricted"
  | "team_not_found";

export class ApiFootballProviderError extends Error {
  constructor(
    readonly code: ApiFootballErrorCode,
    readonly httpStatus: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiFootballProviderError";
  }
}

interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function asId(value: unknown): string | null {
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) {
    return String(value);
  }
  if (typeof value === "string" && /^\d{1,16}$/.test(value)) return value;
  return null;
}

function apiHasErrors(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (isRecord(value)) return Object.keys(value).length > 0;
  return value !== null && value !== undefined && value !== false && value !== "";
}

function errorKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(() => "provider");
  return isRecord(value) ? Object.keys(value) : [];
}

function toTeamSummary(value: unknown): FootballTeamSummary | null {
  if (!isRecord(value) || !isRecord(value.team)) return null;
  const id = asId(value.team.id);
  const name = asString(value.team.name);
  if (!id || !name) return null;

  return {
    id: `api-football:${id}`,
    name,
    country: asString(value.team.country),
    kind: value.team.national === true
      ? "national"
      : value.team.national === false
        ? "club"
        : "unknown",
    // Logos are third-party assets; keep the integration text-only until rights are confirmed.
    crestUrl: null,
    externalReference: { provider: "api-football", providerId: id },
  };
}

function toPlayerSummary(value: unknown): FootballPlayerSummary | null {
  if (!isRecord(value)) return null;
  const id = asId(value.id);
  const name = asString(value.name);
  if (!id || !name) return null;

  return {
    id: `api-football:${id}`,
    name,
    shirtNumber: typeof value.number === "number" && Number.isInteger(value.number)
      ? value.number
      : null,
    position: asString(value.position),
    // Player photos are not sent to the client until their usage rights are confirmed.
    imageUrl: null,
    externalReference: { provider: "api-football", providerId: id },
  };
}

interface PlayerObservations {
  first: FootballPlayerSummary;
  shirtNumbers: Map<number, number>;
  positions: Map<string, number>;
}

function mostCommon<T>(observations: Map<T, number>): T | null {
  let selected: T | null = null;
  let selectedCount = 0;
  for (const [value, count] of observations) {
    if (count > selectedCount) {
      selected = value;
      selectedCount = count;
    }
  }
  return selected;
}

export class ApiFootballProvider implements FootballDataProvider {
  private readonly teamCache = new Map<string, CacheEntry<FootballTeamSummary>>();
  private readonly searchCache = new Map<string, CacheEntry<readonly FootballTeamSummary[]>>();
  private readonly squadCache = new Map<string, CacheEntry<TeamSquadResponse>>();
  private reportedDailyRemaining: number | null = null;
  private unconfirmedRequests = 0;
  private quotaDate: string;

  constructor(
    private readonly apiKey: string | undefined = process.env.APIFOOTBALL_API_KEY,
    private readonly fetcher: typeof fetch = fetch,
    private readonly now: () => number = Date.now,
  ) {
    this.quotaDate = this.currentUtcDate();
  }

  async searchTeams(query: string): Promise<readonly FootballTeamSummary[]> {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 3 || normalizedQuery.length > 80) {
      throw new ApiFootballProviderError(
        "provider_invalid_response",
        400,
        "Search text must contain between 3 and 80 characters.",
      );
    }

    const cacheKey = normalizedQuery.toLocaleLowerCase();
    const cached = this.searchCache.get(cacheKey);
    if (cached && cached.expiresAt > this.now()) return cached.value;

    const body = await this.request("/teams", { search: normalizedQuery });
    const records = Array.isArray(body.response) ? body.response : [];
    const uniqueTeams = new Map<string, FootballTeamSummary>();

    for (const record of records) {
      const team = toTeamSummary(record);
      if (team) uniqueTeams.set(team.externalReference.providerId, team);
    }

    const teams = [...uniqueTeams.values()];
    for (const team of teams) this.setCache(this.teamCache, team.externalReference.providerId, team);
    this.setCache(this.searchCache, cacheKey, teams);
    return teams;
  }

  async getTeamSquad(teamId: string): Promise<TeamSquadResponse> {
    const team = this.getCachedTeam(teamId);
    if (!team) {
      throw new ApiFootballProviderError(
        "team_not_found",
        404,
        "Search for the team again before loading its squad.",
      );
    }

    const cached = this.squadCache.get(teamId);
    if (cached && cached.expiresAt > this.now()) return cached.value;

    const body = await this.request("/players/squads", { team: teamId });
    const records = Array.isArray(body.response) ? body.response : [];
    const matchingRecord = records.find((record) => {
      if (!isRecord(record) || !isRecord(record.team)) return false;
      return asId(record.team.id) === teamId;
    });
    const rawPlayers = isRecord(matchingRecord) && Array.isArray(matchingRecord.players)
      ? matchingRecord.players
      : [];
    const uniquePlayers = new Map<string, PlayerObservations>();

    for (const rawPlayer of rawPlayers) {
      const player = toPlayerSummary(rawPlayer);
      if (!player) continue;
      const providerId = player.externalReference.providerId;
      const observation = uniquePlayers.get(providerId) ?? {
        first: player,
        shirtNumbers: new Map<number, number>(),
        positions: new Map<string, number>(),
      };
      if (player.shirtNumber !== null) {
        observation.shirtNumbers.set(
          player.shirtNumber,
          (observation.shirtNumbers.get(player.shirtNumber) ?? 0) + 1,
        );
      }
      if (player.position !== null) {
        observation.positions.set(
          player.position,
          (observation.positions.get(player.position) ?? 0) + 1,
        );
      }
      uniquePlayers.set(providerId, observation);
    }

    const result: TeamSquadResponse = {
      team,
      players: [...uniquePlayers.values()].map(({ first, shirtNumbers, positions }) => ({
        ...first,
        shirtNumber: mostCommon(shirtNumbers),
        position: mostCommon(positions),
      })),
      retrievedAt: new Date(this.now()).toISOString(),
    };
    this.setCache(this.squadCache, teamId, result);
    return result;
  }

  private getCachedTeam(teamId: string): FootballTeamSummary | null {
    const cached = this.teamCache.get(teamId);
    if (!cached || cached.expiresAt <= this.now()) {
      this.teamCache.delete(teamId);
      return null;
    }
    return cached.value;
  }

  private setCache<T>(cache: Map<string, CacheEntry<T>>, key: string, value: T): void {
    cache.set(key, { value, expiresAt: this.now() + CACHE_TTL_MS });
  }

  private currentUtcDate(): string {
    return new Date(this.now()).toISOString().slice(0, 10);
  }

  private async request(path: string, params: Record<string, string>): Promise<Record<string, unknown>> {
    const apiKey = this.apiKey?.trim();
    if (!apiKey || apiKey === "replace-with-your-api-football-key") {
      throw new ApiFootballProviderError(
        "provider_not_configured",
        503,
        "API-Football is not configured on the API server.",
      );
    }

    const utcDate = this.currentUtcDate();
    if (utcDate !== this.quotaDate) {
      this.quotaDate = utcDate;
      this.reportedDailyRemaining = null;
      this.unconfirmedRequests = 0;
    }

    if (
      this.unconfirmedRequests >= 90 ||
      (this.reportedDailyRemaining !== null && this.reportedDailyRemaining - this.unconfirmedRequests <= 5)
    ) {
      throw new ApiFootballProviderError(
        "provider_rate_limited",
        503,
        "TacticalBoard is preserving the remaining free API requests. Try again after the daily quota resets.",
      );
    }

    const url = new URL(path, API_BASE_URL);
    for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);

    let response: Response;
    try {
      this.unconfirmedRequests += 1;
      response = await this.fetcher(url, {
        headers: { "x-apisports-key": apiKey },
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      const timedOut = error instanceof Error && error.name === "TimeoutError";
      throw new ApiFootballProviderError(
        timedOut ? "provider_timeout" : "provider_unavailable",
        timedOut ? 504 : 502,
        timedOut ? "Football data request timed out." : "Football data is temporarily unavailable.",
      );
    }

    const remainingHeader = response.headers.get("x-ratelimit-requests-remaining");
    const remaining = remainingHeader === null ? Number.NaN : Number(remainingHeader);
    if (Number.isSafeInteger(remaining) && remaining >= 0) {
      this.reportedDailyRemaining = remaining;
      this.unconfirmedRequests = 0;
    }

    if (response.status === 429) {
      throw new ApiFootballProviderError(
        "provider_rate_limited",
        503,
        "The free API-Football request limit has been reached. Try again later.",
      );
    }
    if (!response.ok) {
      throw new ApiFootballProviderError(
        "provider_unavailable",
        502,
        response.status === 401 || response.status === 403
          ? "API-Football rejected the configured key or plan."
          : "Football data is temporarily unavailable.",
      );
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new ApiFootballProviderError(
        "provider_invalid_response",
        502,
        "API-Football returned an unreadable response.",
      );
    }

    if (!isRecord(body)) {
      throw new ApiFootballProviderError(
        "provider_invalid_response",
        502,
        "API-Football returned an unexpected response.",
      );
    }

    if (apiHasErrors(body.errors)) {
      const fields = errorKeys(body.errors);
      const planRestriction = fields.includes("plan");
      throw new ApiFootballProviderError(
        planRestriction ? "provider_plan_restricted" : "provider_unavailable",
        planRestriction ? 403 : 502,
        planRestriction
          ? "This data is not available in the current API-Football plan or season range."
          : "API-Football could not complete this request.",
      );
    }

    if (!Array.isArray(body.response)) {
      throw new ApiFootballProviderError(
        "provider_invalid_response",
        502,
        "API-Football returned an unexpected response.",
      );
    }

    return body;
  }
}
