import { useCallback, useEffect, useState } from "react";
import type { SavedBoardSummary, SavedCustomTeam } from "@tactical-board/contracts";
import { Link } from "react-router-dom";
import { deleteBoard, deleteCustomTeam, duplicateBoard, listBoards, listCustomTeams } from "../data/workspace-client";
import { PrivateNav } from "./PrivateNav";

interface WorkspaceData {
  boards: SavedBoardSummary[];
  teams: SavedCustomTeam[];
}

export function WorkspacePage() {
  const [data, setData] = useState<WorkspaceData>({ boards: [], teams: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ kind: "board" | "team"; id: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [boards, teams] = await Promise.all([listBoards(), listCustomTeams()]);
      setData({ boards, teams });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cargar tu espacio.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  async function handleDuplicate(boardId: string) {
    setBusyId(boardId);
    setError(null);
    try {
      await duplicateBoard(boardId);
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo duplicar la pizarra.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setBusyId(target.id);
    setError(null);
    try {
      if (target.kind === "board") await deleteBoard(target.id);
      else await deleteCustomTeam(target.id);
      setPendingDelete(null);
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo eliminar el elemento.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="workspace-page">
      <PrivateNav />

      <section className="workspace-heading">
        <div>
          <p className="section-kicker">Tu espacio de trabajo</p>
          <h1>Las ideas que siguen en juego.</h1>
          <p>Abre una pizarra guardada o prepara una nueva.</p>
        </div>
        <Link className="button-primary button-primary--dark" to="/app/boards/new">Nueva pizarra <span aria-hidden="true">↗</span></Link>
      </section>

      {error && <p className="workspace-error" role="alert">{error}</p>}
      {loading ? (
        <p className="workspace-loading" role="status">Cargando tus pizarras y equipos…</p>
      ) : (
        <>
          <section className="workspace-section" aria-labelledby="boards-heading">
            <div className="workspace-section__heading">
              <div><p className="section-kicker">Tableros tácticos</p><h2 id="boards-heading">Tus pizarras</h2></div>
              <span className="count-pill">{data.boards.length}</span>
            </div>
            {data.boards.length > 0 ? (
              <div className="board-library">
                {data.boards.map((board) => (
                  <article className="board-library-item" key={board.id}>
                    <div className="board-library-item__graphic" aria-hidden="true">
                      <span /><span /><span /><span /><i />
                    </div>
                    <div className="board-library-item__body">
                      <p className="board-library-item__meta">{board.teamKind === "national" ? "SELECCIÓN" : board.teamKind === "club" ? "CLUB" : "EQUIPO PROPIO"} / {board.teamName}</p>
                      <h3>{board.title}</h3>
                      <p className="board-library-item__date">Actualizada {new Date(board.updatedAt).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" })}</p>
                      <div className="board-library-item__actions">
                        <Link to={`/app/boards/${board.id}`}>Abrir pizarra</Link>
                        <button disabled={busyId === board.id} onClick={() => void handleDuplicate(board.id)} type="button">Duplicar</button>
                        <button disabled={busyId === board.id} onClick={() => setPendingDelete({ kind: "board", id: board.id })} type="button">Eliminar</button>
                      </div>
                      {pendingDelete?.kind === "board" && pendingDelete.id === board.id && (
                        <div className="inline-confirm" role="group" aria-label={`Confirmar eliminación de ${board.title}`}>
                          <span>¿Eliminar esta pizarra?</span>
                          <button disabled={busyId === board.id} onClick={() => void handleDelete()} type="button">Sí, eliminar</button>
                          <button onClick={() => setPendingDelete(null)} type="button">Cancelar</button>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="workspace-empty">
                <div className="empty-pitch-mark" aria-hidden="true"><span /><i /></div>
                <h3>Tu primera pizarra empieza aquí.</h3>
                <p>Elige un plantel real o arma uno propio antes de entrar a la cancha.</p>
                <Link className="text-link" to="/app/boards/new">Preparar una pizarra <span aria-hidden="true">↗</span></Link>
              </div>
            )}
          </section>

          <section className="workspace-section workspace-teams" id="equipos" aria-labelledby="teams-heading">
            <div className="workspace-section__heading">
              <div><p className="section-kicker">Planteles reutilizables</p><h2 id="teams-heading">Tus equipos personalizados</h2></div>
              <span className="count-pill">{data.teams.length}</span>
            </div>
            {data.teams.length > 0 ? (
              <div className="saved-teams-list">
                {data.teams.map((team) => (
                  <article className="saved-team-row" key={team.id}>
                    <span className="saved-team-row__swatch" style={{ backgroundColor: team.primaryColor }} aria-hidden="true" />
                    <div className="saved-team-row__info"><strong>{team.name}</strong><small>{team.playerCount} jugadores</small></div>
                    <Link to="/app/boards/new" state={{ customTeamId: team.id }}>Usar en una pizarra</Link>
                    <button onClick={() => setPendingDelete({ kind: "team", id: team.id })} type="button">Eliminar</button>
                    {pendingDelete?.kind === "team" && pendingDelete.id === team.id && (
                      <div className="inline-confirm" role="group" aria-label={`Confirmar eliminación de ${team.name}`}>
                        <span>Las pizarras guardadas conservarán el snapshot del equipo. ¿Eliminarlo?</span>
                        <button disabled={busyId === team.id} onClick={() => void handleDelete()} type="button">Sí, eliminar</button>
                        <button onClick={() => setPendingDelete(null)} type="button">Cancelar</button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <p className="workspace-empty-inline">Los equipos personalizados que crees aparecerán aquí para volver a usarlos.</p>
            )}
          </section>
        </>
      )}
    </main>
  );
}
