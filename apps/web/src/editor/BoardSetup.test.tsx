import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { BoardDraft } from "./board-draft";
import { BoardSetup } from "./BoardSetup";

const realTeam = {
  id: "api-football:9",
  name: "Spain",
  country: "Spain",
  kind: "national" as const,
  crestUrl: null,
  externalReference: { provider: "api-football", providerId: "9" },
};

const realSquadPlayers = [
  { id: "player-1", name: "Keeper", shirtNumber: 1, position: "Goalkeeper" },
  ...Array.from({ length: 4 }, (_, index) => ({
    id: `player-${index + 2}`,
    name: `Defender ${index + 1}`,
    shirtNumber: index + 2,
    position: "Defender",
  })),
  ...Array.from({ length: 3 }, (_, index) => ({
    id: `player-${index + 6}`,
    name: `Midfielder ${index + 1}`,
    shirtNumber: index + 6,
    position: "Midfielder",
  })),
  ...Array.from({ length: 4 }, (_, index) => ({
    id: `player-${index + 9}`,
    name: `Forward ${index + 1}`,
    shirtNumber: index + 9,
    position: "Forward",
  })),
].map((player) => ({
  ...player,
  imageUrl: null,
  externalReference: { provider: "api-football", providerId: player.id },
}));

describe("pre-pitch team setup", () => {
  beforeEach(() => {
    let id = 0;
    vi.stubGlobal("crypto", { randomUUID: () => `local-id-${++id}` });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test("requires a source choice, then loads a real selection before entering the pitch", async () => {
    const onStartBoard = vi.fn();
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const body = url.includes("/api/teams")
        ? { teams: [] }
        : url.includes("/api/football/teams?")
          ? { teams: [realTeam] }
          : { team: realTeam, players: realSquadPlayers, retrievedAt: "2026-10-14T00:00:00.000Z" };
      return { ok: true, json: async () => body } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<BoardSetup onStartBoard={onStartBoard} />);
    expect(screen.queryByLabelText("Tactical board editor")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /usar un equipo real/i }));
    fireEvent.change(screen.getByLabelText("Nombre del club o país"), { target: { value: "Spain" } });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
    const result = await screen.findByRole("button", { name: /Spain.*Selección/ });
    fireEvent.click(result);

    expect(await screen.findByRole("heading", { name: "Spain" })).toBeTruthy();
    expect(screen.getByText(/12 jugadores disponibles/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /entrar a la cancha/i }));

    await waitFor(() => expect(onStartBoard).toHaveBeenCalledTimes(1));
    const draft = onStartBoard.mock.calls[0]?.[0] as BoardDraft;
    expect(draft.teamKind).toBe("national");
    expect(draft.players).toHaveLength(11);
    expect(draft.bench).toHaveLength(1);
    expect(draft.players[0]?.snapshot.name).toBe("Keeper");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  test("creates a custom team with named starters, unique shirt numbers, and substitutes", async () => {
    const onStartBoard = vi.fn();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/teams" && init?.method === "GET") {
        return { ok: true, json: async () => ({ teams: [] }) } as Response;
      }
      const requestBody = typeof init?.body === "string" ? JSON.parse(init.body) as { name: string; primaryColor: string; roster: unknown[] } : null;
      return {
        ok: true,
        json: async () => ({
          team: {
            id: "8fd38fba-4856-45a4-8a23-f9df3d990a79",
            name: requestBody?.name ?? "Barrio FC",
            primaryColor: requestBody?.primaryColor ?? "#a9cbb4",
            playerCount: requestBody?.roster.length ?? 12,
            createdAt: "2026-10-14T00:00:00.000Z",
            updatedAt: "2026-10-14T00:00:00.000Z",
            roster: requestBody?.roster ?? [],
          },
        }),
      } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<BoardSetup onStartBoard={onStartBoard} />);

    fireEvent.click(screen.getByRole("button", { name: /crear un equipo personalizado/i }));
    fireEvent.change(screen.getByLabelText("Nombre del equipo"), { target: { value: "Barrio FC" } });
    for (let index = 1; index <= 11; index += 1) {
      fireEvent.change(screen.getByLabelText(`Titular ${index} nombre`), {
        target: { value: `Custom Player ${index}` },
      });
    }
    fireEvent.click(screen.getByRole("button", { name: /añadir suplente/i }));
    fireEvent.change(screen.getByLabelText("Suplente 1 nombre"), { target: { value: "Bench Player" } });
    fireEvent.change(screen.getByLabelText("Suplente 1 dorsal"), { target: { value: "12" } });
    fireEvent.click(screen.getByRole("button", { name: /crear equipo y entrar a la cancha/i }));

    await waitFor(() => expect(onStartBoard).toHaveBeenCalledTimes(1));
    const draft = onStartBoard.mock.calls[0]?.[0] as BoardDraft;
    expect(draft.teamName).toBe("Barrio FC");
    expect(draft.teamKind).toBe("custom");
    expect(draft.players).toHaveLength(11);
    expect(draft.bench).toHaveLength(1);
    expect(draft.bench[0]?.snapshot.name).toBe("Bench Player");
    expect(draft.players.every((player) => player.snapshot.providerReference === null)).toBe(true);
  });
});
