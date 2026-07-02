// DrawParty — GameSettings Component Tests
// Tests components/lobby/GameSettings.tsx — room settings panel.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/context/LanguageContext", () => ({
  useLanguage: () => ({
    t: {
      settings: {
        modeClassic: "Classic",
        modeClassicDesc: "Standard description",
        modeAiJudge: "AI Judge",
        modeAiJudgeDesc: "AI judging description",
        players: "Players",
        drawTime: "Draw Time",
        rounds: "Rounds",
        category: "Category",
        customWords: "Custom words",
        customWordsPlaceholder: "Enter words separated by commas",
        aiPlayer: "AI Player",
        aiPlayerDesc: "Adds a DrawBot",
        aiSettings: "AI Settings",
        drawMode: "Draw Mode",
        timePerTurn: "Time per Turn",
        drawingTime: "Drawing Time",
        lives: "Lives",
        hintLetters: "Hint Letters",
        hintLettersDesc: "Reveal random letters",
        hintLettersCaveat_one: "{{n}} letter will be revealed",
        hintLettersCaveat_other: "{{n}} letters will be revealed",
        onlyHostCanChange: "Only the host can change settings.",
        drawModeTurn: "Turn",
        drawModeShared: "Shared",
      },
    },
  }),
}));

import { GameSettings } from "@/components/lobby/GameSettings";
import type { LobbySettings } from "@/types/game";

function defaultSettings(overrides: Partial<LobbySettings> = {}): LobbySettings {
  return {
    roundCount: 3,
    timePerRound: 60,
    maxPlayers: 8,
    wordCategories: [],
    customWords: [],
    withAI: false,
    aiJudgeMode: false,
    aiDrawTime: 20,
    aiDrawTimePerTurn: 20,
    aiDrawMode: "turn",
    aiLives: 3,
    aiWordCategory: "",
    aiHintLetters: 0,
    ...overrides,
  };
}

let mockOnChange: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockOnChange = vi.fn();
});

function renderSettings(overrides: {
  settings?: Partial<LobbySettings>; isHost?: boolean; gameMode?: "SKRIBBL" | "GARTIC_PHONE";
} = {}) {
  return render(
    <GameSettings
      settings={defaultSettings(overrides.settings ?? {})}
      isHost={overrides.isHost ?? true}
      gameMode={overrides.gameMode ?? "SKRIBBL"}
      onSettingsChange={mockOnChange}
    />
  );
}

describe("GARTIC_PHONE mode", () => {
  it("renders Classic and AI Judge mode cards", () => {
    renderSettings({ gameMode: "GARTIC_PHONE" });
    expect(screen.getByText("Classic")).toBeInTheDocument();
    expect(screen.getByText("AI Judge")).toBeInTheDocument();
  });

  it("clicking AI Judge card sets aiJudgeMode=true", async () => {
    const user = userEvent.setup();
    renderSettings({ gameMode: "GARTIC_PHONE" });
    await user.click(screen.getByText("AI Judge"));
    expect(mockOnChange).toHaveBeenCalledWith({ aiJudgeMode: true });
  });

  it("clicking Classic card sets aiJudgeMode=false", async () => {
    const user = userEvent.setup();
    renderSettings({ gameMode: "GARTIC_PHONE", settings: { aiJudgeMode: true } });
    await user.click(screen.getByText("Classic"));
    expect(mockOnChange).toHaveBeenCalledWith({ aiJudgeMode: false });
  });

  it("hides Draw Time and Rounds when AI Judge is active", () => {
    renderSettings({ gameMode: "GARTIC_PHONE", settings: { aiJudgeMode: true } });
    expect(screen.queryByText("Draw Time")).toBeNull();
    expect(screen.queryByText("Rounds")).toBeNull();
  });

  it("shows Draw Time and Rounds when AI Judge is not active", () => {
    renderSettings({ gameMode: "GARTIC_PHONE", settings: { aiJudgeMode: false } });
    expect(screen.getByText("Draw Time")).toBeInTheDocument();
    expect(screen.getByText("Rounds")).toBeInTheDocument();
  });

  it("shows AI sub-settings panel when aiJudgeMode=true", () => {
    renderSettings({ gameMode: "GARTIC_PHONE", settings: { aiJudgeMode: true } });
    expect(screen.getByText("AI Settings")).toBeInTheDocument();
  });

  it("shows hint letters caveat when count > 0", () => {
    renderSettings({ gameMode: "GARTIC_PHONE", settings: { aiJudgeMode: true, aiHintLetters: 2 } });
    expect(screen.getByText(/2 letters will be revealed/i)).toBeInTheDocument();
  });
});

describe("SKRIBBL mode", () => {
  it("does not render Classic/AI Judge mode cards", () => {
    renderSettings({ gameMode: "SKRIBBL" });
    expect(screen.queryByText("Classic")).toBeNull();
    expect(screen.queryByText("AI Judge")).toBeNull();
  });

  it("renders Category select", () => {
    renderSettings({ gameMode: "SKRIBBL" });
    expect(screen.getByText("Category")).toBeInTheDocument();
  });

  it("enables custom words textarea when toggle is on", async () => {
    const user = userEvent.setup();
    renderSettings({ gameMode: "SKRIBBL", settings: { customWords: ["hello"] } });
    // The custom words checkbox should be checked
    const checkbox = screen.getByRole("checkbox", { name: /custom words/i });
    expect(checkbox).toBeChecked();
    expect(screen.getByPlaceholderText("Enter words separated by commas")).toBeInTheDocument();
  });

  it("renders AI Player checkbox", () => {
    renderSettings({ gameMode: "SKRIBBL" });
    expect(screen.getByText("AI Player")).toBeInTheDocument();
  });
});

describe("host vs non-host", () => {
  it("disables select controls when not host", () => {
    renderSettings({ isHost: false, gameMode: "SKRIBBL" });
    // Player count select should be disabled
    const selects = document.querySelectorAll("select");
    selects.forEach((s) => expect(s).toBeDisabled());
  });

  it("shows read-only notice when not host", () => {
    renderSettings({ isHost: false, gameMode: "SKRIBBL" });
    expect(screen.getByText(/Only the host can change settings/i)).toBeInTheDocument();
  });
});
