import { useState, type FormEvent } from "react";
import type { FootballPlayerSummary, FootballTeamSummary, TeamSquadResponse } from "@tactical-board/contracts";
import {
  applyFormation,
  createFormationPlayers,
  FORMATIONS,
  movePlayer,
  replaceBoardPlayer,
  type FormationName,
  type NormalizedPitchPoint,
} from "@tactical-board/domain";
import { Pitch, type PitchView } from "./Pitch";
import { getFootballTeamSquad, searchFootballTeams } from "./football-data-client";

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
  const [teamQuery, setTeamQuery] = useState("");
  const [teamResults, setTeamResults] = useState<FootballTeamSummary[]>([]);
  const [activeTeam, setActiveTeam] = useState<FootballTeamSummary | null>(null);
  const [externalSquad, setExternalSquad] = useState<TeamSquadResponse | null>(null);
  const [providerBusy, setProviderBusy] = useState<"search" | "squad" | null>(null);
  const [providerError, setProviderError] = useState<string | null>(null);

  function handleMovePlayer(playerId: string, position: NormalizedPitchPoint) {
    setPlayers((currentPlayers) => movePlayer(currentPlayers, playerId, position));
  }

  function handleApplyFormation() {
    setPlayers((currentPlayers) => applyFormation(currentPlayers, pendingFormation, createId));
    setFormation(pendingFormation);
  }

  async function handleTeamSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = teamQuery.trim();
    if (query.length < 3) {
      setProviderError("Enter at least 3 characters to search for a team.");
      return;
    }

    setProviderBusy("search");
    setProviderError(null);
    setActiveTeam(null);
    setExternalSquad(null);
    try {
      const results = await searchFootballTeams(query);
      setTeamResults(results);
      if (results.length === 0) setProviderError("No matching clubs or national teams were found.");
    } catch (error) {
      setTeamResults([]);
      setProviderError(error instanceof Error ? error.message : "Could not search football teams.");
    } finally {
      setProviderBusy(null);
    }
  }

  async function handleLoadSquad(team: FootballTeamSummary) {
    setProviderBusy("squad");
    setProviderError(null);
    setActiveTeam(team);
    setExternalSquad(null);
    try {
      const result = await getFootballTeamSquad(team.externalReference.providerId);
      setExternalSquad(result);
      if (result.players.length === 0) setProviderError("No current squad data is available for this team.");
    } catch (error) {
      setProviderError(error instanceof Error ? error.message : "Could not load this squad.");
    } finally {
      setProviderBusy(null);
    }
  }

  function handleReplaceSelectedPlayer(player: FootballPlayerSummary) {
    if (!selectedPlayerId) return;
    const replacementId = createId();
    setPlayers((currentPlayers) => replaceBoardPlayer(
      currentPlayers,
      selectedPlayerId,
      {
        name: player.name,
        shirtNumber: player.shirtNumber,
        position: player.position,
        providerReference: player.externalReference,
      },
      () => replacementId,
    ));
    setSelectedPlayerId(replacementId);
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

        <div className="sidebar-divider" />

        <div className="sidebar-section data-section">
          <div className="section-title-row">
            <h2>Football data</h2>
            <span className="data-plan-pill">FREE</span>
          </div>
          <p className="section-caption">Search clubs or national teams and replace the selected player.</p>
          <form className="team-search-form" onSubmit={handleTeamSearch}>
            <label className="select-label" htmlFor="team-search">Club or country</label>
            <div className="team-search-control">
              <input
                id="team-search"
                value={teamQuery}
                maxLength={80}
                minLength={3}
                onChange={(event) => setTeamQuery(event.target.value)}
                placeholder="e.g. Real Madrid, Spain"
                autoComplete="off"
              />
              <button type="submit" disabled={providerBusy !== null}>
                {providerBusy === "search" ? "…" : "Search"}
              </button>
            </div>
          </form>

          {teamResults.length > 0 && (
            <div className="team-search-results" role="list" aria-label="Matching teams">
              {teamResults.map((team) => (
                <div key={team.id} role="listitem">
                  <button
                    className={`team-result${activeTeam?.id === team.id ? " team-result--active" : ""}`}
                    type="button"
                    onClick={() => handleLoadSquad(team)}
                    disabled={providerBusy !== null}
                  >
                    <span className="team-result__name">{team.name}</span>
                    <span className="team-result__meta">
                      {team.country ? `${team.country} · ` : ""}
                      {team.kind === "national" ? "Selection" : team.kind === "club" ? "Club" : "Team"}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          )}

          {providerBusy === "squad" && <p className="provider-message" role="status">Loading {activeTeam?.name ?? "team"} squad…</p>}
          {providerError && <p className="provider-message provider-message--error" role="alert">{providerError}</p>}

          {externalSquad && (
            <div className="external-squad" aria-label={`${externalSquad.team.name} squad`}>
              <div className="external-squad__heading">
                <strong>{externalSquad.team.name}</strong>
                <span>{externalSquad.players.length} players</span>
              </div>
              {selectedPlayer ? (
                <p className="provider-message">Choose a player to replace {selectedPlayer.snapshot.name}. Its pitch position will stay the same.</p>
              ) : (
                <p className="provider-message">Select a player on the pitch first.</p>
              )}
              <div className="external-player-list" role="list" aria-label={`${externalSquad.team.name} players`}>
                {externalSquad.players.map((player) => {
                  const assigned = players.some((boardPlayer) =>
                    boardPlayer.snapshot.providerReference?.providerId === player.externalReference.providerId,
                  );
                  return (
                    <div className="external-player-row" key={player.id} role="listitem">
                      <span className="row-number">{player.shirtNumber ?? "–"}</span>
                      <span className="row-copy">
                        <strong>{player.name}</strong>
                        <small>{player.position ?? "Position unavailable"}</small>
                      </span>
                      <button
                        className="player-use-button"
                        type="button"
                        disabled={!selectedPlayer || assigned}
                        onClick={() => handleReplaceSelectedPlayer(player)}
                        aria-label={assigned ? `${player.name} is already on the pitch` : `Use ${player.name} for selected player`}
                      >
                        {assigned ? "On pitch" : "Use"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <p className="provider-footnote">Free quota: 100 API requests per day. Squad data is cached briefly on this server; player photos and team logos are omitted.</p>
        </div>

        <div className="sidebar-bottom-note">
          <span className="lock-icon" aria-hidden="true">◇</span>
          <span>Board saving and custom teams arrive in the next iterations.</span>
        </div>
      </aside>
    </section>
  );
}
