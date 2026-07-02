// DrawParty — WordReveal Component Tests  [NEW — gartic-ai game mode]
// Tests components/gartic-ai/WordReveal.tsx — word shown to players before drawing.

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { WordReveal } from "@/components/gartic-ai/WordReveal";

vi.mock("@/context/LanguageContext", async () => {
  const { getTranslations } = await vi.importActual<typeof import("@/lib/translations")>("@/lib/translations");
  return { useLanguage: () => ({ t: getTranslations("en") }) };
});

beforeEach(() => vi.clearAllMocks());

describe("word reveal render", () => {
  it("renders word to draw", () => {
    render(<WordReveal word="banana" />);

    expect(screen.getByText("Draw this word")).toBeInTheDocument();
    expect(screen.getByText("banana")).toBeInTheDocument();
  });

  it("renders the get-ready message before drawing starts", () => {
    render(<WordReveal word="banana" />);

    expect(screen.getByText("Get ready — drawing starts soon…")).toBeInTheDocument();
  });

  it("does not render the page-level letter hint UI", () => {
    render(<WordReveal word="banana" />);

    expect(screen.queryByText("AI sees:")).not.toBeInTheDocument();
  });
});
