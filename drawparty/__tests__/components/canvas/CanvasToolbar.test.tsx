// DrawParty — CanvasToolbar Component Tests
// Tests components/canvas/CanvasToolbar.tsx — drawing tool controls.

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionTools, BrushSlider, ColorPalette } from "@/components/canvas/CanvasToolbar";
import type { CanvasTool } from "@/hooks/useFabricCanvas";

beforeEach(() => {
  vi.clearAllMocks();
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe("tool selection", () => {
  it("brush tool is active when activeTool='brush'", () => {
    render(<ActionTools activeTool="brush" onToolChange={vi.fn()} onUndo={vi.fn()} onClear={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Brush" })).toHaveClass("border-[#9B6FDF]");
  });

  it("clicking eraser calls onToolChange('eraser')", async () => {
    const user = userEvent.setup();
    const onToolChange = vi.fn();
    render(<ActionTools activeTool="brush" onToolChange={onToolChange} onUndo={vi.fn()} onClear={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Eraser" }));

    expect(onToolChange).toHaveBeenCalledWith("eraser");
  });

  it("active tool is highlighted", () => {
    render(<ActionTools activeTool="eraser" onToolChange={vi.fn()} onUndo={vi.fn()} onClear={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Eraser" })).toHaveClass("border-[#9B6FDF]");
  });
});

describe("color picker", () => {
  it("renders color swatches", () => {
    render(<ColorPalette color="#000000" activeTool="brush" onColorChange={vi.fn()} onToolChange={vi.fn()} />);

    expect(screen.getByLabelText("Color #000000")).toBeInTheDocument();
    expect(screen.getByLabelText("Color #FF6B6B")).toBeInTheDocument();
  });

  it("clicking swatch calls onColorChange", async () => {
    const user = userEvent.setup();
    const onColorChange = vi.fn();
    render(<ColorPalette color="#000000" activeTool="brush" onColorChange={onColorChange} onToolChange={vi.fn()} />);

    await user.click(screen.getByLabelText("Color #FF6B6B"));

    expect(onColorChange).toHaveBeenCalledWith("#FF6B6B");
  });

  it("active color is highlighted", () => {
    render(<ColorPalette color="#FF6B6B" activeTool="brush" onColorChange={vi.fn()} onToolChange={vi.fn()} />);

    expect(screen.getByLabelText("Color #FF6B6B")).toHaveClass("ring-2");
  });
});

describe("stroke width", () => {
  it("slider calls onBrushSizeChange", () => {
    const onBrushSizeChange = vi.fn();
    render(<BrushSlider brushSize={8} color="#000000" activeTool="brush" onBrushSizeChange={onBrushSizeChange} />);

    fireEvent.keyDown(screen.getByRole("slider"), { key: "ArrowRight" });

    expect(onBrushSizeChange).toHaveBeenCalled();
  });

  it("slider reflects current brush size", () => {
    render(<BrushSlider brushSize={8} color="#000000" activeTool="brush" onBrushSizeChange={vi.fn()} />);

    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", "8");
  });
});

describe("clear button", () => {
  it("calls onClear after confirmation", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(<ActionTools activeTool={"brush" as CanvasTool} onToolChange={vi.fn()} onUndo={vi.fn()} onClear={onClear} />);

    await user.click(screen.getByRole("button", { name: "Clear" }));
    await user.click(screen.getByRole("button", { name: "Clear canvas" }));

    expect(onClear).toHaveBeenCalled();
  });

  it("clicking clear opens a confirmation dialog", async () => {
    const user = userEvent.setup();
    render(<ActionTools activeTool="brush" onToolChange={vi.fn()} onUndo={vi.fn()} onClear={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Clear" }));

    expect(screen.getByText("Clear canvas?")).toBeInTheDocument();
  });
});
