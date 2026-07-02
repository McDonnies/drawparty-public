// DrawParty — RoundResult Component Tests  [NEW — gartic-ai game mode]
// Tests components/gartic-ai/RoundResult.tsx — shows AI guess result after each round.

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { RoundResult } from "@/components/gartic-ai/RoundResult";

vi.mock("@/context/LanguageContext", async () => {
  const { getTranslations } = await vi.importActual<typeof import("@/lib/translations")>("@/lib/translations");
  return { useLanguage: () => ({ t: getTranslations("en") }) };
});

beforeEach(() => vi.clearAllMocks());

describe("success result", () => {
  it("shows success state", () => {
    render(<RoundResult success aiGuess="cat" word="cat" lives={3} score={40} />);

    expect(screen.getByText("AI got it!")).toBeInTheDocument();
    expect(screen.getByText("✅")).toBeInTheDocument();
  });

  it("shows AI guess", () => {
    render(<RoundResult success aiGuess="cat" word="banana" lives={3} score={40} />);

    expect(screen.getByText(/cat/)).toBeInTheDocument();
  });

  it("shows correct word", () => {
    render(<RoundResult success aiGuess="cat" word="banana" lives={3} score={40} />);

    expect(screen.getByText("banana")).toBeInTheDocument();
  });

  it("shows score", () => {
    render(<RoundResult success aiGuess="cat" word="cat" lives={3} score={40} />);

    expect(screen.getByText("Score")).toBeInTheDocument();
    expect(screen.getByText("40")).toBeInTheDocument();
  });
});

describe("failure result", () => {
  it("shows failure state", () => {
    render(<RoundResult success={false} aiGuess="dog" word="cat" lives={2} score={10} />);

    expect(screen.getByText("AI missed it")).toBeInTheDocument();
    expect(screen.getByText("❌")).toBeInTheDocument();
  });

  it("shows remaining lives", () => {
    const { container } = render(<RoundResult success={false} aiGuess="dog" word="cat" lives={2} score={10} />);
    const hearts = Array.from(container.querySelectorAll("svg"));

    expect(screen.getByText("Lives")).toBeInTheDocument();
    expect(hearts.filter((heart) => heart.getAttribute("class")?.includes("fill-[#FF6B6B]"))).toHaveLength(2);
  });
});
