// DrawParty — AIJudgingScreen Component Tests  [NEW — gartic-ai game mode]
// Tests components/gartic-ai/AIJudgingScreen.tsx — shown while AI evaluates drawing.

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AIJudgingScreen } from "@/components/gartic-ai/AIJudgingScreen";

vi.mock("@/context/LanguageContext", async () => {
  const { getTranslations } = await vi.importActual<typeof import("@/lib/translations")>("@/lib/translations");
  return { useLanguage: () => ({ t: getTranslations("en") }) };
});

beforeEach(() => vi.clearAllMocks());

describe("judging screen render", () => {
  it("renders AI thinking animation dots", () => {
    const { container } = render(<AIJudgingScreen />);

    expect(container.querySelectorAll(".rounded-full.bg-\\[\\#7B4FBF\\]")).toHaveLength(3);
  });

  it("renders AI icon", () => {
    render(<AIJudgingScreen />);

    expect(screen.getByText("🤖")).toBeInTheDocument();
  });

  it("renders analysing message", () => {
    render(<AIJudgingScreen />);

    expect(screen.getByText("AI is analyzing")).toBeInTheDocument();
    expect(screen.getByText("Groq Vision is judging your masterpiece…")).toBeInTheDocument();
  });
});
