// DrawParty — PlayerStatusList Component Tests
// Tests components/gartic-phone/PlayerStatusList.tsx — shows who has submitted.

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PlayerStatusList } from "@/components/gartic-phone/PlayerStatusList";
import type { RoomPlayerDTO } from "@/types/game";

vi.mock("@/context/LanguageContext", async () => {
  const { getTranslations } = await vi.importActual<typeof import("@/lib/translations")>("@/lib/translations");
  return { useLanguage: () => ({ t: getTranslations("en") }) };
});

beforeEach(() => vi.clearAllMocks());

function makePlayer(clerkId: string, username: string, status: RoomPlayerDTO["status"] = "CONNECTED"): RoomPlayerDTO {
  return {
    id: `id-${clerkId}`,
    userId: `user-${clerkId}`,
    clerkId,
    username,
    avatarUrl: null,
    isHost: false,
    isBot: false,
    score: 0,
    status,
  };
}

const players = [makePlayer("u1", "Alice"), makePlayer("u2", "Bob")];

describe("full variant", () => {
  it("renders one row per player", () => {
    render(<PlayerStatusList players={players} donePlayers={new Set()} />);

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("shows checkmark for done players", () => {
    render(<PlayerStatusList players={players} donePlayers={new Set(["u1"])} />);

    expect(screen.getByLabelText("Alice done")).toBeInTheDocument();
  });

  it("shows waiting indicator for pending players", () => {
    render(<PlayerStatusList players={players} donePlayers={new Set(["u1"])} />);

    expect(screen.getByLabelText("Bob pending")).toBeInTheDocument();
  });

  it("shows all-ready message when everyone submitted", () => {
    render(<PlayerStatusList players={players} donePlayers={new Set(["u1", "u2"])} />);

    expect(screen.getByText("All ready!")).toBeInTheDocument();
  });
});

describe("mini variant", () => {
  it("renders compact done count", () => {
    render(<PlayerStatusList players={players} donePlayers={new Set(["u1"])} variant="mini" />);

    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    expect(screen.getByLabelText("Alice done")).toBeInTheDocument();
    expect(screen.getByLabelText("Bob pending")).toBeInTheDocument();
  });

  it("shows disconnected marker for pending disconnected players", () => {
    const disconnectedPlayers = [makePlayer("u1", "Alice"), makePlayer("u2", "Bob", "DISCONNECTED")];

    render(<PlayerStatusList players={disconnectedPlayers} donePlayers={new Set(["u1"])} variant="mini" />);

    expect(screen.getByLabelText("Bob disconnected")).toBeInTheDocument();
  });
});
