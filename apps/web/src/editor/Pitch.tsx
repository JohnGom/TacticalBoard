import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import type { BoardPlayer, NormalizedPitchPoint } from "@tactical-board/domain";
import { playerPositionLabel } from "../ui/labels";

export type PitchView = "full" | "half";

function tooltipIdForPlayer(playerId: string): string {
  return `pitch-player-tooltip-${playerId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

interface PitchProps {
  players: readonly BoardPlayer[];
  selectedPlayerId: string;
  teamColor: string;
  view: PitchView;
  onSelectPlayer: (playerId: string) => void;
  onMovePlayer: (playerId: string, position: NormalizedPitchPoint) => void;
}

export function Pitch({
  players,
  selectedPlayerId,
  teamColor,
  view,
  onSelectPlayer,
  onMovePlayer,
}: PitchProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const draggingPlayerId = useRef<string | null>(null);
  const [hoveredPlayerId, setHoveredPlayerId] = useState<string | null>(null);
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

  function tooltipPosition(player: BoardPlayer): { style: CSSProperties; above: boolean } | null {
    const svg = svgRef.current;
    const canvas = canvasRef.current;
    if (!svg || !canvas) return null;

    const svgBounds = svg.getBoundingClientRect();
    const canvasBounds = canvas.getBoundingClientRect();
    const maxWidth = Math.min(260, Math.max(0, canvasBounds.width - 24));
    const halfWidth = maxWidth / 2;
    const markerX = svgBounds.left - canvasBounds.left + player.position.x * svgBounds.width;
    const markerY = svgBounds.top - canvasBounds.top + player.position.y * svgBounds.height;
    const above = markerY >= 88;

    return {
      above,
      style: {
        left: Math.max(halfWidth + 12, Math.min(markerX, canvasBounds.width - halfWidth - 12)),
        top: above ? markerY - 11 : markerY + 11,
        maxWidth,
      },
    };
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
    <div className="pitch-canvas" ref={canvasRef}>
      <svg
        ref={svgRef}
        className={`pitch-svg pitch-svg--${view}`}
        viewBox={`0 0 ${width} 64`}
        style={{ "--team-color": teamColor } as CSSProperties}
        role="group"
        aria-label={`${view === "full" ? "Cancha completa" : "Media cancha"}. Usa las flechas para mover al jugador enfocado.`}
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
          const label = `${player.snapshot.name}, ${playerPositionLabel(player.snapshot.position)}, dorsal ${shirtNumber}`;

          return (
            <g
              key={player.id}
              className={`pitch-player${isSelected ? " pitch-player--selected" : ""}`}
              role="button"
              tabIndex={0}
              aria-label={label}
              aria-pressed={isSelected}
              aria-describedby={hoveredPlayerId === player.id ? tooltipIdForPlayer(player.id) : undefined}
              transform={`translate(${player.position.x * width} ${player.position.y * 64})`}
              onClick={() => onSelectPlayer(player.id)}
              onPointerEnter={() => { if (!draggingPlayerId.current) setHoveredPlayerId(player.id); }}
              onPointerLeave={() => { if (!draggingPlayerId.current) setHoveredPlayerId(null); }}
              onFocus={() => setHoveredPlayerId(player.id)}
              onBlur={() => setHoveredPlayerId(null)}
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                draggingPlayerId.current = player.id;
                setHoveredPlayerId(null);
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
      {hoveredPlayerId && !draggingPlayerId.current && (() => {
        const player = players.find((candidate) => candidate.id === hoveredPlayerId);
        if (!player) return null;
        const position = tooltipPosition(player);
        if (!position) return null;
        const shirtNumber = player.snapshot.shirtNumber === null ? "" : ` · #${player.snapshot.shirtNumber}`;
        return (
          <div
            className={`pitch-player-tooltip${position.above ? " pitch-player-tooltip--above" : " pitch-player-tooltip--below"}`}
            id={tooltipIdForPlayer(player.id)}
            role="tooltip"
            style={position.style}
          >
            <strong>{player.snapshot.name}</strong>
            <span>{playerPositionLabel(player.snapshot.position)}{shirtNumber}</span>
          </div>
        );
      })()}
    </div>
  );
}
