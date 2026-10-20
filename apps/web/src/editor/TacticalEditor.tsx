import { useState } from "react";
import type { BoardStateV1 } from "@tactical-board/contracts";
import {
  applyFormation,
  FORMATIONS,
  movePlayer,
  substituteBoardPlayer,
  type FormationName,
  type NormalizedPitchPoint,
} from "@tactical-board/domain";
import type { BoardDraft } from "./board-draft";
import { Pitch, type PitchView } from "./Pitch";
import { playerPositionLabel, teamKindLabel } from "../ui/labels";

const formationNames = Object.keys(FORMATIONS) as FormationName[];

interface TacticalEditorProps {
  initialDraft: BoardDraft;
  initialTitle: string;
  saving?: boolean;
  onSave: (title: string, state: BoardStateV1) => Promise<void>;
  onBack: () => void;
}

export function TacticalEditor({ initialDraft, initialTitle, saving = false, onSave, onBack }: TacticalEditorProps) {
  const [formation, setFormation] = useState(initialDraft.formation);
  const [pendingFormation, setPendingFormation] = useState(initialDraft.formation);
  const [view, setView] = useState<PitchView>(initialDraft.pitchView);
  const [players, setPlayers] = useState(initialDraft.players);
  const [bench, setBench] = useState(initialDraft.bench);
  const [selectedPlayerId, setSelectedPlayerId] = useState(players[0]?.id ?? "");
  const [title, setTitle] = useState(initialTitle);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  function handleMovePlayer(playerId: string, position: NormalizedPitchPoint) {
    setPlayers((currentPlayers) => movePlayer(currentPlayers, playerId, position));
  }

  function handleApplyFormation() {
    setPlayers((currentPlayers) => applyFormation(currentPlayers, pendingFormation, () => crypto.randomUUID()));
    setFormation(pendingFormation);
  }

  function handleSubstitution(benchPlayerId: string) {
    if (!selectedPlayerId) return;
    const result = substituteBoardPlayer(players, bench, selectedPlayerId, benchPlayerId);
    setPlayers(result.players);
    setBench(result.bench);
    setSelectedPlayerId(benchPlayerId);
  }

  async function handleSave() {
    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      setSaveError("Escribe un nombre para la pizarra.");
      setSaveMessage(null);
      return;
    }

    setSaveError(null);
    setSaveMessage(null);
    try {
      await onSave(normalizedTitle, {
        schemaVersion: 1,
        team: {
          name: initialDraft.teamName,
          kind: initialDraft.teamKind,
          primaryColor: initialDraft.teamColor,
          customTeamId: initialDraft.teamId,
          externalReference: initialDraft.teamExternalReference,
        },
        formation,
        pitchView: view,
        players,
        bench,
      });
      setSaveMessage("Pizarra guardada.");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "No se pudo guardar la pizarra.");
    }
  }

  const selectedPlayer = players.find((player) => player.id === selectedPlayerId);
  const teamTypeLabel = teamKindLabel(initialDraft.teamKind);

  return (
    <section className="editor" aria-label="Editor de pizarra táctica">
      <div className="editor-main">
        <div className="editor-heading">
          <div>
            <div className="eyebrow">{teamTypeLabel} / Pizarra táctica</div>
            <h1><input aria-label="Nombre de la pizarra" className="board-title-input" maxLength={120} onChange={(event) => setTitle(event.target.value)} value={title} /></h1>
          <p>{initialDraft.teamName} · {players.length} titulares · {bench.length} suplentes</p>
          </div>
          <div className="editor-heading__actions">
            <button className="quiet-button" type="button" onClick={onBack}>
              <span aria-hidden="true">←</span> Volver
            </button>
            <button className="save-button" type="button" disabled={saving} onClick={handleSave}>
              <span aria-hidden="true">↥</span> {saving ? "Guardando…" : "Guardar pizarra"}
            </button>
          </div>
        </div>
        {saveError && <p className="provider-message provider-message--error" role="alert">{saveError}</p>}
        {saveMessage && <p className="provider-message save-success" role="status">{saveMessage}</p>}

        <div className="pitch-card">
          <div className="pitch-toolbar">
            <div className="pitch-toolbar__left">
              <span className="toolbar-label">VISTA</span>
              <div className="segmented-control" role="group" aria-label="Vista de cancha">
                <button
                  className={view === "full" ? "is-active" : ""}
                  type="button"
                  aria-pressed={view === "full"}
                  onClick={() => setView("full")}
                >
                  Cancha completa
                </button>
                <button
                  className={view === "half" ? "is-active" : ""}
                  type="button"
                  aria-pressed={view === "half"}
                  onClick={() => setView("half")}
                >
                  Media cancha
                </button>
              </div>
            </div>
            <span className="pitch-toolbar__hint">{players.length} jugadores · posiciones libres</span>
          </div>

          <div className="pitch-frame">
            <Pitch
              players={players}
              selectedPlayerId={selectedPlayerId}
              teamColor={initialDraft.teamColor}
              view={view}
              onSelectPlayer={setSelectedPlayerId}
              onMovePlayer={handleMovePlayer}
            />
          </div>

          <div className="pitch-card__footer">
            <span><span className="legend-dot" aria-hidden="true" /> Formación {formation}</span>
            <span>Arrastra un jugador o selecciónalo y usa las flechas del teclado</span>
          </div>
        </div>

        <div className="editor-tip">
          <span className="tip-spark" aria-hidden="true">✳</span>
          <span><strong>Primero la forma, luego tu lectura.</strong> La formación propone posiciones, pero ningún jugador queda bloqueado.</span>
        </div>
      </div>

      <aside className="editor-sidebar" aria-label="Controles de alineación y formación">
        <div className="sidebar-section">
          <div className="section-title-row">
            <h2>Once titular</h2>
            <span className="count-pill">{players.length}</span>
          </div>
          <p className="section-caption">Selecciona un jugador para moverlo en la cancha.</p>

          <div className="player-list" role="list" aria-label="Titulares">
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
                    <small>{playerPositionLabel(player.snapshot.position)}</small>
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
            <h2>Formación</h2>
            <span className="formation-icon" aria-hidden="true">⌗</span>
          </div>
          <p className="section-caption">Elige una forma y aplícala al equipo.</p>
          <label className="select-label" htmlFor="formation-select">Formación inicial</label>
          <select
            id="formation-select"
            value={pendingFormation}
            onChange={(event) => setPendingFormation(event.target.value as FormationName)}
          >
            {formationNames.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
          <button className="apply-button" type="button" onClick={handleApplyFormation}>
            Aplicar formación <span aria-hidden="true">→</span>
          </button>
          {selectedPlayer && (
            <div className="selected-player-note" aria-live="polite">
              <span className="selected-player-indicator" aria-hidden="true" />
              Editando a <strong>{selectedPlayer.snapshot.name}</strong>
            </div>
          )}
        </div>

        <div className="sidebar-divider" />

        <div className="sidebar-section bench-section">
          <div className="section-title-row">
            <h2>Suplentes</h2>
            <span className="count-pill">{bench.length}</span>
          </div>
          {bench.length > 0 ? (
            <>
              <p className="section-caption">
                {selectedPlayer ? `Elige quién entra por ${selectedPlayer.snapshot.name}. Conservará su posición en la cancha.` : "Selecciona un titular antes de hacer el cambio."}
              </p>
              <div className="external-player-list" role="list" aria-label="Suplentes">
                {bench.map((player) => (
                  <div className="external-player-row" key={player.id} role="listitem">
                    <span className="row-number">{player.snapshot.shirtNumber ?? "–"}</span>
                    <span className="row-copy">
                      <strong>{player.snapshot.name}</strong>
                      <small>{playerPositionLabel(player.snapshot.position)}</small>
                    </span>
                    <button
                      className="player-use-button"
                      type="button"
                      disabled={!selectedPlayer}
                      onClick={() => handleSubstitution(player.id)}
                      aria-label={`Sustituir al jugador seleccionado por ${player.snapshot.name}`}
                    >
                      Entra
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="section-caption">Este equipo no tiene suplentes.</p>
          )}
        </div>

        <div className="sidebar-bottom-note">
          <span className="lock-icon" aria-hidden="true">◇</span>
          <span>La pizarra se guarda en tu espacio privado cuando pulsas «Guardar pizarra».</span>
        </div>
      </aside>
    </section>
  );
}
