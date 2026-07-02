// DrawParty — RoomCodeDisplay Component Tests
// Tests components/lobby/RoomCodeDisplay.tsx — shows room code with copy action.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";

vi.mock("@/context/LanguageContext", () => ({
  useLanguage: () => ({
    t: {
      lobby: {
        roomCode: "Room Code",
        copy: "Copy",
        copied: "Copied!",
        copiedToClipboard: "Code copied to clipboard",
        couldNotCopy: "Could not copy",
      },
    },
  }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { RoomCodeDisplay } from "@/components/lobby/RoomCodeDisplay";

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    writable: true,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("display", () => {
  it("renders the room code in large monospace font", () => {
    render(<RoomCodeDisplay code="ABC123" />);
    const code = screen.getByText("ABC123");
    expect(code).toBeInTheDocument();
    expect(code.className).toContain("font-mono");
  });

  it("renders a copy button", () => {
    render(<RoomCodeDisplay code="ABC123" />);
    expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
  });
});

describe("copy action", () => {
  it("copies code to clipboard on click", () => {
    render(<RoomCodeDisplay code="ABC123" />);
    screen.getByRole("button", { name: /copy/i }).click();
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("ABC123");
  });

  it("shows 'Copied!' feedback after copy", async () => {
    render(<RoomCodeDisplay code="ABC123" />);
    screen.getByRole("button", { name: /copy/i }).click();
    // handleCopy is async — wait for microtasks to flush
    await act(() => Promise.resolve());
    expect(screen.getByText("Copied!")).toBeInTheDocument();
  });

  it("reverts to 'Copy' after 2s", async () => {
    vi.useFakeTimers();
    render(<RoomCodeDisplay code="ABC123" />);
    screen.getByRole("button", { name: /copy/i }).click();
    await act(() => Promise.resolve());
    expect(screen.getByText("Copied!")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByText("Copy")).toBeInTheDocument();
  });
});
