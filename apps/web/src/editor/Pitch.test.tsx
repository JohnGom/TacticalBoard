import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import type { BoardPlayer } from "@tactical-board/domain";
import { Pitch } from "./Pitch";

afterEach(cleanup);

const player: BoardPlayer = {
  id: "player-10",
  snapshot: {
    name: "Alex Morgan",
    shirtNumber: 10,
    position: "Forward",
    providerReference: null,
  },
  position: { x: 0.7, y: 0.4 },
};

test("shows a player's name and position on hover and keyboard focus", () => {
  render(
    <Pitch
      players={[player]}
      selectedPlayerId=""
      teamColor="#a9cbb4"
      view="full"
      onSelectPlayer={() => undefined}
      onMovePlayer={() => undefined}
    />,
  );

  const marker = screen.getByRole("button", { name: "Alex Morgan, Delantero, dorsal 10" });
  fireEvent.pointerEnter(marker);
  expect(screen.getByRole("tooltip").textContent).toContain("Alex Morgan");
  expect(screen.getByRole("tooltip").textContent).toContain("Delantero");
  expect(marker.getAttribute("aria-describedby")).toBe("pitch-player-tooltip-player-10");

  fireEvent.pointerLeave(marker);
  expect(screen.queryByRole("tooltip")).toBeNull();

  fireEvent.focus(marker);
  expect(screen.getByRole("tooltip").textContent).toContain("Alex Morgan");
});
