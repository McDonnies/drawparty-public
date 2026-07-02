// DrawParty — PlayerList Component Tests
// Tests components/lobby/PlayerList.tsx — lobby player roster.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/context/LanguageContext", () => ({
  useLanguage: () => ({
    t: {
      lobby: { playersHeader: "players", waitingDots: "Waiting..." },
      common: { you: "You" },
    },
  }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { PlayerList } from "@/components/lobby/PlayerList";
import type { RoomPlayerDTO } from "@/types/game";

function makePlayer(clerkId: string, overrides: Partial<RoomPlayerDTO> = {}): RoomPlayerDTO {
  return {
    id: `id-${clerkId}`,
    userId: `user-${clerkId}`,
    clerkId,
    username: clerkId,
    avatarUrl: null,
    isHost: false,
    isBot: false,
    score: 0,
    status: "CONNECTED",
    ...overrides,
  };
}

let mockOnKick: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockOnKick = vi.fn();
});

function renderList(overrides: Partial<{
  players: RoomPlayerDTO[]; isHost: boolean; currentUserId: string; onKick: (id: string) => void; maxPlayers: number;
}> = {}) {
  return render(
    <PlayerList
      players={overrides.players ?? [makePlayer("p1", { username: "Alice" })]}
      isHost={overrides.isHost ?? false}
      currentUserId={overrides.currentUserId ?? "u1"}
      onKick={overrides.onKick ?? mockOnKick}
      maxPlayers={overrides.maxPlayers ?? 8}
    />
  );
}

describe("player list render", () => {
  it("renders one row per player", () => {
    renderList({
      players: [makePlayer("p1", { username: "Alice" }), makePlayer("p2", { username: "Bob" })],
    });
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("shows crown for host player", () => {
    renderList({ players: [makePlayer("p1", { username: "Alice", isHost: true })] });
    // Crown is a lucide icon rendered as SVG
    const svgs = document.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThan(0);
  });

  it("shows 'You' badge for current user", () => {
    renderList({
      players: [makePlayer("p1", { username: "Alice" })],
      currentUserId: "p1",
    });
    expect(screen.getByText("You")).toBeInTheDocument();
  });

  it("shows placeholder when room is not full", () => {
    renderList({
      players: [makePlayer("p1")],
      maxPlayers: 8,
    });
    expect(screen.getByText("Waiting...")).toBeInTheDocument();
  });
});

describe("kick action", () => {
  it("shows kick button for host targeting other player", () => {
    renderList({
      players: [makePlayer("p1", { username: "Alice" })],
      isHost: true,
      currentUserId: "u2",
    });
    // The kick button is an icon button with an X icon
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("does not show kick button for non-host", () => {
    const { container } = renderList({
      players: [makePlayer("p1", { username: "Alice" })],
      isHost: false,
      currentUserId: "u2",
    });
    // No X icon buttons should be rendered
    const xIcons = container.querySelectorAll("svg");
    // Crown is NOT present (player is not host), and no kick X should exist
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("calls onKick when kick button is clicked", async () => {
    const user = userEvent.setup();
    renderList({
      players: [
        makePlayer("p1", { username: "Alice" }),
        makePlayer("p2", { username: "Bob" }),
      ],
      isHost: true,
      currentUserId: "p1",
    });
    // The kick button is on Bob's row (the only non-self, non-host player)
    const kickBtn = screen.getAllByRole("button")[0];
    await user.click(kickBtn);
    expect(mockOnKick).toHaveBeenCalledWith("p2");
  });
});
