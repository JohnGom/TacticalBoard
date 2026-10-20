import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyFormation,
  clampPitchPoint,
  createLineupFromRoster,
  createFormationPlayers,
  FORMATIONS,
  movePlayer,
  replaceBoardPlayer,
  substituteBoardPlayer,
  type FormationName,
} from "./index.js";

const formations = Object.keys(FORMATIONS) as FormationName[];

function createIdFactory() {
  let id = 0;
  return () => `player-${++id}`;
}

test("supported formations create eleven players with normalized positions", () => {
  for (const formation of formations) {
    const players = createFormationPlayers(formation, createIdFactory());

    assert.equal(players.length, 11);
    assert.equal(new Set(players.map((player) => player.id)).size, 11);
    for (const player of players) {
      assert.ok(player.position.x >= 0 && player.position.x <= 1);
      assert.ok(player.position.y >= 0 && player.position.y <= 1);
    }
  }
});

test("moving a player clamps to the pitch and leaves every other player untouched", () => {
  const players = createFormationPlayers("4-3-3", createIdFactory());
  const moved = movePlayer(players, players[0]!.id, { x: 1.4, y: -0.2 });

  assert.deepEqual(moved[0]!.position, { x: 1, y: 0 });
  assert.deepEqual(moved.slice(1), players.slice(1));
  assert.notStrictEqual(moved[0], players[0]);
});

test("players can move freely away from formation starting positions", () => {
  const players = createFormationPlayers("4-3-3", createIdFactory());
  const target = players[5]!;
  const moved = movePlayer(players, target.id, { x: 0.96, y: 0.13 });

  assert.deepEqual(moved[5]!.position, { x: 0.96, y: 0.13 });
  assert.notDeepEqual(moved[5]!.position, FORMATIONS["4-3-3"][5]!.position);
});

test("non-finite coordinates and unknown players are rejected", () => {
  assert.throws(() => clampPitchPoint({ x: Number.NaN, y: 0.5 }), RangeError);
  assert.throws(() => movePlayer([], "missing-player", { x: 0.5, y: 0.5 }), /not on this board/);
});

test("applying a formation preserves player IDs and user-edited snapshots", () => {
  const players = createFormationPlayers("4-3-3", createIdFactory());
  const edited = players.map((player, index) =>
    index === 0
      ? { ...player, snapshot: { ...player.snapshot, name: "Edited keeper" }, position: { x: 0.91, y: 0.12 } }
      : player,
  );
  const reapplied = applyFormation(edited, "4-4-2", createIdFactory());

  assert.deepEqual(reapplied.map((player) => player.id), players.map((player) => player.id));
  assert.equal(reapplied[0]!.snapshot.name, "Edited keeper");
  assert.deepEqual(reapplied[0]!.position, FORMATIONS["4-4-2"][0]!.position);
});

test("replacing a player gives the replacement a stable ID and preserves their pitch position", () => {
  const players = createFormationPlayers("4-3-3", createIdFactory());
  const moved = movePlayer(players, players[4]!.id, { x: 0.91, y: 0.23 });
  let replacementId = 0;
  const replaced = replaceBoardPlayer(
    moved,
    players[4]!.id,
    {
      name: "New defender",
      shirtNumber: 18,
      position: "Defender",
      providerReference: { provider: "api-football", providerId: "9876" },
    },
    () => `replacement-${++replacementId}`,
  );

  assert.equal(replaced[4]!.id, "replacement-1");
  assert.notEqual(replaced[4]!.id, players[4]!.id);
  assert.deepEqual(replaced[4]!.position, { x: 0.91, y: 0.23 });
  assert.equal(replaced[4]!.snapshot.name, "New defender");
  assert.deepEqual(replaced[4]!.snapshot.providerReference, {
    provider: "api-football",
    providerId: "9876",
  });
  assert.deepEqual(replaced.slice(0, 4), moved.slice(0, 4));
});

test("roster players are assigned to matching formation roles and remaining players go to the bench", () => {
  const roster = [
    ...Array.from({ length: 3 }, (_, index) => ({
      id: `forward-${index}`,
      snapshot: { name: `Forward ${index}`, shirtNumber: index + 9, position: "Forward", providerReference: null },
    })),
    { id: "keeper", snapshot: { name: "Keeper", shirtNumber: 1, position: "Goalkeeper", providerReference: null } },
    ...Array.from({ length: 4 }, (_, index) => ({
      id: `defender-${index}`,
      snapshot: { name: `Defender ${index}`, shirtNumber: index + 2, position: "Defender", providerReference: null },
    })),
    ...Array.from({ length: 3 }, (_, index) => ({
      id: `midfielder-${index}`,
      snapshot: { name: `Midfielder ${index}`, shirtNumber: index + 6, position: "Midfielder", providerReference: null },
    })),
    ...Array.from({ length: 2 }, (_, index) => ({
      id: `substitute-${index}`,
      snapshot: { name: `Substitute ${index}`, shirtNumber: index + 12, position: "Defender", providerReference: null },
    })),
  ];

  const result = createLineupFromRoster("4-3-3", roster);

  assert.equal(result.players.length, 11);
  assert.equal(result.bench.length, 2);
  assert.equal(result.players[0]?.snapshot.position, "Goalkeeper");
  assert.deepEqual(
    result.players.map((player) => player.id).sort(),
    roster.filter((player) => !player.id.startsWith("substitute-")).map((player) => player.id).sort(),
  );
});

test("substitutions keep the pitch slot and move the outgoing player to the bench", () => {
  const starters = createFormationPlayers("4-3-3", createIdFactory());
  const movedStarters = movePlayer(starters, starters[0]!.id, { x: 0.17, y: 0.43 });
  const substitute = {
    id: "sub-player",
    snapshot: {
      name: "Substitute Keeper",
      shirtNumber: 22,
      position: "Goalkeeper",
      providerReference: null,
    },
  };

  const result = substituteBoardPlayer(movedStarters, [substitute], starters[0]!.id, substitute.id);

  assert.equal(result.players[0]?.id, substitute.id);
  assert.deepEqual(result.players[0]?.position, { x: 0.17, y: 0.43 });
  assert.equal(result.players[0]?.snapshot.name, "Substitute Keeper");
  assert.equal(result.bench.length, 1);
  assert.equal(result.bench[0]?.id, starters[0]!.id);
  assert.equal(result.bench[0]?.snapshot.name, "Player 1");
});
