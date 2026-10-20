import { randomUUID } from "node:crypto";
import type {
  BoardStateV1,
  CreateCustomTeamRequest,
  SavedBoard,
  SavedBoardSummary,
  SavedCustomTeam,
  UpdateBoardRequest,
  UpdateCustomTeamRequest,
} from "@tactical-board/contracts";
import {
  BoardStateV1Schema,
  CreateCustomTeamRequestSchema,
} from "@tactical-board/contracts";
import type { Pool, PoolClient } from "pg";

interface BoardRow {
  id: string;
  revision: number;
  owner_id: string;
  custom_team_id: string | null;
  title: string;
  state_version: number;
  state: unknown;
  created_at: Date | string;
  updated_at: Date | string;
}

interface TeamRow {
  id: string;
  owner_id: string;
  name: string;
  primary_color: string;
  roster: unknown;
  created_at: Date | string;
  updated_at: Date | string;
}

export class OwnedResourceNotFoundError extends Error {
  constructor() {
    super("The requested resource was not found.");
    this.name = "OwnedResourceNotFoundError";
  }
}

export class BoardRevisionConflictError extends Error {
  constructor() {
    super("Esta pizarra cambió en otra sesión. Vuelve a cargarla antes de guardar.");
    this.name = "BoardRevisionConflictError";
  }
}

