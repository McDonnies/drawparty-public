// DrawParty — PromptInput Component Tests
// Tests the PromptInput component rendered during the PROMPT phase of Gartic Phone.
// Covers: initial rendering, typing behaviour, submission, locked state, ready count,
// and the forwarded ref handle (useImperativeHandle).
// Spec ref: specification/En-jeu---Gartic-Phone.md — submitInitialPrompt()

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";

import { PromptInput, type PromptInputHandle } from "@/components/gartic-phone/PromptInput";
import type { RoomPlayerDTO } from "@/types/game";

vi.mock("@/context/LanguageContext", async () => {
  const { getTranslations } = await vi.importActual<typeof import("@/lib/translations")>("@/lib/translations");
  return { useLanguage: () => ({ t: getTranslations("en") }) };
});

// ── Default props ──────────────────────────────────────────────────────────────

/**
 * Builds a minimal RoomPlayerDTO for use in player lists.
 * Only clerkId is relevant — PromptInput uses players.length for the total count.
 */
function makePlayer(clerkId: string): RoomPlayerDTO {
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
  };
}

const DEFAULT_PLAYERS = [makePlayer("u1"), makePlayer("u2"), makePlayer("u3")];

// Mocks for callback props
let mockOnSubmit: ReturnType<typeof vi.fn>;
let mockOnUnlock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockOnSubmit = vi.fn();
  mockOnUnlock = vi.fn();
});

/**
 * Renders PromptInput with sensible defaults.
 * Override individual props by passing a partial object.
 */
