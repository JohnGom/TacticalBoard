import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import type { BoardStateV1, SavedBoard } from "@tactical-board/contracts";
import { BoardSetup } from "../editor/BoardSetup";
import type { BoardDraft } from "../editor/board-draft";
import { TacticalEditor } from "../editor/TacticalEditor";
import { createBoard, getBoard, updateBoard } from "../data/workspace-client";
import { PrivateNav } from "./PrivateNav";

function isBoardDraft(value: unknown): value is BoardDraft {
  if (typeof value !== "object" || value === null) return false;
  const draft = value as Partial<BoardDraft>;
  return typeof draft.teamName === "string" &&
    typeof draft.teamColor === "string" &&
    typeof draft.teamId !== "undefined" &&
    typeof draft.formation === "string" &&
    Array.isArray(draft.players) &&
    Array.isArray(draft.bench);
}

function customTeamIdFromState(value: unknown): string | null {
  if (typeof value !== "object" || value === null || !("customTeamId" in value)) return null;
  return typeof value.customTeamId === "string" ? value.customTeamId : null;
}

function draftFromSavedBoard(state: BoardStateV1): BoardDraft {
  return {
    teamName: state.team.name,
    teamKind: state.team.kind,
    teamColor: state.team.primaryColor,
    teamId: state.team.customTeamId,
    teamExternalReference: state.team.externalReference,
    formation: state.formation,
    pitchView: state.pitchView,
    players: state.players,
    bench: state.bench,
  };
}

export function NewBoardPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const locationState: unknown = location.state;
  const draft = typeof locationState === "object" && locationState !== null && "draft" in locationState
    ? (locationState as { draft: unknown }).draft
    : null;
  const initialSavedTeamId = customTeamIdFromState(locationState);

  if (!isBoardDraft(draft)) {
    return (
      <>
        <PrivateNav />
        <BoardSetup
          initialSavedTeamId={initialSavedTeamId}
          onStartBoard={(nextDraft) => navigate("/app/boards/new", { state: { draft: nextDraft }, replace: true })}
        />
      </>
    );
  }

  const boardTitle = `Pizarra de ${draft.teamName}`;
  return (
    <>
      <PrivateNav />
      <TacticalEditor
        initialDraft={draft}
        initialTitle={boardTitle}
        onBack={() => navigate("/app", { replace: true })}
        onSave={async (title, state) => {
          const created = await createBoard(title, state);
          navigate(`/app/boards/${created.id}`, { replace: true });
        }}
      />
    </>
  );
}

export function SavedBoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const [board, setBoard] = useState<SavedBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!boardId) {
      setError("No se encontró el identificador de la pizarra.");
      setLoading(false);
      return;
    }
    getBoard(boardId)
      .then((result) => { if (active) setBoard(result); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "No se pudo abrir la pizarra."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [boardId]);

  if (loading) return <><PrivateNav /><p className="workspace-loading" role="status">Abriendo tu pizarra…</p></>;
  if (error || !board) {
    return (
      <><PrivateNav /><main className="workspace-page"><p className="workspace-error" role="alert">{error ?? "No se encontró la pizarra."}</p><button className="text-link-button" onClick={() => navigate("/app")} type="button">Volver a mis pizarras</button></main></>
    );
  }

  return (
    <>
      <PrivateNav />
      <TacticalEditor
        initialDraft={draftFromSavedBoard(board.state)}
        initialTitle={board.title}
        onBack={() => navigate("/app")}
        onSave={async (title, state) => {
          const updated = await updateBoard(board.id, board.revision, { title, state });
          setBoard(updated);
        }}
      />
    </>
  );
}
