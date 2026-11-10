import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { CustomTeamDetails, FootballPlayerSummary, FootballTeamSummary, LastMatchLineup, SavedCustomTeam } from "@tactical-board/contracts";
import {
  createLineupFromRoster,
  FORMATIONS,
  type FormationName,
  type PlayerSnapshot,
  type RosterPlayer,
} from "@tactical-board/domain";
import type { BoardDraft } from "./board-draft";
import { getFootballTeamSquad, searchFootballTeams } from "./football-data-client";
import { createCustomTeam, getCustomTeam, listCustomTeams } from "../data/workspace-client";
import { footballCountryLabel, footballTeamNameLabel, playerPositionLabel, teamKindLabel } from "../ui/labels";

const formations = Object.keys(FORMATIONS) as FormationName[];
const positions = ["Portero", "Defensa", "Centrocampista", "Delantero", "Otra"];
const roleLabels: Record<string, string> = {
  Goalkeeper: "Portero",
  Defender: "Defensa",
  Midfielder: "Centrocampista",
  Forward: "Delantero",
};

interface EditablePlayer {
  id: string;
  name: string;
  shirtNumber: string;
  position: string;
}

interface BoardSetupProps {
  initialSavedTeamId?: string | null;
  onStartBoard: (draft: BoardDraft) => void | Promise<void>;
}

function createId() {
  return crypto.randomUUID();
}

function createEmptyCustomRoster(): EditablePlayer[] {
  return FORMATIONS["4-3-3"].map((slot, index) => ({
    id: createId(),
    name: "",
    shirtNumber: String(index + 1),
    position: roleLabels[slot.role] ?? "Otra",
  }));
}

function FormationSelect({
  value,
  onChange,
}: {
  value: FormationName;
  onChange: (formation: FormationName) => void;
}) {
  return (
    <label className="setup-field">
      <span>Formación inicial</span>
      <select value={value} onChange={(event) => onChange(event.target.value as FormationName)}>
        {formations.map((formation) => <option key={formation} value={formation}>{formation}</option>)}
      </select>
    </label>
  );
}

function toRosterPlayer(player: FootballPlayerSummary): RosterPlayer {
  return {
    id: player.id,
    snapshot: {
      name: player.name,
      shirtNumber: player.shirtNumber,
      position: player.position,
      providerReference: player.externalReference,
    },
  };
}

function supportedFormation(value: string | null | undefined): FormationName | null {
  return formations.find((formation) => formation === value) ?? null;
}

