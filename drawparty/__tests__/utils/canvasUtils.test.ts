// DrawParty — canvasUtils Unit Tests
// Tests all exported functions of components/canvas/canvasUtils.ts.
// Spec ref: specification/Outils-de-dessin-Canvas.md
//
// IMPORTANT: canvasUtils.ts imports { Path, Canvas } from "fabric" at the top level.
// Even if a test only calls getCanvasDimensions(), the fabric import still executes
// and tries to access browser canvas APIs that jsdom does not support.
// The vi.mock("fabric") below must be present in this file unconditionally.

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Fabric.js mock ─────────────────────────────────────────────────────────────
//
// We replace the real Fabric.js module with a plain mock so tests run in jsdom.
//
// Path constructor mock: returns a plain object exposing the properties that
// applyRemoteStroke reads back (path, stroke, strokeWidth, etc.).
//
// Canvas mock: only used as a type reference — the real canvas is replaced by
// a hand-crafted mock object in each test (see makeMockCanvas below).

vi.mock("fabric", () => ({
  Path: vi.fn(function (this: Record<string, unknown>, pathStr: string, options: Record<string, unknown>) {
    this.path = pathStr;
    this.stroke = options?.stroke ?? "#000000";
    this.strokeWidth = options?.strokeWidth ?? 4;
    this.fill = options?.fill;
    this.selectable = options?.selectable;
    this.evented = options?.evented;
  }),
  Canvas: vi.fn(),
}));

// ── Functions under test ───────────────────────────────────────────────────────

import {
  getCanvasDimensions,
  serializeStroke,
  applyRemoteStroke,
  compressImageIfNeeded,
} from "@/components/canvas/canvasUtils";

import { Path } from "fabric";
import type { FabricStroke } from "@/types/game";

// ── Shared mock builders ───────────────────────────────────────────────────────

/**
 * Creates a minimal Fabric.js Canvas mock with vi.fn() methods.
 * @param objects - Existing objects on the canvas (for undo tests)
 */
