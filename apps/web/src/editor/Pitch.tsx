import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import type { BoardPlayer, NormalizedPitchPoint } from "@tactical-board/domain";

export type PitchView = "full" | "half";

interface PitchProps {
  players: readonly BoardPlayer[];
  selectedPlayerId: string;
  view: PitchView;
  onSelectPlayer: (playerId: string) => void;
  onMovePlayer: (playerId: string, position: NormalizedPitchPoint) => void;
}

export function Pitch({
  players,
  selectedPlayerId,
  view,
  onSelectPlayer,
  onMovePlayer,
}: PitchProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const draggingPlayerId = useRef<string | null>(null);
  const width = view === "full" ? 100 : 50;

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    const playerId = draggingPlayerId.current;
    const svg = svgRef.current;
    const screenMatrix = svg?.getScreenCTM();
    if (!playerId || !svg || !screenMatrix) return;

    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const localPoint = point.matrixTransform(screenMatrix.inverse());

    onMovePlayer(playerId, {
      x: localPoint.x / width,
      y: localPoint.y / 64,
    });
  }

  function stopDragging() {
    draggingPlayerId.current = null;
  }

  function handlePlayerKeyDown(
    event: KeyboardEvent<SVGGElement>,
    player: BoardPlayer,
  ) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelectPlayer(player.id);
      return;
    }

    const step = event.shiftKey ? 0.05 : 0.015;
    const offsets: Record<string, NormalizedPitchPoint> = {
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
    };
    const offset = offsets[event.key];
    if (!offset) return;

    event.preventDefault();
    onSelectPlayer(player.id);
    onMovePlayer(player.id, {
      x: player.position.x + offset.x,
      y: player.position.y + offset.y,
    });
  }

  return (
    <svg
      ref={svgRef}
      className={`pitch-svg pitch-svg--${view}`}
      viewBox={`0 0 ${width} 64`}
      role="group"
      aria-label={`${view === "full" ? "Full" : "Half"} football pitch. Use arrow keys to move the focused player.`}
      onPointerMove={handlePointerMove}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
    >
      <rect className="pitch-surface" x="0" y="0" width={width} height="64" rx="1.5" />
      <g className="pitch-markings" aria-hidden="true">
        <rect x="1.5" y="1.5" width={width - 3} height="61" rx="1" />
        {view === "full" ? (
          <>
            <line x1="50" y1="1.5" x2="50" y2="62.5" />
            <circle cx="50" cy="32" r="9.2" />
            <circle className="pitch-center-spot" cx="50" cy="32" r="0.55" />
            <rect x="1.5" y="17" width="16" height="30" />
            <rect x="1.5" y="24" width="5" height="16" />
            <rect x="82.5" y="17" width="16" height="30" />
            <rect x="93.5" y="24" width="5" height="16" />
            <circle className="pitch-center-spot" cx="11" cy="32" r="0.55" />
            <circle className="pitch-center-spot" cx="89" cy="32" r="0.55" />
          </>
        ) : (
          <>
            <line x1="48.5" y1="1.5" x2="48.5" y2="62.5" />
            <rect x="1.5" y="17" width="16" height="30" />
            <rect x="1.5" y="24" width="5" height="16" />
            <circle className="pitch-center-spot" cx="11" cy="32" r="0.55" />
          </>
        )}
      </g>

      {players.map((player) => {
        const isSelected = player.id === selectedPlayerId;
        const shirtNumber = player.snapshot.shirtNumber ?? "–";
        const label = `${player.snapshot.name}, ${player.snapshot.position ?? "Player"}, number ${shirtNumber}`;

        return (
          <g
            key={player.id}
            className={`pitch-player${isSelected ? " pitch-player--selected" : ""}`}
            role="button"
            tabIndex={0}
            aria-label={label}
            aria-pressed={isSelected}
            transform={`translate(${player.position.x * width} ${player.position.y * 64})`}
            onClick={() => onSelectPlayer(player.id)}
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              draggingPlayerId.current = player.id;
              onSelectPlayer(player.id);
              svgRef.current?.setPointerCapture(event.pointerId);
            }}
            onKeyDown={(event) => handlePlayerKeyDown(event, player)}
          >
            <circle className="player-halo" r="4.8" />
            <circle className="player-marker" r="3.7" />
            <text className="player-number" textAnchor="middle" dy="0.95">
              {shirtNumber}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
