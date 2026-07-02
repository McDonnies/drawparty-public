// DrawParty — TurnIndicator Component Tests  [NEW — gartic-ai game mode]
// Tests components/gartic-ai/TurnIndicator.tsx — shows whose turn it is to draw.

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TurnIndicator } from "@/components/gartic-ai/TurnIndicator";
import type { RoomPlayerDTO } from "@/types/game";

vi.mock("@/context/LanguageContext", async () => {
  const { getTranslations } = await vi.importActual<typeof import("@/lib/translations")>("@/lib/translations");
  return { useLanguage: () => ({ t: getTranslations("en") }) };
});

beforeEach(() => vi.clearAllMocks());

function makePlayer(clerkId: string, username: string): RoomPlayerDTO {
  return {
    id: `id-${clerkId}`,
    userId: `user-${clerkId}`,
    clerkId,
    username,
    avatarUrl: null,
    isHost: false,
    isBot: false,
    score: 0,
    status: "CONNECTED",
  };
}

const players = [makePlayer("u1", "Alice"), makePlayer("u2", "Bob"), makePlayer("u3", "Cara")];
const playerOrder = ["u1", "u2", "u3"];

describe("turn indicator render", () => {
  it("renders players in the configured turn order", () => {
    render(
      <TurnIndicator
        players={players}
        playerOrder={playerOrder}
        currentPlayerId="u2"
        turnIndex={1}
        totalTurns={3}
        isMyTurn={false}
      />,
    );

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Cara")).toBeInTheDocument();
  });

  it("highlights active player", () => {
    render(
      <TurnIndicator
        players={players}
        playerOrder={playerOrder}
        currentPlayerId="u2"
        turnIndex={1}
        totalTurns={3}
        isMyTurn={false}
      />,
    );

    expect(screen.getByText("Bob")).toHaveClass("text-[#9B6FDF]");
    expect(screen.getByText("Alice")).toHaveClass("text-[#7a6f99]");
  });

  it("shows 'Your turn!' for current user", () => {
    render(
      <TurnIndicator
        players={players}
        playerOrder={playerOrder}
        currentPlayerId="u2"
        turnIndex={1}
        totalTurns={3}
        isMyTurn
      />,
    );

    expect(screen.getByText("Your turn!")).toBeInTheDocument();
  });

  it("shows waiting label when another player draws", () => {
    render(
      <TurnIndicator
        players={players}
        playerOrder={playerOrder}
        currentPlayerId="u2"
        turnIndex={1}
        totalTurns={3}
        isMyTurn={false}
      />,
    );

    expect(screen.getByText("Waiting...")).toBeInTheDocument();
  });

  it("shows turn progress indicator", () => {
    render(
      <TurnIndicator
        players={players}
        playerOrder={playerOrder}
        currentPlayerId="u2"
        turnIndex={1}
        totalTurns={3}
        isMyTurn={false}
      />,
    );

    expect(screen.getByText("2/3")).toBeInTheDocument();
  });
});