function makeMockCanvas(objects: unknown[] = []) {
  return {
    clear: vi.fn(),
    renderAll: vi.fn(),
    add: vi.fn(),
    remove: vi.fn(),
    getObjects: vi.fn().mockReturnValue(objects),
    backgroundColor: "" as string,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ══════════════════════════════════════════════════════════════════════════════
// getCanvasDimensions
// ══════════════════════════════════════════════════════════════════════════════

describe("getCanvasDimensions", () => {
  // ── Case 1 ────────────────────────────────────────────────────────────────
  it("returns width and 4:3 height for input below 800", () => {
    // 1. Call: const dims = getCanvasDimensions(400)
    // 2. Assert: dims.width === 400
    // 3. Assert: dims.height === 300  (400 * 0.75)
    const dims = getCanvasDimensions(400);
    expect(dims.width).toBe(400);
    expect(dims.height).toBe(300);

  });

  // ── Case 2 ────────────────────────────────────────────────────────────────
  it("caps width at 800 and returns height 600 for any input above 800", () => {
    // 1. Call: getCanvasDimensions(1200)
    // 2. Assert: width === 800, height === 600
    // Also verify with an exact 800 input:
    // 3. Call: getCanvasDimensions(800)
    // 4. Assert: width === 800, height === 600
    const dims1 = getCanvasDimensions(1200);
    expect(dims1.width).toBe(800);
    expect(dims1.height).toBe(600);
    const dims2 = getCanvasDimensions(800);
    expect(dims2.width).toBe(800);
    expect(dims2.height).toBe(600);

  });

  // ── Case 3 ────────────────────────────────────────────────────────────────
  it("uses Math.floor so height is never a fractional pixel", () => {
    // 333 * 0.75 = 249.75 → should floor to 249
    // 1. Call: getCanvasDimensions(333)
    // 2. Assert: height === 249
    const dims = getCanvasDimensions(333);
    expect(dims.height).toBe(249);

  });

  // ── Case 4 ────────────────────────────────────────────────────────────────
  it("handles a width of 0 gracefully", () => {
    // 1. Call: getCanvasDimensions(0)
    // 2. Assert: { width: 0, height: 0 }
    const dims = getCanvasDimensions(0);
    expect(dims).toEqual({ width: 0, height: 0 });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// serializeStroke
// ══════════════════════════════════════════════════════════════════════════════

describe("serializeStroke", () => {
  // ── Case 1 ────────────────────────────────────────────────────────────────
  it("serializes a Fabric.js Path with array-form path segments to an SVG string", () => {
    // Fabric v7 stores path as an array of segment arrays: [["M",0,0],["Q",10,10,20,20]]
    // serializeStroke joins them: "M 0 0 Q 10 10 20 20"
    //
    // 1. Create input: { path: [["M", 0, 0], ["Q", 10, 10, 20, 20]], stroke: "#ff0000", strokeWidth: 8 }
    // 2. Call: const stroke = serializeStroke(input)
    // 3. Assert: stroke.type === "path"
    // 4. Assert: stroke.path === "M 0 0 Q 10 10 20 20"
    // 5. Assert: stroke.color === "#ff0000"
    // 6. Assert: stroke.width === 8
    const input = { path: [["M", 0, 0], ["Q", 10, 10, 20, 20]], stroke: "#ff0000", strokeWidth: 8 };
    const stroke = serializeStroke(input);
    expect(stroke.type).toBe("path");
    expect(stroke.path).toBe("M 0 0 Q 10 10 20 20");
    expect(stroke.color).toBe("#ff0000");
    expect(stroke.width).toBe(8);

  });

  // ── Case 2 ────────────────────────────────────────────────────────────────
  it("passes a string-form path through unchanged", () => {
    // 1. Input: { path: "M 0 0 L 10 10", stroke: "#000000", strokeWidth: 4 }
    // 2. Assert: stroke.path === "M 0 0 L 10 10"
    const input = { path: "M 0 0 L 10 10", stroke: "#000000", strokeWidth: 4 };
    const stroke = serializeStroke(input);
    expect(stroke.path).toBe("M 0 0 L 10 10");

  });

  // ── Case 3 ────────────────────────────────────────────────────────────────
  it("defaults color to '#000000' when stroke is undefined", () => {
    // 1. Input: { path: [["M", 0, 0]], stroke: undefined, strokeWidth: 4 }
    // 2. Assert: stroke.color === "#000000"
    const input = { path: [["M", 0, 0]], stroke: undefined, strokeWidth: 4 };
    const stroke = serializeStroke(input);
    expect(stroke.color).toBe("#000000");
  });

  // ── Case 4 ────────────────────────────────────────────────────────────────
  it("defaults width to 4 when strokeWidth is undefined", () => {
    // 1. Input: { path: "M 0 0", stroke: "#ff0000", strokeWidth: undefined }
    // 2. Assert: stroke.width === 4
    const input = { path: "M 0 0", stroke: "#ff0000", strokeWidth: undefined };
    const stroke = serializeStroke(input);
    expect(stroke.width).toBe(4);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// applyRemoteStroke
// ══════════════════════════════════════════════════════════════════════════════

describe("applyRemoteStroke", () => {
  // ── Case 1 ────────────────────────────────────────────────────────────────
  it("clears the canvas and resets backgroundColor to white on 'clear' stroke", () => {
    // 1. const canvas = makeMockCanvas()
    // 2. const stroke: FabricStroke = { type: "clear" }
    // 3. Call: applyRemoteStroke(canvas, stroke)
    // 4. Assert: canvas.clear called once
    // 5. Assert: canvas.backgroundColor === "#ffffff"
    // 6. Assert: canvas.renderAll called once
    const canvas = makeMockCanvas();
    const stroke: FabricStroke = { type: "clear" };
    applyRemoteStroke(canvas, stroke);
    expect(canvas.clear).toHaveBeenCalledTimes(1);
    expect(canvas.backgroundColor).toBe("#ffffff");
    expect(canvas.renderAll).toHaveBeenCalledTimes(1);
  });

  // ── Case 2 ────────────────────────────────────────────────────────────────
  it("removes the last canvas object on 'undo' stroke", () => {
    // 1. const obj1 = {}, obj2 = {}, obj3 = {}
    // 2. const canvas = makeMockCanvas([obj1, obj2, obj3])
    // 3. Call: applyRemoteStroke(canvas, { type: "undo" })
    // 4. Assert: canvas.remove called with obj3 (the last element)
    // 5. Assert: canvas.renderAll called
    const obj1 = {}, obj2 = {}, obj3 = {};
    const canvas = makeMockCanvas([obj1, obj2, obj3]);
    applyRemoteStroke(canvas, { type: "undo" });
    expect(canvas.remove).toHaveBeenCalledWith(obj3);
    expect(canvas.renderAll).toHaveBeenCalled();
  });

  // ── Case 3 ────────────────────────────────────────────────────────────────
  it("does NOT call canvas.remove when canvas has no objects (undo on empty canvas)", () => {
    // 1. const canvas = makeMockCanvas([])  ← empty
    // 2. Call: applyRemoteStroke(canvas, { type: "undo" })
    // 3. Assert: canvas.remove was NOT called
    const canvas = makeMockCanvas([]);
    applyRemoteStroke(canvas, { type: "undo" });
    expect(canvas.remove).not.toHaveBeenCalled();
  });

  // ── Case 4 ────────────────────────────────────────────────────────────────
  it("creates a Fabric.js Path and adds it to the canvas on 'path' stroke", () => {
    // 1. const canvas = makeMockCanvas()
    // 2. const stroke: FabricStroke = { type: "path", path: "M 0 0 L 100 100", color: "#ff0000", width: 5 }
    // 3. Call: applyRemoteStroke(canvas, stroke)
    // 4. Assert: Path constructor (the vi.fn() mock) was called with ("M 0 0 L 100 100", expect.objectContaining({ stroke: "#ff0000", strokeWidth: 5 }))
    // 5. Assert: canvas.add was called
    // 6. Assert: canvas.renderAll was called
    const canvas = makeMockCanvas();
    const stroke: FabricStroke = { type: "path", path: "M 0 0 L 100 100", color: "#ff0000", width: 5 };
    applyRemoteStroke(canvas, stroke);
    expect(Path).toHaveBeenCalledWith("M 0 0 L 100 100", expect.objectContaining({ stroke: "#ff0000", strokeWidth: 5 }));
    expect(canvas.add).toHaveBeenCalled();
    expect(canvas.renderAll).toHaveBeenCalled();
  });

  // ── Case 5 ────────────────────────────────────────────────────────────────
  it("does NOT call canvas.add when stroke type is 'path' but path is empty or undefined", () => {
    // 1. const canvas = makeMockCanvas()
    // 2. Call: applyRemoteStroke(canvas, { type: "path", path: "" })
    // 3. Assert: canvas.add was NOT called
    const canvas = makeMockCanvas();
    applyRemoteStroke(canvas, { type: "path", path: "" });
    expect(canvas.add).not.toHaveBeenCalled();

  });
});

// ══════════════════════════════════════════════════════════════════════════════
// compressImageIfNeeded
// ══════════════════════════════════════════════════════════════════════════════

describe("compressImageIfNeeded", () => {
  // ── Case 1 ────────────────────────────────────────────────────────────────
  it("returns the original base64 unchanged when it is already under maxBytes", async () => {
    // A short string is well under 2 MB.
    // Estimated size: Math.ceil(length * 3 / 4)
    //
    // 1. const small = "data:image/png;base64,abc"
    // 2. Call: const result = await compressImageIfNeeded(small, 2 * 1024 * 1024)
    // 3. Assert: result === small
    const small = "data:image/png;base64,abc";
    const result = await compressImageIfNeeded(small, 2 * 1024 * 1024);
    expect(result).toBe(small);

  });

  // ── Case 2 ────────────────────────────────────────────────────────────────
  it("reduces JPEG quality in a loop when the image is over maxBytes", async () => {
    // This test requires mocking window.Image and document.createElement("canvas")
    // because compressImageIfNeeded uses browser APIs not available in jsdom by default.
    //
    // Setup:
    //   const mockToDataURL = vi.fn()
    //     .mockReturnValueOnce("data:image/jpeg;base64," + "x".repeat(3_000_000))  // oversized on quality 0.9
    //     .mockReturnValue("data:image/jpeg;base64,small");                         // small on subsequent calls
    //
    //   vi.spyOn(document, "createElement").mockImplementation((tag) => {
    //     if (tag === "canvas") {
    //       return {
    //         getContext: () => ({ fillStyle: "", fillRect: vi.fn(), drawImage: vi.fn() }),
    //         toDataURL: mockToDataURL,
    //         width: 0, height: 0,
    //       } as unknown as HTMLCanvasElement;
    //     }
    //     return document.createElement(tag);
    //   });
    //
    //   // Mock window.Image to immediately trigger onload
    //   class MockImage { set src(_: string) { this.onload?.(); } onload: (() => void) | null = null; width = 100; height = 100; }
    //   vi.stubGlobal("Image", MockImage);
    //
    // 1. Create an oversized base64 string: "data:image/png;base64," + "x".repeat(3_000_000)
    // 2. Call: const result = await compressImageIfNeeded(oversized, 100)
    // 3. Assert: mockToDataURL was called with "image/jpeg" and a quality value ≤ 0.9
    // 4. Assert: result is the small compressed string (not the original)
      const mockToDataURL = vi.fn()
      const originalCreateElement = document.createElement.bind(document);
      mockToDataURL
    .mockReturnValueOnce("data:image/jpeg;base64," + "x".repeat(3_000_000))
    .mockReturnValue("data:image/jpeg;base64,small");

  vi.spyOn(document, "createElement").mockImplementation((tag) => {
    if (tag === "canvas") {
      return {
        getContext: () => ({ fillStyle: "", fillRect: vi.fn(), drawImage: vi.fn() }),
        toDataURL: mockToDataURL,
        width: 0,
        height: 0,
      } as unknown as HTMLCanvasElement;
    }
    return originalCreateElement(tag);
  });

  class MockImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    width = 100;
    height = 100;
    set src(_: string) { this.onload?.(); }
  }
  vi.stubGlobal("Image", MockImage);

  const oversized = "data:image/png;base64," + "x".repeat(3_000_000);
  const result = await compressImageIfNeeded(oversized, 100);
  expect(mockToDataURL).toHaveBeenCalledWith("image/jpeg", expect.any(Number));
  expect(result).toBe("data:image/jpeg;base64,small");

  });

  // ── Case 3 ────────────────────────────────────────────────────────────────
  it("rejects the Promise when the image fails to load (onerror)", async () => {
    // 1. Mock window.Image to trigger onerror instead of onload:
    //    class MockImage { set src(_: string) { this.onerror?.(); } onerror: (() => void) | null = null; }
    //    vi.stubGlobal("Image", MockImage);
    //
    // 2. Create an oversized base64 (so it gets past the size check):
    //    const oversized = "data:image/png;base64," + "x".repeat(3_000_000)
    //
    // 3. Call: await expect(compressImageIfNeeded(oversized, 100)).rejects.toThrow()
          class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_: string) { this.onerror?.(); }
    }
    vi.stubGlobal("Image", MockImage);

    const oversized = "data:image/png;base64," + "x".repeat(3_000_000);
    await expect(compressImageIfNeeded(oversized, 100)).rejects.toThrow();

   });
  });
