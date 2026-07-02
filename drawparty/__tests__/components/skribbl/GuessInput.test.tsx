// DrawParty — GuessInput Component Tests
// Tests components/skribbl/GuessInput.tsx — guess/chat input with mode switching.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/context/LanguageContext", () => ({
  useLanguage: () => ({
    t: {
      skribbl: {
        chatPlaceholder: "Type a chat message...",
        guessPlaceholder: "Type your guess...",
        send: "Send",
        wellDone: "Well done!",
      },
    },
  }),
}));

import GuessInput from "@/components/skribbl/GuessInput";

let mockOnSubmit: ReturnType<typeof vi.fn>;
let mockOnChat: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockOnSubmit = vi.fn();
  mockOnChat = vi.fn();
});

function renderInput(overrides: Partial<{
  onSubmit: (g: string) => void;
  isCorrect: boolean;
  isDrawer: boolean;
  phase: "PICKING_WORD" | "DRAWING" | "ROUND_END" | "FINISHED";
  onChatMessage: (m: string) => void;
}> = {}) {
  return render(
    <GuessInput
      onSubmit={overrides.onSubmit ?? mockOnSubmit}
      isCorrect={overrides.isCorrect ?? false}
      isDrawer={overrides.isDrawer ?? false}
      phase={overrides.phase ?? "DRAWING"}
      onChatMessage={overrides.onChatMessage ?? mockOnChat}
    />
  );
}

describe("input behaviour", () => {
  it("renders chat input when drawer (always visible)", () => {
    renderInput({ isDrawer: true });
    expect(screen.getByPlaceholderText("Type a chat message...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
  });

  it("returns null when not drawer and phase is not DRAWING", () => {
    const { container } = renderInput({ isDrawer: false, phase: "PICKING_WORD" });
    expect(container.firstChild).toBeNull();
  });

  it("shows 'Well done!' when isCorrect is true", () => {
    renderInput({ isCorrect: true });
    expect(screen.getByText("Well done!")).toBeInTheDocument();
  });

  it("renders guess input and send button for guessing player", () => {
    renderInput({ isDrawer: false, isCorrect: false, phase: "DRAWING" });
    expect(screen.getByPlaceholderText("Type your guess...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
  });

  it("submits guess on Enter and calls onSubmit", async () => {
    const user = userEvent.setup();
    renderInput();
    await user.type(screen.getByPlaceholderText("Type your guess..."), "cat");
    await user.keyboard("{Enter}");
    expect(mockOnSubmit).toHaveBeenCalledWith("cat");
  });

  it("ignores empty submission", async () => {
    const user = userEvent.setup();
    renderInput();
    await user.keyboard("{Enter}");
    expect(mockOnSubmit).not.toHaveBeenCalled();
    expect(mockOnChat).not.toHaveBeenCalled();
  });
});
