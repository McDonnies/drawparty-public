// DrawParty — useFabricCanvas Hook Tests
// Tests hooks/useFabricCanvas.ts — Fabric.js canvas initialization + lifecycle.
// Fabric.js canvas API is mocked (not available in jsdom).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

// Mock fabric using a factory (no top-level variables in vi.mock factory)
vi.mock("fabric", () => {
  const mockCanvas = {
    dispose: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    clear: vi.fn(),
    toDataURL: vi.fn().mockReturnValue("data:image/png;base64,abc"),
    getObjects: vi.fn().mockReturnValue([]),
    remove: vi.fn(),
    renderAll: vi.fn(),
    add: vi.fn(),
    isDrawingMode: false,
    freeDrawingBrush: { color: "", width: 1 },
    backgroundColor: "#ffffff",
    upperCanvasEl: null,
    wrapperEl: null,
  };
  return {
    Canvas: vi.fn().mockImplementation(() => mockCanvas),
    PencilBrush: vi.fn().mockImplementation(() => ({ color: "", width: 1 })),
    Path: vi.fn(),
    Ellipse: vi.fn(),
    Rect: vi.fn(),
    Polygon: vi.fn(),
    FabricImage: { fromURL: vi.fn().mockResolvedValue({ set: vi.fn() }) },
  };
});

// Mock canvas utilities
vi.mock("@/components/canvas/canvasUtils", () => ({
  serializeStroke: vi.fn().mockReturnValue({ type: "path" }),
  applyRemoteStroke: vi.fn(),
  compressImageIfNeeded: vi.fn().mockResolvedValue("data:image/png;base64,compressed"),
  performFloodFill: vi.fn().mockResolvedValue(null),
}));

import { useFabricCanvas } from "@/hooks/useFabricCanvas";
import { applyRemoteStroke as applyStrokeUtil } from "@/components/canvas/canvasUtils";

beforeEach(() => vi.clearAllMocks());

describe("useFabricCanvas", () => {
  it("initializes and returns canvasRef with correct initial state", () => {
    const { result } = renderHook(() => useFabricCanvas("room1"));
    expect(result.current.canvasRef).toBeDefined();
    expect(result.current.color).toBe("#000000");
    expect(result.current.brushSize).toBe(4);
    expect(result.current.activeTool).toBe("brush");
  });

  it("disposes canvas on unmount without throwing", () => {
    const { unmount } = renderHook(() => useFabricCanvas("room1"));
    expect(() => unmount()).not.toThrow();
  });

  it("getImageBase64 returns a string when canvas not initialized", async () => {
    const { result } = renderHook(() => useFabricCanvas("room1"));
    const value = await result.current.getImageBase64();
    expect(typeof value).toBe("string");
  });

  it("clearCanvas does not throw when canvas not initialized", () => {
    const { result } = renderHook(() => useFabricCanvas("room1"));
    expect(() => result.current.clearCanvas()).not.toThrow();
  });

  it("applyRemoteStroke does not throw without initialized canvas", () => {
    const { result } = renderHook(() => useFabricCanvas("room1"));
    const stroke = { type: "path" as const, path: "M 0 0 L 10 10", color: "#ff0000", width: 2 };
    expect(() => result.current.applyRemoteStroke(stroke)).not.toThrow();
  });
});
