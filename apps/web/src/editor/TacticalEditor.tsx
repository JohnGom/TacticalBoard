import { useState } from "react";
import {
  applyFormation,
  createFormationPlayers,
  FORMATIONS,
  movePlayer,
  type FormationName,
  type NormalizedPitchPoint,
} from "@tactical-board/domain";
import { Pitch, type PitchView } from "./Pitch";

const formationNames = Object.keys(FORMATIONS) as FormationName[];

function createId() {
  return crypto.randomUUID();
}

export function TacticalEditor() {
  const [formation, setFormation] = useState<FormationName>("4-3-3");
  const [pendingFormation, setPendingFormation] = useState<FormationName>("4-3-3");
  const [view, setView] = useState<PitchView>("full");
  const [players, setPlayers] = useState(() => createFormationPlayers("4-3-3", createId));
  const [selectedPlayerId, setSelectedPlayerId] = useState(players[0]?.id ?? "");

  function handleMovePlayer(playerId: string, position: NormalizedPitchPoint) {
    setPlayers((currentPlayers) => movePlayer(currentPlayers, playerId, position));
  }

  function handleApplyFormation() {
    setPlayers((currentPlayers) => applyFormation(currentPlayers, pendingFormation, createId));
    setFormation(pendingFormation);
  }

  const selectedPlayer = players.find((player) => player.id === selectedPlayerId);

  return (
    <section className="editor" aria-label="Tactical board editor">
      <div className="editor-main">
        <div className="editor-heading">
          <div>
            <div className="eyebrow">TACTICAL BOARD · DRAFT</div>
            <h1>Untitled board</h1>
            <p>Arrange your players and shape the space.</p>
          </div>
          <button className="quiet-button" type="button" disabled aria-label="Save board (coming soon)">
            <span aria-hidden="true">↥</span> Save board
          </button>
        </div>

        <div className="pitch-card">
          <div className="pitch-toolbar">
            <div className="pitch-toolbar__left">
              <span className="toolbar-label">VIEW</span>
              <div className="segmented-control" role="group" aria-label="Pitch view">
                <button
                  className={view === "full" ? "is-active" : ""}
                  type="button"
                  aria-pressed={view === "full"}
                  onClick={() => setView("full")}
                >
                  Full pitch
                </button>
                <button
                  className={view === "half" ? "is-active" : ""}
                  type="button"
                  aria-pressed={view === "half"}
                  onClick={() => setView("half")}
                >
                  Half pitch
                </button>
              </div>
            </div>
            <span className="pitch-toolbar__hint">{players.length} players · free positioning</span>
          </div>

          <div className="pitch-frame">
            <Pitch
              players={players}
              selectedPlayerId={selectedPlayerId}
              view={view}
              onSelectPlayer={setSelectedPlayerId}
              onMovePlayer={handleMovePlayer}
            />
          </div>

          <div className="pitch-card__footer">
            <span><span className="legend-dot" aria-hidden="true" /> {formation} starting shape</span>
            <span>Drag a player or focus one and use the arrow keys</span>
          </div>
        </div>

        <div className="editor-tip">
          <span className="tip-spark" aria-hidden="true">✳</span>
          <span><strong>Shape first, refine freely.</strong> Applying a formation sets a starting layout; it never locks player movement.</span>
        </div>
      </div>

      <aside className="editor-sidebar" aria-label="Lineup and formation controls">
        <div className="sidebar-section">
          <div className="section-title-row">
            <h2>Starting lineup</h2>
            <span className="count-pill">{players.length}</span>
          </div>
          <p className="section-caption">Select a player to edit their position on the pitch.</p>

          <div className="player-list" role="list" aria-label="Players on the pitch">
            {players.map((player, index) => (
              <div key={player.id} role="listitem">
                <button
                  className={`player-row${selectedPlayerId === player.id ? " player-row--selected" : ""}`}
                  type="button"
                  aria-pressed={selectedPlayerId === player.id}
                  onClick={() => setSelectedPlayerId(player.id)}
                >
                  <span className="row-number">{player.snapshot.shirtNumber ?? index + 1}</span>
                  <span className="row-copy">
                    <strong>{player.snapshot.name}</strong>
                    <small>{player.snapshot.position}</small>
                  </span>
                  <span className="row-chevron" aria-hidden="true">›</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="sidebar-divider" />

        <div className="sidebar-section formation-section">
          <div className="section-title-row">
            <h2>Formation</h2>
            <span className="formation-icon" aria-hidden="true">⌗</span>
          </div>
          <p className="section-caption">Choose a shape, then apply it to the lineup.</p>
          <label className="select-label" htmlFor="formation-select">Starting shape</label>
          <select
            id="formation-select"
            value={pendingFormation}
            onChange={(event) => setPendingFormation(event.target.value as FormationName)}
          >
            {formationNames.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
          <button className="apply-button" type="button" onClick={handleApplyFormation}>
            Apply formation <span aria-hidden="true">→</span>
          </button>
          {selectedPlayer && (
            <div className="selected-player-note" aria-live="polite">
              <span className="selected-player-indicator" aria-hidden="true" />
              Editing <strong>{selectedPlayer.snapshot.name}</strong>
            </div>
          )}
        </div>

        <div className="sidebar-bottom-note">
          <span className="lock-icon" aria-hidden="true">◇</span>
          <span>Board saving and custom squads arrive in the next iterations.</span>
        </div>
      </aside>
    </section>
  );
}
