import type {
  BoardStateV1,
  CreateCustomTeamRequest,
  CustomTeamDetails,
  SavedBoard,
  SavedBoardSummary,
  SavedCustomTeam,
  UpdateCustomTeamRequest,
} from "@tactical-board/contracts";

export class WorkspaceClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkspaceClientError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBoardState(value: unknown): value is BoardStateV1 {
  return isRecord(value) &&
    value.schemaVersion === 1 &&
    isRecord(value.team) &&
    typeof value.team.name === "string" &&
    Array.isArray(value.players) &&
    Array.isArray(value.bench);
}

function isBoardSummary(value: unknown): value is SavedBoardSummary {
  return isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.revision === "number" &&
    typeof value.title === "string" &&
    typeof value.teamName === "string" &&
    typeof value.teamKind === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string";
}

function isSavedBoard(value: unknown): value is SavedBoard {
  return isRecord(value) && isBoardSummary(value) && isBoardState(value.state);
}

function isCustomTeam(value: unknown): value is SavedCustomTeam {
  return isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.primaryColor === "string" &&
    typeof value.playerCount === "number" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string";
}

async function send<T>(
  url: string,
  options: RequestInit,
  select: (payload: unknown) => T | null,
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: "same-origin",
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const payload: unknown = response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    throw new WorkspaceClientError(
      isRecord(payload) && typeof payload.message === "string"
        ? payload.message
        : "No se pudo completar la solicitud.",
    );
  }
  const selected = select(payload);
  if (selected === null) throw new WorkspaceClientError("La API devolvió datos no válidos.");
  return selected;
}

export async function listBoards(): Promise<SavedBoardSummary[]> {
  return send("/api/boards", { method: "GET" }, (payload) =>
    isRecord(payload) && Array.isArray(payload.boards) && payload.boards.every(isBoardSummary)
      ? payload.boards
      : null,
  );
}

export async function getBoard(boardId: string): Promise<SavedBoard> {
  return send(`/api/boards/${encodeURIComponent(boardId)}`, { method: "GET" }, (payload) =>
    isRecord(payload) && isSavedBoard(payload.board) ? payload.board : null,
  );
}

export async function createBoard(title: string, state: BoardStateV1): Promise<SavedBoard> {
  return send("/api/boards", {
    method: "POST",
    body: JSON.stringify({ title, state }),
  }, (payload) => isRecord(payload) && isSavedBoard(payload.board) ? payload.board : null);
}

export async function updateBoard(
  boardId: string,
  revision: number,
  changes: { title?: string; state?: BoardStateV1 },
): Promise<SavedBoard> {
  return send(`/api/boards/${encodeURIComponent(boardId)}`, {
    method: "PATCH",
    body: JSON.stringify({ ...changes, revision }),
  }, (payload) => isRecord(payload) && isSavedBoard(payload.board) ? payload.board : null);
}

export async function duplicateBoard(boardId: string): Promise<SavedBoard> {
  return send(`/api/boards/${encodeURIComponent(boardId)}/duplicate`, {
    method: "POST",
  }, (payload) => isRecord(payload) && isSavedBoard(payload.board) ? payload.board : null);
}

export async function deleteBoard(boardId: string): Promise<void> {
  await send(`/api/boards/${encodeURIComponent(boardId)}`, { method: "DELETE" }, (payload) =>
    payload === null ? true : null,
  );
}

export async function listCustomTeams(): Promise<SavedCustomTeam[]> {
  return send("/api/teams", { method: "GET" }, (payload) =>
    isRecord(payload) && Array.isArray(payload.teams) && payload.teams.every(isCustomTeam)
      ? payload.teams
      : null,
  );
}

export async function getCustomTeam(teamId: string): Promise<CustomTeamDetails> {
  return send(`/api/teams/${encodeURIComponent(teamId)}`, { method: "GET" }, (payload) =>
    isRecord(payload) && isCustomTeam(payload.team) && Array.isArray(payload.team.roster)
      ? payload.team as CustomTeamDetails
      : null,
  );
}

export async function createCustomTeam(input: CreateCustomTeamRequest): Promise<CustomTeamDetails> {
  return send("/api/teams", { method: "POST", body: JSON.stringify(input) }, (payload) =>
    isRecord(payload) && isCustomTeam(payload.team) && Array.isArray(payload.team.roster)
      ? payload.team as CustomTeamDetails
      : null,
  );
}

export async function updateCustomTeam(teamId: string, input: UpdateCustomTeamRequest): Promise<SavedCustomTeam> {
  return send(`/api/teams/${encodeURIComponent(teamId)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  }, (payload) => isRecord(payload) && isCustomTeam(payload.team) ? payload.team as SavedCustomTeam : null);
}

export async function deleteCustomTeam(teamId: string): Promise<void> {
  await send(`/api/teams/${encodeURIComponent(teamId)}`, { method: "DELETE" }, (payload) =>
    payload === null ? true : null,
  );
}
