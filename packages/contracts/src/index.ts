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
  kind: "club" | "national" | "unknown";
  crestUrl: string | null;
  externalReference: ExternalReference;
}

export interface TeamSquadResponse {
  team: FootballTeamSummary;
  players: FootballPlayerSummary[];
  retrievedAt: string;
}
