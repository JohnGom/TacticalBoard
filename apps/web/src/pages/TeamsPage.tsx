import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import type { CustomTeamDetails, PersistedRosterPlayer, SavedCustomTeam } from "@tactical-board/contracts";
import { getCustomTeam, listCustomTeams, updateCustomTeam } from "../data/workspace-client";
import { PrivateNav } from "./PrivateNav";

const playerPositions = ["Portero", "Defensa", "Centrocampista", "Delantero", "Otra"];

interface EditableRosterPlayer {
  id: string;
  name: string;
  shirtNumber: string;
  position: string;
}

function toEditableRoster(roster: PersistedRosterPlayer[]): EditableRosterPlayer[] {
  return roster.map((player) => ({
    id: player.id,
    name: player.snapshot.name,
    shirtNumber: player.snapshot.shirtNumber === null ? "" : String(player.snapshot.shirtNumber),
    position: player.snapshot.position ?? "Otra",
  }));
}

export function TeamsPage() {
  const [teams, setTeams] = useState<SavedCustomTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listCustomTeams()
      .then((result) => { if (active) setTeams(result); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "No se pudieron cargar los equipos."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <main className="workspace-page">
      <PrivateNav />
      <section className="workspace-heading">
        <div><p className="section-kicker">Planteles reutilizables</p><h1>Tus equipos.</h1><p>Los equipos que crees al preparar una pizarra se guardan aquí.</p></div>
        <Link className="button-primary button-primary--dark" to="/app/boards/new">Crear equipo <span aria-hidden="true">↗</span></Link>
      </section>
      {error && <p className="workspace-error" role="alert">{error}</p>}
      {loading ? (
        <p className="workspace-loading" role="status">Cargando tus equipos…</p>
      ) : teams.length > 0 ? (
        <div className="team-library">
          {teams.map((team) => (
            <article className="team-library-card" key={team.id}>
              <div className="team-library-card__top">
                <span className="saved-team-row__swatch" style={{ backgroundColor: team.primaryColor }} aria-hidden="true" />
                <span className="count-pill">{team.playerCount}</span>
              </div>
              <p className="section-kicker">EQUIPO PERSONALIZADO</p>
              <h2>{team.name}</h2>
              <p>{team.playerCount} jugadores en el plantel</p>
              <div className="team-library-card__actions">
                <Link to={`/app/teams/${team.id}`}>Editar equipo</Link>
                <Link to="/app/boards/new" state={{ customTeamId: team.id }}>Usar en una pizarra</Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="workspace-empty">
          <div className="empty-pitch-mark" aria-hidden="true"><span /><i /></div>
          <h3>Aún no tienes equipos guardados.</h3>
          <p>Crea un equipo personalizado al preparar una pizarra; quedará disponible para reutilizarlo.</p>
          <Link className="text-link" to="/app/boards/new">Crear un equipo <span aria-hidden="true">↗</span></Link>
        </div>
      )}
    </main>
  );
}

export function CustomTeamPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const [team, setTeam] = useState<CustomTeamDetails | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#a9cbb4");
  const [players, setPlayers] = useState<EditableRosterPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!teamId) {
      setError("No se encontró el equipo solicitado.");
      setLoading(false);
      return;
    }
    getCustomTeam(teamId)
      .then((loadedTeam) => {
        if (!active) return;
        setTeam(loadedTeam);
        setName(loadedTeam.name);
        setColor(loadedTeam.primaryColor);
        setPlayers(toEditableRoster(loadedTeam.roster));
      })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "No se pudo cargar el equipo."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [teamId]);

  function updatePlayer(id: string, field: keyof Omit<EditableRosterPlayer, "id">, value: string) {
    setPlayers((current) => current.map((player) => player.id === id ? { ...player, [field]: value } : player));
  }

  function addSubstitute() {
    let number = 1;
    const used = new Set(players.map((player) => Number(player.shirtNumber)));
    while (used.has(number) && number <= 99) number += 1;
    if (number > 99 || players.length >= 100) {
      setError("No quedan espacios o dorsales disponibles.");
      return;
    }
    setPlayers((current) => [...current, { id: crypto.randomUUID(), name: "", shirtNumber: String(number), position: "Centrocampista" }]);
    setError(null);
  }

  async function saveTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!teamId || !team) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    const roster = players.map((player) => ({
      id: player.id,
      snapshot: {
        name: player.name.trim(),
        shirtNumber: player.shirtNumber === "" ? null : Number(player.shirtNumber),
        position: player.position || null,
        providerReference: null,
      },
    }));
    try {
      const updated = await updateCustomTeam(teamId, { name: name.trim(), primaryColor: color, roster });
      setTeam({ ...updated, roster });
      setSuccess("Equipo guardado.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron guardar los cambios.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="workspace-page">
      <PrivateNav />
      {loading ? <p className="workspace-loading" role="status">Cargando el equipo…</p> : !team ? (
        <div className="workspace-empty"><h1>Equipo no disponible</h1><p>{error ?? "No se encontró el equipo."}</p><Link to="/app/teams">Volver a tus equipos</Link></div>
      ) : (
        <section className="team-edit-page">
          <Link className="setup-back" to="/app/teams">← Volver a tus equipos</Link>
          <p className="section-kicker">EQUIPO PERSONALIZADO</p>
          <h1>Editar {team.name}</h1>
          <p className="setup-intro">Actualiza nombres, dorsales y posiciones. Las pizarras guardadas conservan su propio snapshot.</p>
          <form onSubmit={saveTeam}>
            <div className="custom-team-meta">
              <label className="setup-field"><span>Nombre del equipo</span><input maxLength={80} onChange={(event) => setName(event.target.value)} required value={name} /></label>
              <label className="setup-field setup-color-field"><span>Color del equipo</span><input aria-label="Color del equipo" onChange={(event) => setColor(event.target.value)} type="color" value={color} /></label>
            </div>
            <div className="section-title-row custom-roster-heading"><h2>Plantel</h2><span className="count-pill">{players.length}</span></div>
            <div className="custom-roster-list">
              {players.map((player, index) => (
                <div className="custom-player-row" key={player.id}>
                  <span className="custom-player-row__index">{index < 11 ? index + 1 : "S"}</span>
                  <input aria-label={`Jugador ${index + 1} nombre`} maxLength={120} onChange={(event) => updatePlayer(player.id, "name", event.target.value)} required value={player.name} />
                  <input aria-label={`Jugador ${index + 1} dorsal`} max="99" min="1" onChange={(event) => updatePlayer(player.id, "shirtNumber", event.target.value)} required step="1" type="number" value={player.shirtNumber} />
                  <select aria-label={`Jugador ${index + 1} posición`} onChange={(event) => updatePlayer(player.id, "position", event.target.value)} value={player.position}>
                    {playerPositions.map((position) => <option key={position} value={position}>{position}</option>)}
                  </select>
                  {index >= 11 && <button aria-label={`Quitar jugador ${index + 1}`} className="remove-player-button" onClick={() => setPlayers((current) => current.filter((item) => item.id !== player.id))} type="button">×</button>}
                </div>
              ))}
            </div>
            <button className="add-substitute-button" onClick={addSubstitute} type="button">+ Añadir suplente</button>
            {error && <p className="setup-error" role="alert">{error}</p>}
            {success && <p className="save-success" role="status">{success}</p>}
            <button className="setup-primary-button setup-primary-button--wide" disabled={saving} type="submit">{saving ? "Guardando…" : "Guardar equipo"}</button>
          </form>
        </section>
      )}
    </main>
  );
}
