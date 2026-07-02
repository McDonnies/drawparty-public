// DrawParty — DescribeStep Component Tests
// Tests components/gartic-phone/DescribeStep.tsx — player describes what they see.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DescribeStep } from "@/components/gartic-phone/DescribeStep";
import type { RoomPlayerDTO } from "@/types/game";

vi.mock("@/context/LanguageContext", async () => {
  const { getTranslations } = await vi.importActual<typeof import("@/lib/translations")>("@/lib/translations");
  return { useLanguage: () => ({ t: getTranslations("en") }) };
});

beforeEach(() => vi.clearAllMocks());

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

const imageBase64 = "data:image/png;base64,abc123";
const players = [makePlayer("u1"), makePlayer("u2")];
let onSubmit: ReturnType<typeof vi.fn>;
let onUnlock: ReturnType<typeof vi.fn>;

function renderDescribeStep(overrides: Partial<React.ComponentProps<typeof DescribeStep>> = {}) {
  return render(
    <DescribeStep
      imageBase64={overrides.imageBase64 ?? imageBase64}
      timeLeft={overrides.timeLeft ?? 30}
      currentRound={overrides.currentRound ?? 2}
      totalRounds={5}
      onSubmit={overrides.onSubmit ?? onSubmit}
      onUnlock={overrides.onUnlock ?? onUnlock}
      hasSubmitted={overrides.hasSubmitted ?? false}
      donePlayers={overrides.donePlayers ?? new Set()}
      players={overrides.players ?? players}
    />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  onSubmit = vi.fn();
  onUnlock = vi.fn();
});

describe("initial render", () => {
  it("renders describe instruction", () => {
    renderDescribeStep();

    expect(screen.getByText("Describe this drawing:")).toBeInTheDocument();
  });

  it("renders previous step image", () => {
    renderDescribeStep();

    expect(screen.getByAltText("Drawing to describe")).toHaveAttribute("src", imageBase64);
  });

  it("submit button disabled when empty", () => {
    renderDescribeStep();

    expect(screen.getByRole("button", { name: "Lock in" })).toBeDisabled();
  });
});

describe("submission", () => {
  it("calls onSubmit with trimmed text", async () => {
    const user = userEvent.setup();
    renderDescribeStep();

    await user.type(screen.getByPlaceholderText("Write a sentence..."), "  a red house  ");
    await user.click(screen.getByRole("button", { name: "Lock in" }));

    expect(onSubmit).toHaveBeenCalledWith("a red house");
  });

  it("submits on Enter key", async () => {
    const user = userEvent.setup();
    renderDescribeStep();

    await user.type(screen.getByPlaceholderText("Write a sentence..."), "a red house{Enter}");

    expect(onSubmit).toHaveBeenCalledWith("a red house");
  });

  it("locks form after submission", () => {
    renderDescribeStep({ hasSubmitted: true });

    expect(screen.getByPlaceholderText("Write a sentence...")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Locked in ✓" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Modify" })).toBeEnabled();
  });
});
