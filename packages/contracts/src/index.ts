export interface HealthResponse {
  status: "ok";
  service: "api";
}

export interface ExternalReference {
  provider: string;
  providerId: string;
}

export interface FootballPlayerSummary {
  id: string;
  name: string;
  shirtNumber: number | null;
  position: string | null;
  imageUrl: string | null;
  externalReference: ExternalReference;
}

export interface FootballTeamSummary {
  id: string;
  name: string;
  country: string | null;
  kind: "club" | "national" | "unknown";
  crestUrl: string | null;
  externalReference: ExternalReference;
}

export interface TeamSquadResponse {
  team: FootballTeamSummary;
  players: FootballPlayerSummary[];
  retrievedAt: string;
}

export interface FootballTeamSearchResponse {
  teams: FootballTeamSummary[];
}

export type FootballDataErrorCode =
  | "provider_not_configured"
  | "provider_rate_limited"
  | "provider_unavailable"
  | "provider_timeout"
  | "provider_invalid_response"
  | "provider_plan_restricted"
  | "team_not_found";

export interface FootballDataErrorResponse {
  error: FootballDataErrorCode;
  message: string;
}