function isoDate(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function boardSummary(row: BoardRow, state: BoardStateV1): SavedBoardSummary {
  return {
    id: row.id,
    revision: row.revision,
    title: row.title,
    teamName: state.team.name,
    teamKind: state.team.kind,
    createdAt: isoDate(row.created_at),
    updatedAt: isoDate(row.updated_at),
  };
}

function savedBoard(row: BoardRow): SavedBoard {
  const state = BoardStateV1Schema.parse(row.state);
  return { ...boardSummary(row, state), state };
}

function savedTeam(row: TeamRow, includeRoster = true): SavedCustomTeam {
  const roster = CreateCustomTeamRequestSchema.shape.roster.parse(row.roster);
  return {
    id: row.id,
    name: row.name,
    primaryColor: row.primary_color,
    playerCount: roster.length,
    createdAt: isoDate(row.created_at),
    updatedAt: isoDate(row.updated_at),
    ...(includeRoster ? { roster } : {}),
  };
}

async function verifyCustomTeamOwner(
  queryable: Pick<PoolClient, "query">,
  ownerId: string,
  state: BoardStateV1,
): Promise<void> {
  const teamId = state.team.customTeamId;
  if (teamId === null) return;
  const result = await queryable.query<{ id: string }>(
    "SELECT id FROM custom_teams WHERE id = $1 AND owner_id = $2",
    [teamId, ownerId],
  );
  if (!result.rows[0]) throw new OwnedResourceNotFoundError();
}

export class WorkspaceService {
  constructor(private readonly pool: Pool) {}

  async listBoards(ownerId: string): Promise<SavedBoardSummary[]> {
    const result = await this.pool.query<BoardRow>(
      `SELECT id, owner_id, custom_team_id, title, state_version, state, revision, created_at, updated_at
       FROM tactical_boards WHERE owner_id = $1 ORDER BY updated_at DESC`,
      [ownerId],
    );
    return result.rows.map((row) => {
      const state = BoardStateV1Schema.parse(row.state);
      return boardSummary(row, state);
    });
  }

  async getBoard(ownerId: string, boardId: string): Promise<SavedBoard | null> {
    const result = await this.pool.query<BoardRow>(
      `SELECT id, owner_id, custom_team_id, title, state_version, state, revision, created_at, updated_at
       FROM tactical_boards WHERE id = $1 AND owner_id = $2`,
      [boardId, ownerId],
    );
    return result.rows[0] ? savedBoard(result.rows[0]) : null;
  }

  async createBoard(ownerId: string, title: string, state: BoardStateV1): Promise<SavedBoard> {
    await verifyCustomTeamOwner(this.pool, ownerId, state);
    const result = await this.pool.query<BoardRow>(
      `INSERT INTO tactical_boards (id, owner_id, custom_team_id, title, state_version, state)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)
       RETURNING id, owner_id, custom_team_id, title, state_version, state, revision, created_at, updated_at`,
      [randomUUID(), ownerId, state.team.customTeamId, title, state.schemaVersion, JSON.stringify(state)],
    );
    return savedBoard(result.rows[0]!);
  }

  async updateBoard(
    ownerId: string,
    boardId: string,
    changes: UpdateBoardRequest,
  ): Promise<SavedBoard | null> {
    const existing = await this.getBoard(ownerId, boardId);
    if (!existing) return null;
    if (changes.revision !== existing.revision) throw new BoardRevisionConflictError();
    const nextState = changes.state ?? existing.state;
    await verifyCustomTeamOwner(this.pool, ownerId, nextState);
    const title = changes.title ?? existing.title;
    const result = await this.pool.query<BoardRow>(
      `UPDATE tactical_boards
       SET title = $1, custom_team_id = $2, state_version = $3, state = $4::jsonb, revision = revision + 1, updated_at = NOW()
       WHERE id = $5 AND owner_id = $6 AND revision = $7
       RETURNING id, owner_id, custom_team_id, title, state_version, state, revision, created_at, updated_at`,
      [title, nextState.team.customTeamId, nextState.schemaVersion, JSON.stringify(nextState), boardId, ownerId, existing.revision],
    );
    if (result.rows[0]) return savedBoard(result.rows[0]);
    const stillExists = await this.getBoard(ownerId, boardId);
    if (!stillExists) return null;
    throw new BoardRevisionConflictError();
  }

  async duplicateBoard(ownerId: string, boardId: string): Promise<SavedBoard | null> {
    const source = await this.getBoard(ownerId, boardId);
    if (!source) return null;
    return this.createBoard(ownerId, `Copy of ${source.title}`.slice(0, 120), source.state);
  }

  async deleteBoard(ownerId: string, boardId: string): Promise<boolean> {
    const result = await this.pool.query(
      "DELETE FROM tactical_boards WHERE id = $1 AND owner_id = $2",
      [boardId, ownerId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async listTeams(ownerId: string): Promise<SavedCustomTeam[]> {
    const result = await this.pool.query<TeamRow>(
      `SELECT id, owner_id, name, primary_color, roster, created_at, updated_at
       FROM custom_teams WHERE owner_id = $1 ORDER BY updated_at DESC`,
      [ownerId],
    );
    return result.rows.map((row) => savedTeam(row, false));
  }

  async getTeam(ownerId: string, teamId: string): Promise<SavedCustomTeam | null> {
    const result = await this.pool.query<TeamRow>(
      `SELECT id, owner_id, name, primary_color, roster, created_at, updated_at
       FROM custom_teams WHERE id = $1 AND owner_id = $2`,
      [teamId, ownerId],
    );
    return result.rows[0] ? savedTeam(result.rows[0]) : null;
  }

  async createTeam(ownerId: string, input: CreateCustomTeamRequest): Promise<SavedCustomTeam> {
    const id = randomUUID();
    const result = await this.pool.query<TeamRow>(
      `INSERT INTO custom_teams (id, owner_id, name, primary_color, roster)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       RETURNING id, owner_id, name, primary_color, roster, created_at, updated_at`,
      [id, ownerId, input.name, input.primaryColor, JSON.stringify(input.roster)],
    );
    return savedTeam(result.rows[0]!);
  }

  async updateTeam(
    ownerId: string,
    teamId: string,
    changes: UpdateCustomTeamRequest,
  ): Promise<SavedCustomTeam | null> {
    const current = await this.getTeam(ownerId, teamId);
    if (!current) return null;
    const updated = CreateCustomTeamRequestSchema.parse({
      name: changes.name ?? current.name,
      primaryColor: changes.primaryColor ?? current.primaryColor,
      roster: changes.roster ?? current.roster,
    });
    const result = await this.pool.query<TeamRow>(
      `UPDATE custom_teams
       SET name = $1, primary_color = $2, roster = $3::jsonb, updated_at = NOW()
       WHERE id = $4 AND owner_id = $5
       RETURNING id, owner_id, name, primary_color, roster, created_at, updated_at`,
      [updated.name, updated.primaryColor, JSON.stringify(updated.roster), teamId, ownerId],
    );
    return result.rows[0] ? savedTeam(result.rows[0]) : null;
  }

  async deleteTeam(ownerId: string, teamId: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const exists = await client.query<{ id: string }>(
        "SELECT id FROM custom_teams WHERE id = $1 AND owner_id = $2 FOR UPDATE",
        [teamId, ownerId],
      );
      if (!exists.rows[0]) {
        await client.query("ROLLBACK");
        return false;
      }
      await client.query(
        `UPDATE tactical_boards
         SET custom_team_id = NULL,
             state = jsonb_set(state, '{team,customTeamId}', 'null'::jsonb, true),
             revision = revision + 1,
             updated_at = NOW()
         WHERE owner_id = $1 AND custom_team_id = $2`,
        [ownerId, teamId],
      );
      await client.query("DELETE FROM custom_teams WHERE id = $1 AND owner_id = $2", [teamId, ownerId]);
      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
