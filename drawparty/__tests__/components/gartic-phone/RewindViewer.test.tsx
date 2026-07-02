// DrawParty — RewindViewer Component Tests
// Tests components/gartic-phone/RewindViewer.tsx — end-of-game chain replay.

import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RewindViewer } from "@/components/gartic-phone/RewindViewer";
import type { GarticChainDTO, GarticChainStepDTO } from "@/types/game";

vi.mock("fabric", () => ({
  Canvas: vi.fn(() => ({
    setZoom: vi.fn(),
    setDimensions: vi.fn(),
    renderAll: vi.fn(),
    dispose: vi.fn(),
  })),
}));
vi.mock("@/components/canvas/canvasUtils", () => ({ applyRemoteStroke: vi.fn() }));
vi.mock("@/context/LanguageContext", async () => {
  const { getTranslations } = await vi.importActual<typeof import("@/lib/translations")>("@/lib/translations");
  return { useLanguage: () => ({ t: getTranslations("en") }) };
});

function step(overrides: Partial<GarticChainStepDTO>): GarticChainStepDTO {
  return {
    stepIndex: overrides.stepIndex ?? 0,
    type: overrides.type ?? "PROMPT",
    authorId: overrides.authorId ?? "u1",
    authorUsername: overrides.authorUsername ?? "Alice",
    content: overrides.content ?? null,
    imageBase64: overrides.imageBase64 ?? null,
    strokeData: overrides.strokeData ?? null,
    rating: overrides.rating ?? null,
  };
}

const chains: GarticChainDTO[] = [
  {
    chainId: "chain-1",
    ownerId: "u1",
    ownerUsername: "Alice",
    orderIndex: 0,
    steps: [
      step({ stepIndex: 0, type: "PROMPT", content: "A cat in space" }),
      step({ stepIndex: 1, type: "DRAW", authorUsername: "Bob", imageBase64: "data:image/png;base64,drawing" }),
      step({ stepIndex: 2, type: "DESCRIBE", authorUsername: "Cara", content: "A floating cat" }),
    ],
  },
  {
    chainId: "chain-2",
    ownerId: "u2",
    ownerUsername: "Bob",
    orderIndex: 1,
    steps: [step({ stepIndex: 0, type: "PROMPT", content: "A red boat" })],
  },
];

const socket = {
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
};

async function revealStep(): Promise<void> {
  await act(async () => {
    vi.advanceTimersByTime(2000);
  });
}

async function revealAllSteps(): Promise<void> {
  await revealStep();
  await act(async () => {
    vi.advanceTimersByTime(4500);
  });
  await act(async () => {
    vi.advanceTimersByTime(4500);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("chain navigation", () => {
  it("shows first chain by default", () => {
    render(<RewindViewer chains={chains} socket={socket as never} isHost roomId="room-1" />);

    expect(screen.getByText("Chain 1 / 2")).toBeInTheDocument();
    expect(screen.getByText("Alice's story")).toBeInTheDocument();
  });

  it("host next emits rewind_next after current chain is shown", async () => {
    render(<RewindViewer chains={chains} socket={socket as never} isHost roomId="room-1" />);

    await revealAllSteps();
    fireEvent.click(screen.getByRole("button", { name: "Next Chain →" }));

    expect(socket.emit).toHaveBeenCalledWith("gartic:rewind_next", { roomId: "room-1" });
  });

  it("subscribes to host-controlled chain advance", () => {
    render(<RewindViewer chains={chains} socket={socket as never} isHost={false} roomId="room-1" />);

    expect(socket.on).toHaveBeenCalledWith("gartic:rewind_next", expect.any(Function));
  });
});

describe("step rendering", () => {
  it("renders text for PROMPT step", async () => {
    render(<RewindViewer chains={chains} socket={socket as never} isHost roomId="room-1" />);

    await revealStep();

    expect(screen.getByText("A cat in space")).toBeInTheDocument();
  });

  it("renders image for DRAW step", async () => {
    render(<RewindViewer chains={chains} socket={socket as never} isHost roomId="room-1" />);

    await revealAllSteps();

    expect(screen.getByAltText("Drawing by Bob")).toHaveAttribute("src", "data:image/png;base64,drawing");
  });

  it("renders text for DESCRIBE step", async () => {
    render(<RewindViewer chains={chains} socket={socket as never} isHost roomId="room-1" />);

    await revealAllSteps();

    expect(screen.getByText("A floating cat")).toBeInTheDocument();
  });
});
