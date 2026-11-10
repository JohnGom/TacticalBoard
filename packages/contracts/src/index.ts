import { z } from "zod";

export interface HealthResponse {
  status: "ok";
  service: "api";
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
}

export interface AuthSessionResponse {
  user: AuthUser | null;
}

export interface AuthProvidersResponse {
  emailPassword: true;
  google: boolean;
}

export const RegisterRequestSchema = z.object({
  displayName: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(12).max(128),
}).strict();

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const LoginRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(128),
}).strict();

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

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
  lastMatchLineup: LastMatchLineup | null;
  retrievedAt: string;
}

export interface LastMatchLineup {
  fixtureId: string;
  playedAt: string;
  opponentName: string | null;
  formation: string | null;
  startingPlayerIds: string[];
}

export interface FootballTeamSearchResponse {
  teams: FootballTeamSummary[];
}

export type FootballDataErrorCode =
  | "authentication_required"
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
export const ExternalReferenceSchema = z.object({
  provider: z.string().min(1).max(40),
  providerId: z.string().min(1).max(80),
}).strict();

export type ExternalReference = z.infer<typeof ExternalReferenceSchema>;

export const PersistedPlayerSnapshotSchema = z.object({
  name: z.string().trim().min(1).max(120),
  shirtNumber: z.number().int().min(1).max(99).nullable(),
  position: z.string().trim().max(50).nullable(),
  providerReference: ExternalReferenceSchema.nullable(),
}).strict();

export type PersistedPlayerSnapshot = z.infer<typeof PersistedPlayerSnapshotSchema>;

export const PersistedRosterPlayerSchema = z.object({
  id: z.string().min(1).max(120),
  snapshot: PersistedPlayerSnapshotSchema,
}).strict();

export type PersistedRosterPlayer = z.infer<typeof PersistedRosterPlayerSchema>;

export const PersistedBoardPlayerSchema = PersistedRosterPlayerSchema.extend({
  position: z.object({
    x: z.number().finite().min(0).max(1),
    y: z.number().finite().min(0).max(1),
  }).strict(),
}).strict();

export type PersistedBoardPlayer = z.infer<typeof PersistedBoardPlayerSchema>;

export const BoardStateV1Schema = z.object({
  schemaVersion: z.literal(1),
  team: z.object({
    name: z.string().trim().min(1).max(80),
    kind: z.enum(["custom", "club", "national", "unknown"]),
    primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    customTeamId: z.string().uuid().nullable(),
    externalReference: ExternalReferenceSchema.nullable(),
  }).strict(),
  formation: z.enum(["4-3-3", "4-4-2", "4-2-3-1"]),
  pitchView: z.enum(["full", "half"]),
  players: z.array(PersistedBoardPlayerSchema).length(11),
  bench: z.array(PersistedRosterPlayerSchema).max(100),
}).strict().superRefine((state, context) => {
  if (state.team.kind !== "custom" && state.team.customTeamId) {
    context.addIssue({
      code: "custom",
      path: ["team", "customTeamId"],
      message: "Only custom teams can reference a custom team record.",
    });
  }

  const playerIds = [...state.players, ...state.bench].map((player) => player.id);
  if (new Set(playerIds).size !== playerIds.length) {
    context.addIssue({
      code: "custom",
      path: ["players"],
      message: "Player identifiers must be unique across the lineup and bench.",
    });
  }
});

export type BoardStateV1 = z.infer<typeof BoardStateV1Schema>;

export const CreateBoardRequestSchema = z.object({
  title: z.string().trim().min(1).max(120),
  state: BoardStateV1Schema,
}).strict();

export type CreateBoardRequest = z.infer<typeof CreateBoardRequestSchema>;

export const UpdateBoardRequestSchema = z.object({
  revision: z.number().int().min(1),
  title: z.string().trim().min(1).max(120).optional(),
  state: BoardStateV1Schema.optional(),
}).strict().refine(
  (value) => value.title !== undefined || value.state !== undefined,
  "At least one board field must be updated.",
);

export type UpdateBoardRequest = z.infer<typeof UpdateBoardRequestSchema>;

const customTeamNameSchema = z.string().trim().min(1).max(80);
const customTeamColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const customRosterSchema = z.array(PersistedRosterPlayerSchema).min(11).max(100);

function validateCustomRoster(roster: PersistedRosterPlayer[], context: z.RefinementCtx): void {
  const ids = roster.map((player) => player.id);
  const numbers = roster.map((player) => player.snapshot.shirtNumber).filter((number) => number !== null);
  if (new Set(ids).size !== ids.length) {
    context.addIssue({ code: "custom", path: ["roster"], message: "Roster player IDs must be unique." });
  }
  if (new Set(numbers).size !== numbers.length) {
    context.addIssue({ code: "custom", path: ["roster"], message: "Shirt numbers must be unique." });
  }
  if (roster.some((player) => player.snapshot.shirtNumber === null)) {
    context.addIssue({ code: "custom", path: ["roster"], message: "Every custom-team player must have a shirt number." });
  }
  if (roster.some((player) => player.snapshot.providerReference !== null)) {
    context.addIssue({ code: "custom", path: ["roster"], message: "Custom team players cannot carry external provider references." });
  }
}

export const CreateCustomTeamRequestSchema = z.object({
  name: customTeamNameSchema,
  primaryColor: customTeamColorSchema,
  roster: customRosterSchema,
}).strict().superRefine((team, context) => validateCustomRoster(team.roster, context));

export type CreateCustomTeamRequest = z.infer<typeof CreateCustomTeamRequestSchema>;

export const UpdateCustomTeamRequestSchema = z.object({
  name: customTeamNameSchema.optional(),
  primaryColor: customTeamColorSchema.optional(),
  roster: customRosterSchema.optional(),
}).strict().superRefine((value, context) => {
  if (Object.keys(value).length === 0) {
    context.addIssue({ code: "custom", message: "At least one custom team field must be updated." });
  }
  if (value.roster) validateCustomRoster(value.roster, context);
});

export type UpdateCustomTeamRequest = z.infer<typeof UpdateCustomTeamRequestSchema>;

export interface SavedBoardSummary {
  id: string;
  revision: number;
  title: string;
  teamName: string;
  teamKind: "custom" | "club" | "national" | "unknown";
  updatedAt: string;
  createdAt: string;
}

export interface SavedBoard extends SavedBoardSummary {
  state: BoardStateV1;
}

export interface SavedCustomTeam {
  id: string;
  name: string;
  primaryColor: string;
  playerCount: number;
  createdAt: string;
  updatedAt: string;
  roster?: PersistedRosterPlayer[];
}

export interface CustomTeamDetails extends SavedCustomTeam {
  roster: PersistedRosterPlayer[];
}

export interface CustomTeamListResponse {
  teams: SavedCustomTeam[];
}

export interface BoardListResponse {
  boards: SavedBoardSummary[];
}

export interface BoardResponse {
  board: SavedBoard;
}

export interface CustomTeamResponse {
  team: CustomTeamDetails;
}
