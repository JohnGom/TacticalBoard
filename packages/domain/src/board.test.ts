import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyFormation,
  clampPitchPoint,
  createFormationPlayers,
  FORMATIONS,
  movePlayer,
  replaceBoardPlayer,
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