function renderPromptInput(overrides: Partial<{
  onSubmit: (p: string) => void;
  onUnlock: () => void;
  hasSubmitted: boolean;
  donePlayers: Set<string>;
  players: RoomPlayerDTO[];
  ref: React.Ref<PromptInputHandle>;
}> = {}) {
  return render(
    <PromptInput
      onSubmit={overrides.onSubmit ?? mockOnSubmit}
      onUnlock={overrides.onUnlock ?? mockOnUnlock}
      hasSubmitted={overrides.hasSubmitted ?? false}
      donePlayers={overrides.donePlayers ?? new Set()}
      players={overrides.players ?? DEFAULT_PLAYERS}
      ref={overrides.ref}
    />
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Initial render
// ══════════════════════════════════════════════════════════════════════════════

describe("initial render", () => {
  // ── Case 1 ────────────────────────────────────────────────────────────────
  it("renders the instruction heading", () => {
    renderPromptInput();
    expect(screen.getByText("Write a word or phrase for another player to draw")).toBeInTheDocument();
  });

  // ── Case 2 ────────────────────────────────────────────────────────────────
  it("renders an enabled textarea with the placeholder text", () => {
    renderPromptInput();
    const textarea = screen.getByPlaceholderText("e.g. A cat wearing sunglasses");
    expect(textarea).toBeEnabled();
  });

  // ── Case 3 ────────────────────────────────────────────────────────────────
  it("renders a disabled 'Lock in' button when the input is empty", () => {
    renderPromptInput();
    const button = screen.getByRole("button", { name: /lock in/i });
    expect(button).toBeDisabled();
  });

  // ── Case 4 ────────────────────────────────────────────────────────────────
  it("shows '0/80' in the character counter initially", () => {
    renderPromptInput();
    expect(screen.getByText("0/80")).toBeInTheDocument();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Typing behaviour
// ══════════════════════════════════════════════════════════════════════════════

describe("typing behaviour", () => {
  // ── Case 1 ────────────────────────────────────────────────────────────────
  it("enables the 'Lock in' button when the user types text", async () => {
    const user = userEvent.setup();
    renderPromptInput();
    const textarea = screen.getByPlaceholderText("e.g. A cat wearing sunglasses");
    await user.type(textarea, "A cat");
    expect(screen.getByRole("button", { name: /lock in/i })).toBeEnabled();
  });

  // ── Case 2 ────────────────────────────────────────────────────────────────
  it("updates the character counter as the user types", async () => {
    const user = userEvent.setup();
    renderPromptInput();
    const textarea = screen.getByPlaceholderText("e.g. A cat wearing sunglasses");
    await user.type(textarea, "Hello");
    expect(screen.getByText("5/80")).toBeInTheDocument();
  });

  // ── Case 3 ────────────────────────────────────────────────────────────────
  it("displays the counter in red when the character limit (80) is reached", async () => {
    const user = userEvent.setup();
    renderPromptInput();
    const textarea = screen.getByPlaceholderText("e.g. A cat wearing sunglasses");
    await user.type(textarea, "a".repeat(80));
    const counterEl = screen.getByText("80/80");
    expect(counterEl.className).toContain("FF6B6B");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Submission
// ══════════════════════════════════════════════════════════════════════════════

describe("submission", () => {
  // ── Case 1 ────────────────────────────────────────────────────────────────
  it("calls onSubmit with the trimmed prompt text when 'Lock in' is clicked", async () => {
    const user = userEvent.setup();
    renderPromptInput();
    const textarea = screen.getByPlaceholderText("e.g. A cat wearing sunglasses");
    await user.type(textarea, "  A cat  ");
    await user.click(screen.getByRole("button", { name: /lock in/i }));
    expect(mockOnSubmit).toHaveBeenCalledOnce();
    expect(mockOnSubmit).toHaveBeenCalledWith("A cat");
  });

  // ── Case 2 ────────────────────────────────────────────────────────────────
  it("shows a validation error and does NOT call onSubmit when input is only whitespace", async () => {
    const user = userEvent.setup();
    renderPromptInput();
    const textarea = screen.getByPlaceholderText("e.g. A cat wearing sunglasses");
    await user.type(textarea, "   ");
    await user.keyboard("{Enter}");
    expect(screen.getByText("Please enter a prompt.")).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  // ── Case 3 ────────────────────────────────────────────────────────────────
  it("submits when the user presses Enter (without Shift)", async () => {
    const user = userEvent.setup();
    renderPromptInput();
    const textarea = screen.getByPlaceholderText("e.g. A cat wearing sunglasses");
    await user.type(textarea, "My prompt");
    await user.keyboard("{Enter}");
    expect(mockOnSubmit).toHaveBeenCalledWith("My prompt");
  });

  // ── Case 4 ────────────────────────────────────────────────────────────────
  it("does NOT submit when the user presses Shift+Enter", async () => {
    const user = userEvent.setup();
    renderPromptInput();
    const textarea = screen.getByPlaceholderText("e.g. A cat wearing sunglasses");
    await user.type(textarea, "My prompt");
    await user.keyboard("{Shift>}{Enter}{/Shift}");
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// hasSubmitted = true (locked state)
// ══════════════════════════════════════════════════════════════════════════════

describe("hasSubmitted = true (locked state)", () => {
  // ── Case 1 ────────────────────────────────────────────────────────────────
  it("disables the textarea when hasSubmitted is true", () => {
    renderPromptInput({ hasSubmitted: true });
    const textarea = screen.getByPlaceholderText("e.g. A cat wearing sunglasses");
    expect(textarea).toBeDisabled();
  });

  // ── Case 2 ────────────────────────────────────────────────────────────────
  it("shows the 'Locked in ✓' button (disabled) instead of 'Lock in'", () => {
    renderPromptInput({ hasSubmitted: true });
    const lockedInBtn = screen.getByRole("button", { name: /locked in ✓/i });
    expect(lockedInBtn).toBeInTheDocument();
    expect(lockedInBtn).toBeDisabled();
    expect(screen.queryByRole("button", { name: /^lock in$/i })).toBeNull();
  });

  // ── Case 3 ────────────────────────────────────────────────────────────────
  it("shows a 'Modify' button when hasSubmitted is true", () => {
    renderPromptInput({ hasSubmitted: true });
    expect(screen.getByRole("button", { name: /modify/i })).toBeInTheDocument();
  });

  // ── Case 4 ────────────────────────────────────────────────────────────────
  it("calls onUnlock when the 'Modify' button is clicked", async () => {
    const user = userEvent.setup();
    renderPromptInput({ hasSubmitted: true });
    await user.click(screen.getByRole("button", { name: /modify/i }));
    expect(mockOnUnlock).toHaveBeenCalledOnce();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Ready count display
// ══════════════════════════════════════════════════════════════════════════════

describe("ready count display", () => {
  // ── Case 1 ────────────────────────────────────────────────────────────────
  it("shows the ready count when at least one player is in donePlayers", () => {
    renderPromptInput({ donePlayers: new Set(["u1"]) });
    expect(screen.getByText((content: string, element: Element | null) => element?.textContent === "1 / 3 locked in")).toBeInTheDocument();
  });

  // ── Case 2 ────────────────────────────────────────────────────────────────
  it("counts the current player (self) when hasSubmitted is true", () => {
    renderPromptInput({ donePlayers: new Set(["u1"]), hasSubmitted: true });
    expect(screen.getByText((content: string, element: Element | null) => element?.textContent === "2 / 3 locked in")).toBeInTheDocument();
  });

  // ── Case 3 ────────────────────────────────────────────────────────────────
  it("shows '1 / 3 locked in' when hasSubmitted is true and donePlayers is empty", () => {
    renderPromptInput({ hasSubmitted: true, donePlayers: new Set() });
    expect(screen.getByText((content: string, element: Element | null) => element?.textContent === "1 / 3 locked in")).toBeInTheDocument();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Forwarded ref handle (useImperativeHandle)
// ══════════════════════════════════════════════════════════════════════════════

describe("ref handle (PromptInputHandle)", () => {
  // ── Case 1 ────────────────────────────────────────────────────────────────
  it("getCurrentValue() returns the current textarea value via ref", async () => {
    const ref = createRef<PromptInputHandle>();
    renderPromptInput({ ref });
    const user = userEvent.setup();
    const textarea = screen.getByPlaceholderText("e.g. A cat wearing sunglasses");
    await user.type(textarea, "Dragon");
    expect(ref.current?.getCurrentValue()).toBe("Dragon");
  });

  // ── Case 2 ────────────────────────────────────────────────────────────────
  it("getCurrentValue() returns an empty string before the user types anything", () => {
    const ref = createRef<PromptInputHandle>();
    renderPromptInput({ ref });
    expect(ref.current?.getCurrentValue()).toBe("");
  });
});
