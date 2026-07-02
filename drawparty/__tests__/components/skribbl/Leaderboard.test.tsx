// DrawParty — HintDisplay Component Tests
// Tests components/skribbl/HintDisplay.tsx — shows word hint underscores.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/context/LanguageContext", () => ({
  useLanguage: () => ({
    t: {
      skribbl: {
        youAreDrawing: "You are drawing:",
        nLetters: "{n} letters",
      },
    },
  }),
}));

import HintDisplay from "@/components/skribbl/HintDisplay";

beforeEach(() => vi.clearAllMocks());

function renderHint(overrides: Partial<{
  hint: string; wordLength: number; category: string | null; isDrawer: boolean;
}> = {}) {
  return render(
    <HintDisplay
      hint={overrides.hint ?? "_ _ _"}
      wordLength={overrides.wordLength ?? 3}
      category={overrides.category ?? null}
      isDrawer={overrides.isDrawer ?? false}
    />
  );
}

describe("hint rendering", () => {
  it("shows drawer pill with full word when isDrawer is true", () => {
    renderHint({ isDrawer: true, hint: "cat" });
    expect(screen.getByText(/You are drawing:/i)).toBeInTheDocument();
    expect(screen.getByText("cat")).toBeInTheDocument();
  });

  it("renders letter boxes for guesser view", () => {
    renderHint({ hint: "_ _ _", wordLength: 3 });
    const boxes = document.querySelectorAll(".w-8.h-10");
    expect(boxes.length).toBe(3);
  });

  it("shows category badge when category is provided", () => {
    renderHint({ hint: "_ _ _", category: "Animals" });
    expect(screen.getByText("Animals")).toBeInTheDocument();
  });

  it("does not show category badge when category is null (guesser)", () => {
    renderHint({ hint: "_ _ _", category: null });
    expect(screen.queryByText("Animals")).toBeNull();
  });

  it("shows nLetters count text", () => {
    renderHint({ wordLength: 5 });
    expect(screen.getByText(/5 letters/i)).toBeInTheDocument();
  });

  it("renders spacer for | tokens (word breaks)", () => {
    renderHint({ hint: "c a t | d o g", wordLength: 6 });
    const spacers = document.querySelectorAll(".w-4.mx-1");
    expect(spacers.length).toBe(1);
  });
});
