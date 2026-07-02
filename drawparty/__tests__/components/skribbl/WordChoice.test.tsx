// DrawParty — WordChoice Component Tests
// Tests components/skribbl/WordChoice.tsx — drawer picks one of three words.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/context/LanguageContext", () => ({
  useLanguage: () => ({
    t: {
      skribbl: {
        chooseWord: "Choose a word to draw!",
        youHaveNs: "You have {n}s to decide",
      },
    },
  }),
}));

import WordChoice from "@/components/skribbl/WordChoice";

let mockOnChoose: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockOnChoose = vi.fn();
});

function renderWordChoice(overrides: Partial<{
  words: string[]; timeLeft: number; timeLimit: number; onChoose: (i: number) => void;
}> = {}) {
  return render(
    <WordChoice
      words={overrides.words ?? ["apple", "banana", "cherry"]}
      timeLeft={overrides.timeLeft ?? 25}
      timeLimit={overrides.timeLimit ?? 30}
      onChoose={overrides.onChoose ?? mockOnChoose}
    />
  );
}

describe("word selection", () => {
  it("renders three word buttons", () => {
    renderWordChoice();
    expect(screen.getByRole("button", { name: "apple" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "banana" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "cherry" })).toBeInTheDocument();
  });

  it("shows the countdown timer bar", () => {
    renderWordChoice({ timeLeft: 15, timeLimit: 30 });
    const timerBar = document.querySelector(".h-full.rounded-full");
    expect(timerBar).toBeInTheDocument();
    expect(timerBar).toHaveStyle({ width: "50%" });
  });

  it("calls onChoose with the correct index when a word is clicked", async () => {
    const user = userEvent.setup();
    renderWordChoice();
    await user.click(screen.getByRole("button", { name: "banana" }));
    expect(mockOnChoose).toHaveBeenCalledOnce();
    expect(mockOnChoose).toHaveBeenCalledWith(1);
  });

  it("grays out other buttons and highlights the chosen one", async () => {
    const user = userEvent.setup();
    renderWordChoice();
    await user.click(screen.getByRole("button", { name: "apple" }));
    const selected = screen.getByRole("button", { name: "apple" });
    expect(selected.className).toContain("bg-[#7B4FBF]");
    const other1 = screen.getByRole("button", { name: "banana" });
    const other2 = screen.getByRole("button", { name: "cherry" });
    expect(other1.className).toContain("opacity-50");
    expect(other2.className).toContain("opacity-50");
  });

  it("prevents double-click (does not call onChoose twice)", async () => {
    const user = userEvent.setup();
    renderWordChoice();
    await user.click(screen.getByRole("button", { name: "apple" }));
    await user.click(screen.getByRole("button", { name: "banana" }));
    expect(mockOnChoose).toHaveBeenCalledOnce();
  });
});
