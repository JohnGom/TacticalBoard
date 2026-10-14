export type TeamKind = "custom" | "external";

export interface ProviderReference {
  provider: string;
  providerId: string;
}

export interface PlayerSnapshot {
  name: string;
  shirtNumber: number | null;
  position: string | null;
  providerReference: ProviderReference | null;
}

export interface NormalizedPitchPoint {
  x: number;
  y: number;
}

export interface BoardPlayer {
  id: string;
  snapshot: PlayerSnapshot;
  position: NormalizedPitchPoint;
}

export interface FormationSlot {
  role: string;
  position: NormalizedPitchPoint;
}

export const FORMATIONS = {
  "4-3-3": [
    { role: "Goalkeeper", position: { x: 0.08, y: 0.5 } },
    { role: "Defender", position: { x: 0.25, y: 0.16 } },
    { role: "Defender", position: { x: 0.27, y: 0.39 } },
    { role: "Defender", position: { x: 0.27, y: 0.61 } },
    { role: "Defender", position: { x: 0.25, y: 0.84 } },
    { role: "Midfielder", position: { x: 0.47, y: 0.28 } },
    { role: "Midfielder", position: { x: 0.5, y: 0.5 } },
    { role: "Midfielder", position: { x: 0.47, y: 0.72 } },
    { role: "Forward", position: { x: 0.75, y: 0.2 } },
    { role: "Forward", position: { x: 0.79, y: 0.5 } },
    { role: "Forward", position: { x: 0.75, y: 0.8 } },
  ],
  "4-4-2": [
    { role: "Goalkeeper", position: { x: 0.08, y: 0.5 } },
    { role: "Defender", position: { x: 0.25, y: 0.16 } },
    { role: "Defender", position: { x: 0.27, y: 0.39 } },
    { role: "Defender", position: { x: 0.27, y: 0.61 } },
    { role: "Defender", position: { x: 0.25, y: 0.84 } },
    { role: "Midfielder", position: { x: 0.48, y: 0.16 } },
    { role: "Midfielder", position: { x: 0.48, y: 0.39 } },
    { role: "Midfielder", position: { x: 0.48, y: 0.61 } },
    { role: "Midfielder", position: { x: 0.48, y: 0.84 } },
    { role: "Forward", position: { x: 0.74, y: 0.38 } },
    { role: "Forward", position: { x: 0.74, y: 0.62 } },
  ],
  "4-2-3-1": [
    { role: "Goalkeeper", position: { x: 0.08, y: 0.5 } },
    { role: "Defender", position: { x: 0.25, y: 0.16 } },
    { role: "Defender", position: { x: 0.27, y: 0.39 } },
    { role: "Defender", position: { x: 0.27, y: 0.61 } },
    { role: "Defender", position: { x: 0.25, y: 0.84 } },
    { role: "Midfielder", position: { x: 0.45, y: 0.39 } },
    { role: "Midfielder", position: { x: 0.45, y: 0.61 } },
    { role: "Midfielder", position: { x: 0.63, y: 0.2 } },
    { role: "Midfielder", position: { x: 0.66, y: 0.5 } },
    { role: "Midfielder", position: { x: 0.63, y: 0.8 } },
    { role: "Forward", position: { x: 0.8, y: 0.5 } },
  ],
} satisfies Record<string, readonly FormationSlot[]>;

export type FormationName = keyof typeof FORMATIONS;

export function clampPitchPoint(point: NormalizedPitchPoint): NormalizedPitchPoint {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new RangeError("Pitch coordinates must be finite numbers");
  }

  return {
    x: Math.min(1, Math.max(0, point.x)),
    y: Math.min(1, Math.max(0, point.y)),
  };
}

function createPlayer(slot: FormationSlot, index: number, createId: () => string): BoardPlayer {
  return {
    id: createId(),
    snapshot: {
      name: `Player ${index + 1}`,
      shirtNumber: index + 1,
      position: slot.role,
      providerReference: null,
    },
    position: { ...slot.position },
  };
}

export function createFormationPlayers(
  formation: FormationName,
  createId: () => string,
): BoardPlayer[] {
  return FORMATIONS[formation].map((slot, index) => createPlayer(slot, index, createId));
}

/** Reapply a chosen setup while preserving the identities and edits on existing players. */
export function applyFormation(
  players: readonly BoardPlayer[],
  formation: FormationName,
  createId: () => string,
): BoardPlayer[] {
  return FORMATIONS[formation].map((slot, index) => {
    const existing = players[index];
    return existing
      ? { ...existing, position: { ...slot.position } }
      : createPlayer(slot, index, createId);
  });
}

export function movePlayer(
  players: readonly BoardPlayer[],
  playerId: string,
  position: NormalizedPitchPoint,
): BoardPlayer[] {
  if (!players.some((player) => player.id === playerId)) {
    throw new Error(`Player ${playerId} is not on this board`);
  }

  const boundedPosition = clampPitchPoint(position);
  return players.map((player) =>
    player.id === playerId ? { ...player, position: boundedPosition } : player,
  );
}

export function replaceBoardPlayer(
  players: readonly BoardPlayer[],
  boardPlayerId: string,
  snapshot: PlayerSnapshot,
  createId: () => string,
): BoardPlayer[] {
  if (!players.some((player) => player.id === boardPlayerId)) {
    throw new Error(`Player ${boardPlayerId} is not on this board`);
  }

  return players.map((player) =>
    player.id === boardPlayerId
      ? { ...player, id: createId(), snapshot: { ...snapshot } }
      : player,
  );
}

/** Domain-facing port; concrete provider transport stays in the API infrastructure layer. */
export interface FootballDataProvider {
  searchTeams(query: string): Promise<readonly import("@tactical-board/contracts").FootballTeamSummary[]>;
  getTeamSquad(teamId: string): Promise<import("@tactical-board/contracts").TeamSquadResponse>;
}
