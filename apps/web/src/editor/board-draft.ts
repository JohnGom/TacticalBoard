import type { ExternalReference } from "@tactical-board/contracts";
import type { BoardPlayer, FormationName, RosterPlayer } from "@tactical-board/domain";
import type { PitchView } from "./Pitch";

export type BoardTeamKind = "custom" | "club" | "national" | "unknown";

export interface BoardDraft {
  teamName: string;
  teamKind: BoardTeamKind;
  teamColor: string;
  teamId: string | null;
  teamExternalReference: ExternalReference | null;
  formation: FormationName;
  pitchView: PitchView;
  players: BoardPlayer[];
  bench: RosterPlayer[];
}
