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

export interface RosterPlayer {
  id: string;
  snapshot: PlayerSnapshot;
}

export interface BoardPlayer extends RosterPlayer {
  position: NormalizedPitchPoint;
}

export interface FormationLineup {
  players: BoardPlayer[];
  bench: RosterPlayer[];
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

function positionGroup(position: string | null): string | null {
  const normalized = position?.toLowerCase();
  if (!normalized) return null;
  if (normalized.includes("goalkeeper") || normalized.includes("keeper") || normalized === "gk" || normalized.includes("portero") || normalized.includes("guardameta")) return "Goalkeeper";
  if (normalized.includes("defender") || normalized.includes("defence") || normalized.includes("defense") || normalized.includes("back") || normalized.includes("defensa") || normalized.includes("lateral")) return "Defender";
  if (normalized.includes("midfield") || normalized === "midfielder" || normalized.includes("centrocampista") || normalized.includes("mediocampista")) return "Midfielder";
  if (normalized.includes("forward") || normalized.includes("attacker") || normalized.includes("striker") || normalized.includes("winger") || normalized.includes("delantero") || normalized.includes("extremo")) return "Forward";
  return null;
}

/** Places available roster members into formation slots by position, then returns the rest as substitutes. */
export function createLineupFromRoster(
  formation: FormationName,
  roster: readonly RosterPlayer[],
): FormationLineup {
  const remaining = [...roster];
  const players: BoardPlayer[] = [];

  for (const slot of FORMATIONS[formation]) {
    if (remaining.length === 0) break;
    const matchingIndex = remaining.findIndex(
      (player) => positionGroup(player.snapshot.position) === slot.role,
    );
    const [player] = remaining.splice(matchingIndex >= 0 ? matchingIndex : 0, 1);
    if (player) players.push({ ...player, position: { ...slot.position } });
  }

  return { players, bench: remaining };
}

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

export function substituteBoardPlayer(
  players: readonly BoardPlayer[],
  bench: readonly RosterPlayer[],
  boardPlayerId: string,
  benchPlayerId: string,
): FormationLineup {
  const currentPlayer = players.find((player) => player.id === boardPlayerId);
  const replacement = bench.find((player) => player.id === benchPlayerId);
  if (!currentPlayer) throw new Error(`Player ${boardPlayerId} is not on this board`);
  if (!replacement) throw new Error(`Substitute ${benchPlayerId} is not on this bench`);

  return {
    players: players.map((player) =>
      player.id === boardPlayerId
        ? { ...replacement, position: { ...currentPlayer.position } }
        : player,
    ),
    bench: [
      ...bench.filter((player) => player.id !== benchPlayerId),
      { id: currentPlayer.id, snapshot: currentPlayer.snapshot },
    ],
  };
}

/** Domain-facing port; concrete provider transport stays in the API infrastructure layer. */
export interface FootballDataProvider {
  searchTeams(query: string): Promise<readonly import("@tactical-board/contracts").FootballTeamSummary[]>;
  getTeamSquad(teamId: string): Promise<import("@tactical-board/contracts").TeamSquadResponse>;
}
