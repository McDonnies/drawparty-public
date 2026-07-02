// DrawParty — LivesDisplay Component Tests  [NEW — gartic-ai game mode]
// Tests components/gartic-ai/LivesDisplay.tsx — shows remaining shared lives.

import { render } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { LivesDisplay } from "@/components/gartic-ai/LivesDisplay";

beforeEach(() => vi.clearAllMocks());

describe("lives display", () => {
  it("renders hearts for remaining lives", () => {
    const { container } = render(<LivesDisplay lives={2} />);
    const hearts = Array.from(container.querySelectorAll("svg"));

    expect(hearts.filter((heart) => heart.getAttribute("class")?.includes("fill-[#FF6B6B]"))).toHaveLength(2);
  });

  it("renders empty hearts for lost lives", () => {
    const { container } = render(<LivesDisplay lives={1} />);
    const hearts = Array.from(container.querySelectorAll("svg"));

    expect(hearts.filter((heart) => heart.getAttribute("class")?.includes("text-[#3a2e4e]"))).toHaveLength(2);
  });

  it("correct total heart count", () => {
    const { container } = render(<LivesDisplay lives={3} maxLives={3} />);

    expect(container.querySelectorAll("svg")).toHaveLength(3);
  });
});

describe("edge cases", () => {
  it("0 filled hearts when lives=0", () => {
    const { container } = render(<LivesDisplay lives={0} />);
    const hearts = Array.from(container.querySelectorAll("svg"));

    expect(hearts.filter((heart) => heart.getAttribute("class")?.includes("fill-[#FF6B6B]"))).toHaveLength(0);
  });
});