export function BoardSetup({ initialSavedTeamId = null, onStartBoard }: BoardSetupProps) {
  const [step, setStep] = useState<"choose" | "real" | "custom" | "saved">(initialSavedTeamId ? "saved" : "choose");
  const [formation, setFormation] = useState<FormationName>("4-3-3");
  const [teamQuery, setTeamQuery] = useState("");
  const [teamResults, setTeamResults] = useState<FootballTeamSummary[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<FootballTeamSummary | null>(null);
  const [loadedSquad, setLoadedSquad] = useState<FootballPlayerSummary[] | null>(null);
  const [lastMatchLineup, setLastMatchLineup] = useState<LastMatchLineup | null>(null);
  const [savedTeams, setSavedTeams] = useState<SavedCustomTeam[]>([]);
  const [savedTeamsLoaded, setSavedTeamsLoaded] = useState(false);
  const [selectedSavedTeam, setSelectedSavedTeam] = useState<SavedCustomTeam | null>(null);
  const [loadedSavedTeam, setLoadedSavedTeam] = useState<CustomTeamDetails | null>(null);
  const [customTeamName, setCustomTeamName] = useState("");
  const [customColor, setCustomColor] = useState("#a9cbb4");
  const [customPlayers, setCustomPlayers] = useState<EditablePlayer[]>(createEmptyCustomRoster);
  const [busy, setBusy] = useState<"search" | "squad" | "saving" | null>(initialSavedTeamId ? "squad" : null);
  const [error, setError] = useState<string | null>(null);

  const loadSavedTeam = useCallback(async (
    team: SavedCustomTeam,
    isCurrent: () => boolean = () => true,
  ) => {
    if (!isCurrent()) return;
    setSelectedSavedTeam(team);
    setLoadedSavedTeam(null);
    setStep("saved");
    setBusy("squad");
    setError(null);
    try {
      const details = await getCustomTeam(team.id);
      if (isCurrent()) setLoadedSavedTeam(details);
    } catch (cause) {
      if (isCurrent()) setError(cause instanceof Error ? cause.message : "No se pudo cargar el equipo guardado.");
    } finally {
      if (isCurrent()) setBusy(null);
    }
  }, []);

  useEffect(() => {
    let active = true;
    listCustomTeams()
      .then((teams) => {
        if (!active) return;
        setSavedTeams(teams);
        if (initialSavedTeamId) {
          const team = teams.find((savedTeam) => savedTeam.id === initialSavedTeamId);
          if (team) void loadSavedTeam(team, () => active);
          else {
            setError("No se encontró el equipo guardado. Elige otro equipo para continuar.");
            setBusy(null);
          }
        }
      })
      .catch(() => {
        if (!active) return;
        setSavedTeams([]);
        if (initialSavedTeamId) {
          setError("No se pudo cargar el equipo solicitado.");
          setBusy(null);
        }
      })
      .finally(() => { if (active) setSavedTeamsLoaded(true); });
    return () => { active = false; };
  }, [initialSavedTeamId, loadSavedTeam]);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = teamQuery.trim();
    if (query.length < 3) {
      setError("Escribe al menos 3 caracteres para buscar.");
      return;
    }

    setBusy("search");
    setError(null);
    setSelectedTeam(null);
    setLoadedSquad(null);
    setLastMatchLineup(null);
    setFormation("4-3-3");
    try {
      const results = await searchFootballTeams(query);
      setTeamResults(results);
      if (results.length === 0) setError("No encontramos clubes ni selecciones con ese nombre.");
    } catch (cause) {
      setTeamResults([]);
      setError(cause instanceof Error ? cause.message : "No se pudo buscar el equipo.");
    } finally {
      setBusy(null);
    }
  }

  async function handleSelectTeam(team: FootballTeamSummary) {
    setSelectedTeam(team);
    setLoadedSquad(null);
    setLastMatchLineup(null);
    setFormation("4-3-3");
    setBusy("squad");
    setError(null);
    try {
      const squad = await getFootballTeamSquad(team.externalReference.providerId);
      setLoadedSquad(squad.players);
      const recentStarterIds = new Set(squad.lastMatchLineup?.startingPlayerIds ?? []);
      const hasCompleteRecentStartingXI = squad.players.filter((player) => recentStarterIds.has(player.id)).length === 11;
      const usableLastMatchLineup = hasCompleteRecentStartingXI ? squad.lastMatchLineup : null;
      setLastMatchLineup(usableLastMatchLineup);
      setFormation(supportedFormation(usableLastMatchLineup?.formation) ?? "4-3-3");
      if (squad.players.length < 11) {
        setError("El proveedor no devolvió 11 jugadores para este equipo. Prueba otro resultado.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cargar el plantel.");
    } finally {
      setBusy(null);
    }
  }

  function handleStartSavedTeam() {
    if (!loadedSavedTeam) return;
    const lineup = createLineupFromRoster(formation, loadedSavedTeam.roster);
    if (lineup.players.length < 11) {
      setError("El equipo guardado necesita 11 jugadores para completar la alineación.");
      return;
    }
    void onStartBoard({
      teamName: loadedSavedTeam.name,
      teamKind: "custom",
      teamColor: loadedSavedTeam.primaryColor,
      teamId: loadedSavedTeam.id,
      teamExternalReference: null,
      formation,
      pitchView: "full",
      ...lineup,
    });
  }

  function handleStartRealTeam() {
    if (!selectedTeam || !loadedSquad || loadedSquad.length < 11) return;
    const roster = loadedSquad.map(toRosterPlayer);
    const recentStarterIds = new Set(lastMatchLineup?.startingPlayerIds ?? []);
    const lineupOrder = new Map<string, number>();
    lastMatchLineup?.startingPlayerIds.forEach((playerId, index) => lineupOrder.set(playerId, index));
    const recentStarters = roster
      .filter((player) => recentStarterIds.has(player.id))
      .sort((left, right) => (lineupOrder.get(left.id) ?? 0) - (lineupOrder.get(right.id) ?? 0));
    const hasRecentStartingXI = recentStarters.length === 11;
    const lineup = createLineupFromRoster(formation, hasRecentStartingXI ? recentStarters : roster);
    if (lineup.players.length < 11) {
      setError("No hay suficientes jugadores para completar los 11 titulares.");
      return;
    }
    void onStartBoard({
      teamName: footballTeamNameLabel(selectedTeam),
      teamKind: selectedTeam.kind,
      teamColor: "#a9cbb4",
      teamId: null,
      teamExternalReference: selectedTeam.externalReference,
      formation,
      pitchView: "full",
      ...lineup,
      bench: hasRecentStartingXI
        ? [...lineup.bench, ...roster.filter((player) => !recentStarterIds.has(player.id))]
        : lineup.bench,
    });
  }

  function updateCustomPlayer(id: string, field: keyof Omit<EditablePlayer, "id">, value: string) {
    setCustomPlayers((current) => current.map((player) =>
      player.id === id ? { ...player, [field]: value } : player,
    ));
  }

  function addSubstitute() {
    const usedNumbers = new Set(customPlayers.map((player) => Number(player.shirtNumber)));
    let number = 12;
    while (usedNumbers.has(number) && number <= 99) number += 1;
    if (number > 99) {
      setError("No quedan dorsales disponibles entre 1 y 99.");
      return;
    }
    setCustomPlayers((current) => [
      ...current,
      { id: createId(), name: "", shirtNumber: String(number), position: "Centrocampista" },
    ]);
    setError(null);
  }

  function removeSubstitute(id: string) {
    setCustomPlayers((current) => current.filter((player, index) => index < 11 || player.id !== id));
  }

  async function handleCreateCustomTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = customTeamName.trim();
    if (!name) {
      setError("Escribe el nombre del equipo.");
      return;
    }

    const parsedPlayers = customPlayers.map((player) => ({
      ...player,
      normalizedName: player.name.trim(),
      parsedNumber: Number(player.shirtNumber),
    }));
    if (parsedPlayers.some((player) => !player.normalizedName)) {
      setError("Completa el nombre de cada titular y suplente.");
      return;
    }
    if (parsedPlayers.some((player) => !Number.isInteger(player.parsedNumber) || player.parsedNumber < 1 || player.parsedNumber > 99)) {
      setError("Los dorsales deben ser números enteros entre 1 y 99.");
      return;
    }
    if (new Set(parsedPlayers.map((player) => player.parsedNumber)).size !== parsedPlayers.length) {
      setError("Cada jugador debe tener un dorsal diferente.");
      return;
    }

    const roster: RosterPlayer[] = parsedPlayers.map((player) => {
      const snapshot: PlayerSnapshot = {
        name: player.normalizedName,
        shirtNumber: player.parsedNumber,
        position: player.position,
        providerReference: null,
      };
      return { id: player.id, snapshot };
    });
    const lineup = createLineupFromRoster(formation, roster);
    if (lineup.players.length !== 11) {
      setError("Se necesitan 11 jugadores para entrar a la cancha.");
      return;
    }

    setBusy("saving");
    setError(null);
    try {
      const savedTeam = await createCustomTeam({ name, primaryColor: customColor, roster });
      setSavedTeams((current) => [savedTeam, ...current.filter((team) => team.id !== savedTeam.id)]);
      await onStartBoard({
        teamName: savedTeam.name,
        teamKind: "custom",
        teamColor: savedTeam.primaryColor,
        teamId: savedTeam.id,
        teamExternalReference: null,
        formation,
        pitchView: "full",
        ...lineup,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar el equipo.");
    } finally {
      setBusy(null);
    }
  }

  if (step === "choose") {
    return (
      <main className="setup-page">
        <section className="setup-card" aria-labelledby="setup-title">
          <div className="eyebrow">ANTES DE ENTRAR A LA CANCHA</div>
          <h1 id="setup-title">¿Cómo quieres armar tu pizarra?</h1>
          <p className="setup-intro">Elige un equipo real para cargar su plantel o crea uno propio con tus jugadores y dorsales.</p>
          <div className="setup-choice-grid">
            <button className="setup-choice" type="button" onClick={() => { setStep("real"); setError(null); }}>
              <span className="setup-choice__icon" aria-hidden="true">◎</span>
              <strong>Usar un equipo real</strong>
              <span>Busca un club o selección; cargaremos sus jugadores y dorsales disponibles.</span>
              <span className="setup-choice__action">Buscar equipos <span aria-hidden="true">→</span></span>
            </button>
            <button className="setup-choice" type="button" onClick={() => { setStep("custom"); setError(null); }}>
              <span className="setup-choice__icon setup-choice__icon--custom" aria-hidden="true">✳</span>
              <strong>Crear un equipo personalizado</strong>
              <span>Define el nombre, color, titulares y suplentes de tu equipo.</span>
              <span className="setup-choice__action">Crear equipo <span aria-hidden="true">→</span></span>
            </button>
          </div>
      {savedTeamsLoaded && savedTeams.length > 0 && (
            <section className="setup-saved-teams" aria-labelledby="saved-teams-title">
              <div>
                <p className="section-kicker">Planteles guardados</p>
                <h2 id="saved-teams-title">Vuelve a usar uno de tus equipos.</h2>
              </div>
              <div className="setup-saved-teams__list">
                {savedTeams.map((team) => (
                  <button className="saved-team-choice" key={team.id} onClick={() => void loadSavedTeam(team)} type="button" disabled={busy !== null}>
                    <span className="saved-team-choice__swatch" style={{ backgroundColor: team.primaryColor }} aria-hidden="true" />
                    <span className="saved-team-choice__info"><strong>{team.name}</strong><small>{team.playerCount} jugadores</small></span>
                    <span aria-hidden="true">↗</span>
                  </button>
                ))}
              </div>
            </section>
          )}
          <p className="provider-footnote setup-footnote">Los datos reales usan el plan gratuito de API-Football. El plan permite 100 solicitudes diarias; los escudos y fotos no se cargan.</p>
        </section>
      </main>
    );
  }

  if (step === "real") {
    return (
      <main className="setup-page">
        <section className="setup-card setup-card--form" aria-labelledby="real-title">
          <button className="setup-back" type="button" onClick={() => { setStep("choose"); setError(null); }}>← Volver</button>
          <div className="eyebrow">EQUIPO REAL</div>
          <h1 id="real-title">Busca un club o una selección</h1>
          <p className="setup-intro">Al elegir un resultado, cargamos el plantel disponible antes de abrir la cancha.</p>
          <form className="setup-search-form" onSubmit={handleSearch}>
            <label className="setup-field">
              <span>Nombre del club o país</span>
              <div className="setup-search-control">
                <input
                  autoFocus
                  autoComplete="off"
                  maxLength={80}
                  minLength={3}
                  onChange={(event) => setTeamQuery(event.target.value)}
                  placeholder="Real Madrid, España, Flamengo…"
                  value={teamQuery}
                />
                <button className="setup-primary-button" type="submit" disabled={busy !== null}>
                  {busy === "search" ? "Buscando…" : "Buscar"}
                </button>
              </div>
            </label>
          </form>

          {teamResults.length > 0 && (
            <div className="setup-results" aria-label="Resultados de búsqueda">
              {teamResults.map((team) => (
                <button
                  className={`setup-result${selectedTeam?.id === team.id ? " setup-result--selected" : ""}`}
                  disabled={busy !== null}
                  key={team.id}
                  onClick={() => handleSelectTeam(team)}
                  type="button"
                >
                  <span>
                    <strong>{footballTeamNameLabel(team)}</strong>
                    <small>{footballCountryLabel(team.country)} · {teamKindLabel(team.kind)}</small>
                  </span>
                  <span aria-hidden="true">{selectedTeam?.id === team.id ? "✓" : "›"}</span>
                </button>
              ))}
            </div>
          )}

          {busy === "squad" && <p className="provider-message" role="status">Cargando plantel de {selectedTeam ? footballTeamNameLabel(selectedTeam) : "tu equipo"}…</p>}
          {error && <p className="setup-error" role="alert">{error}</p>}

          {selectedTeam && loadedSquad && (
            <section className="setup-squad-preview" aria-labelledby="squad-preview-title">
              <div className="setup-squad-preview__heading">
                <div>
                  <h2 id="squad-preview-title">{footballTeamNameLabel(selectedTeam)}</h2>
                  <p>{loadedSquad.length} jugadores disponibles · {teamKindLabel(selectedTeam.kind)}</p>
                </div>
                <span className="count-pill">{loadedSquad.length}</span>
              </div>
              <div className="setup-roster-preview" role="list" aria-label="Plantel disponible">
                {loadedSquad.map((player) => (
                  <div className="setup-roster-row" key={player.id} role="listitem">
                    <span className="row-number">{player.shirtNumber ?? "–"}</span>
                    <span className="row-copy">
                      <strong>{player.name}</strong>
                      <small>{playerPositionLabel(player.position)}</small>
                    </span>
                  </div>
                ))}
              </div>
              <FormationSelect value={formation} onChange={setFormation} />
              <p className="provider-message">
                {lastMatchLineup
                  ? `Tomamos como referencia el último partido${lastMatchLineup.opponentName ? ` contra ${footballCountryLabel(lastMatchLineup.opponentName)}` : ""} (${new Date(lastMatchLineup.playedAt).toLocaleDateString("es")}). Puedes cambiar la formación antes de entrar.`
                  : "No hay una alineación reciente disponible; proponemos el once por posición y el resto queda en el banco."}
              </p>
              <button className="setup-primary-button setup-primary-button--wide" type="button" onClick={handleStartRealTeam} disabled={loadedSquad.length < 11}>
                Entrar a la cancha <span aria-hidden="true">→</span>
              </button>
            </section>
          )}
        </section>
      </main>
    );
  }

  if (step === "saved") {
    return (
      <main className="setup-page">
        <section className="setup-card setup-card--form" aria-labelledby="saved-team-title">
          <button className="setup-back" type="button" onClick={() => { setStep("choose"); setError(null); }}>← Volver</button>
          <div className="eyebrow">EQUIPO PERSONALIZADO GUARDADO</div>
          <h1 id="saved-team-title">{selectedSavedTeam?.name ?? (error ? "Equipo no disponible" : "Cargando equipo…")}</h1>
          {busy === "squad" && <p className="provider-message" role="status">Cargando tu plantel…</p>}
          {error && <p className="setup-error" role="alert">{error}</p>}
          {!selectedSavedTeam && error && <button className="setup-back" type="button" onClick={() => { setStep("choose"); setError(null); }}>← Elegir otro equipo</button>}
          {loadedSavedTeam && (
            <>
              <p className="setup-intro">{loadedSavedTeam.roster.length} jugadores · elige la formación para esta pizarra.</p>
              <div className="setup-roster-preview" role="list" aria-label="Plantel guardado">
                {loadedSavedTeam.roster.map((player) => (
                  <div className="setup-roster-row" key={player.id} role="listitem">
                    <span className="row-number">{player.snapshot.shirtNumber ?? "–"}</span>
                    <span className="row-copy"><strong>{player.snapshot.name}</strong><small>{playerPositionLabel(player.snapshot.position)}</small></span>
                  </div>
                ))}
              </div>
              <FormationSelect value={formation} onChange={setFormation} />
              <button className="setup-primary-button setup-primary-button--wide" type="button" disabled={loadedSavedTeam.roster.length < 11} onClick={handleStartSavedTeam}>
                Entrar a la cancha <span aria-hidden="true">→</span>
              </button>
            </>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="setup-page">
      <section className="setup-card setup-card--form setup-card--custom" aria-labelledby="custom-title">
        <button className="setup-back" type="button" onClick={() => { setStep("choose"); setError(null); }}>← Volver</button>
        <div className="eyebrow">EQUIPO PERSONALIZADO</div>
        <h1 id="custom-title">Arma tu propio plantel</h1>
        <p className="setup-intro">Completa los 11 titulares. También puedes añadir suplentes antes de entrar a la cancha.</p>

        <form onSubmit={handleCreateCustomTeam}>
          <div className="custom-team-meta">
            <label className="setup-field">
              <span>Nombre del equipo</span>
              <input maxLength={60} onChange={(event) => setCustomTeamName(event.target.value)} placeholder="Mi equipo" value={customTeamName} />
            </label>
            <label className="setup-field setup-color-field">
              <span>Color del equipo</span>
              <input aria-label="Color del equipo" onChange={(event) => setCustomColor(event.target.value)} type="color" value={customColor} />
            </label>
          </div>

          <div className="section-title-row custom-roster-heading">
            <h2>Plantel</h2>
            <span className="count-pill">{customPlayers.length}</span>
          </div>
          <p className="provider-message">El nombre, dorsal y posición se pueden editar. Los primeros 11 forman la alineación inicial.</p>

          <div className="custom-roster-list">
            {customPlayers.map((player, index) => {
              const playerType = index < 11 ? "Titular" : "Suplente";
              const playerNumber = index < 11 ? index + 1 : index - 10;
              const playerLabel = `${playerType} ${playerNumber}`;
              return (
                <div className="custom-player-row" key={player.id}>
                  <span className="custom-player-row__index">{index < 11 ? index + 1 : "S"}</span>
                  <input
                    aria-label={`${playerLabel} nombre`}
                    maxLength={60}
                    onChange={(event) => updateCustomPlayer(player.id, "name", event.target.value)}
                    placeholder={`Nombre ${playerNumber}`}
                    value={player.name}
                  />
                  <input
                    aria-label={`${playerLabel} dorsal`}
                    max="99"
                    min="1"
                    onChange={(event) => updateCustomPlayer(player.id, "shirtNumber", event.target.value)}
                    type="number"
                    value={player.shirtNumber}
                  />
                  <select
                    aria-label={`${playerLabel} posición`}
                    onChange={(event) => updateCustomPlayer(player.id, "position", event.target.value)}
                    value={player.position}
                  >
                    {positions.map((position) => <option key={position} value={position}>{position}</option>)}
                  </select>
                  {index >= 11 && (
                    <button aria-label={`Quitar suplente ${playerNumber}`} className="remove-player-button" onClick={() => removeSubstitute(player.id)} type="button">×</button>
                  )}
                </div>
              );
            })}
          </div>

          <button className="add-substitute-button" onClick={addSubstitute} type="button">+ Añadir suplente</button>

          <div className="custom-formation-row">
            <FormationSelect value={formation} onChange={setFormation} />
          </div>

          {error && <p className="setup-error" role="alert">{error}</p>}
          <button className="setup-primary-button setup-primary-button--wide" type="submit" disabled={busy !== null}>
            {busy === "saving" ? "Guardando equipo…" : "Crear equipo y entrar a la cancha"}
            <span aria-hidden="true">→</span>
          </button>
        </form>
      </section>
    </main>
  );
}
