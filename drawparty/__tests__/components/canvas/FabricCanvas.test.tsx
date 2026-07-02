// DrawParty — FabricCanvas Component Tests
// Tests components/canvas/FabricCanvas.tsx.
// Fabric.js Canvas class is mocked — canvas API unavailable in jsdom.

import { createRef } from "react";
import { render } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FabricCanvas } from "@/components/canvas/FabricCanvas";

beforeEach(() => vi.clearAllMocks());

describe("FabricCanvas", () => {
  it("renders canvas element", () => {
    const canvasRef = createRef<HTMLCanvasElement>();
    const { container } = render(<FabricCanvas canvasRef={canvasRef} />);

    expect(container.querySelector("canvas")).toBeInTheDocument();
  });

  it("assigns the canvas element to the provided ref", () => {
    const canvasRef = createRef<HTMLCanvasElement>();
    render(<FabricCanvas canvasRef={canvasRef} />);

    expect(canvasRef.current).toBeInstanceOf(HTMLCanvasElement);
  });

  it("does not render read-only overlay by default", () => {
    const canvasRef = createRef<HTMLCanvasElement>();
    const { container } = render(<FabricCanvas canvasRef={canvasRef} />);

    expect(container.querySelector(".cursor-not-allowed")).not.toBeInTheDocument();
  });

  it("renders read-only overlay when readOnly=true", () => {
    const canvasRef = createRef<HTMLCanvasElement>();
    const { container } = render(<FabricCanvas canvasRef={canvasRef} readOnly />);

    expect(container.querySelector(".cursor-not-allowed")).toBeInTheDocument();
  });

  it("applies custom className to the wrapper", () => {
    const canvasRef = createRef<HTMLCanvasElement>();
    const { container } = render(<FabricCanvas canvasRef={canvasRef} className="custom-canvas" />);

    expect(container.firstChild).toHaveClass("custom-canvas");
  });
});
