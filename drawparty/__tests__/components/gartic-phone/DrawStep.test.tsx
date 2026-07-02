// DrawParty — DrawStep Component Tests
// Tests components/gartic-phone/DrawStep.tsx — drawing phase UI.
// FabricCanvas is mocked (canvas API not available in jsdom).

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DrawStep } from "@/components/gartic-phone/DrawStep";
import type { RoomPlayerDTO } from "@/types/game";

vi.mock("@/components/canvas/FabricCanvas", () => ({
  FabricCanvas: vi.fn(({ readOnly }) => <div data-testid="fabric-canvas" data-readonly={String(readOnly)} />),
}));
vi.mock("@/context/LanguageContext", async () => {
  const { getTranslations } = await vi.importActual<typeof import("@/lib/translations")>("@/lib/translations");
  return { useLanguage: () => ({ t: getTranslations("en") }) };
});
vi.mock("next/navigation", () => ({ useParams: () => ({ roomId: "room-1" }) }));
vi.mock("@/components/canvas/CanvasToolbar", () => ({
  ColorPalette: vi.fn(() => <div data-testid="color-palette" />),
  BrushSlider: vi.fn(() => <div data-testid="brush-slider" />),
  ActionTools: vi.fn(() => <div data-testid="action-tools" />),
}));

const getImageBase64 = vi.fn();
const getStrokes = vi.fn();
const setReadOnly = vi.fn();

vi.mock("@/hooks/useFabricCanvas", () => ({
  useFabricCanvas: () => ({
    canvasRef: { current: null },
    color: "#000000",
    setColor: vi.fn(),
    brushSize: 4,
    setBrushSize: vi.fn(),
    activeTool: "brush",
    setActiveTool: vi.fn(),
    undo: vi.fn(),
    clearCanvas: vi.fn(),
    getImageBase64,
    getStrokes,
    setReadOnly,
    applyRemoteStroke: vi.fn(),
  }),
}));

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

const players = [makePlayer("u1"), makePlayer("u2")];
let onSubmit: ReturnType<typeof vi.fn>;
let onUnlock: ReturnType<typeof vi.fn>;

function renderDrawStep(overrides: Partial<React.ComponentProps<typeof DrawStep>> = {}) {
  return render(
    <DrawStep
      promptText={overrides.promptText ?? "A blue whale"}
      timeLeft={overrides.timeLeft ?? 30}
      currentRound={overrides.currentRound ?? 1}
      totalRounds={5}
      onSubmit={overrides.onSubmit ?? onSubmit}
      onUnlock={overrides.onUnlock ?? onUnlock}
      onStroke={overrides.onStroke}
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
  getImageBase64.mockResolvedValue("data:image/png;base64,drawing");
  getStrokes.mockReturnValue([{ type: "path", path: "M 0 0 L 1 1", color: "#000000", width: 4 }]);
});

describe("initial render", () => {
  it("renders phrase to draw", () => {
    renderDrawStep();

    expect(screen.getByText("A blue whale")).toBeInTheDocument();
  });

  it("renders round progress", () => {
    renderDrawStep({ currentRound: 2 });

    expect(screen.getByText("2/5")).toBeInTheDocument();
  });

  it("renders submit button", () => {
    renderDrawStep();

    expect(screen.getByRole("button", { name: "Lock in drawing" })).toBeEnabled();
  });
});

describe("timer", () => {
  it("uses timeLeft to set progress bar width", () => {
    const { container } = renderDrawStep({ timeLeft: 30 });

    expect(container.querySelector(".h-full.bg-white")).toHaveStyle({ width: "66.66666666666666%" });
  });
});

describe("submission", () => {
  it("calls onSubmit with canvas snapshot", async () => {
    const user = userEvent.setup();
    renderDrawStep();

    await user.click(screen.getByRole("button", { name: "Lock in drawing" }));

    expect(onSubmit).toHaveBeenCalledWith("data:image/png;base64,drawing", [
      { type: "path", path: "M 0 0 L 1 1", color: "#000000", width: 4 },
    ]);
  });

  it("disables submit after submission", () => {
    renderDrawStep({ hasSubmitted: true });

    expect(screen.getByRole("button", { name: "Drawing sent ✓" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Modify" })).toBeEnabled();
    expect(screen.getByTestId("fabric-canvas")).toHaveAttribute("data-readonly", "true");
  });
});
