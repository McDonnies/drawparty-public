"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Pencil, Eraser, Undo2, Trash2, Plus, PaintBucket,
  RectangleHorizontal, Square, Circle, Triangle,
  MoreHorizontal, ChevronDown, Minus
} from "lucide-react";
import type { CanvasTool } from "@/hooks/useFabricCanvas";

const PRESET_COLORS = [
  "#000000", "#ffffff", "#FF6B6B", "#FF9F43",
  "#F5C518", "#2ecc71", "#3AAFD4", "#9B6FDF",
  "#e84393", "#8B4513", "#808080", "#C0C0C0",
];

const QUICK_COLORS = PRESET_COLORS.slice(0, 6);
const MORE_COLORS  = PRESET_COLORS.slice(6);

const SHAPE_TOOLS: CanvasTool[] = ["line", "rect", "square", "circle", "triangle"];

function ShapeIcon({ tool }: { tool: CanvasTool }) {
  switch (tool) {
    case "line":     return <Minus size={14} className="rotate-45" />;
    case "rect":     return <RectangleHorizontal size={14} />;
    case "square":   return <Square size={14} />;
    case "circle":   return <Circle size={14} />;
    case "triangle": return <Triangle size={14} />;
    default:         return <Square size={14} />;
  }
}

// ── 1. Legacy ColorPalette (used in gartic-phone DrawStep) ──────────────────
export function ColorPalette({ color, activeTool, onColorChange, onToolChange, orientation = "vertical" }: {
  color: string; activeTool: CanvasTool; onColorChange: (c: string) => void; onToolChange: (t: CanvasTool) => void; orientation?: "vertical" | "horizontal";
}) {
  const wrapperClass = orientation === "horizontal"
    ? "flex flex-wrap justify-center gap-1.5 p-2.5 bg-[#161228] border border-[#211c38] rounded-xl h-fit"
    : "grid grid-cols-2 gap-2 p-3 bg-[#161228] border border-[#211c38] rounded-xl h-fit w-max shrink-0";

  return (
    <div className={wrapperClass}>
      {PRESET_COLORS.map((presetColor) => {
        const isSelected = activeTool !== "eraser" && color.toLowerCase() === presetColor.toLowerCase();
        return (
          <button
            key={presetColor}
            type="button"
            onClick={() => { onColorChange(presetColor); if (activeTool === "eraser") onToolChange("brush"); }}
            className={`w-10 h-10 flex-shrink-0 rounded-lg transition-transform hover:scale-110 ${isSelected ? "ring-2 ring-white ring-offset-2 ring-offset-[#161228]" : ""}`}
            style={{ backgroundColor: presetColor }}
            aria-label={`Color ${presetColor}`}
          />
        );
      })}
      <div className="relative w-10 h-10 flex-shrink-0 rounded-lg flex items-center justify-center bg-[#211c38] hover:bg-[#2a2447] cursor-pointer transition-colors overflow-hidden">
        <Plus size={16} className="text-white absolute pointer-events-none" />
        <input
          type="color" value={color}
          onChange={(e) => { onColorChange(e.target.value); if (activeTool === "eraser") onToolChange("brush"); }}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
  );
}

// ── 2. Legacy BrushSlider (used in gartic-phone DrawStep) ───────────────────
export function BrushSlider({ brushSize, color, activeTool, onBrushSizeChange }: {
  brushSize: number; color: string; activeTool: CanvasTool; onBrushSizeChange: (s: number) => void;
}) {
  const previewSize = Math.floor(brushSize / 2) + 4;
  return (
    <div className="flex items-center gap-4 p-3 bg-[#161228] border border-[#211c38] rounded-xl w-full">
      <div className="flex items-center justify-center w-8 h-8 shrink-0 bg-[#211c38] rounded-md">
        <div className="rounded-full bg-white transition-all duration-200" style={{ width: `${previewSize}px`, height: `${previewSize}px`, backgroundColor: activeTool === "eraser" ? "#ffffff" : color }} />
      </div>
      <Slider min={1} max={40} step={1} value={[brushSize]} onValueChange={([v]) => onBrushSizeChange(v)} className="flex-1" />
    </div>
  );
}

// ── 3. Legacy ActionTools (used in gartic-phone DrawStep) ───────────────────
export function ActionTools({ activeTool, onToolChange, onUndo, onClear, orientation = "vertical" }: {
  activeTool: CanvasTool; onToolChange: (t: CanvasTool) => void; onUndo: () => void; onClear: () => void; orientation?: "vertical" | "horizontal";
}) {
  const [showClearDialog, setShowClearDialog] = useState(false);

  const getBtnClass = (tool: CanvasTool) =>
    `h-11 w-11 flex items-center justify-center flex-shrink-0 transition-all duration-100 ${
      activeTool === tool
        ? "bg-[#9B6FDF]/30 text-[#9B6FDF] border-[#9B6FDF] ring-2 ring-[#9B6FDF]/50 shadow-[0_0_12px_rgba(155,111,223,0.45)] scale-110"
        : "bg-[#211c38] text-white border-transparent hover:bg-[#2a2447]"
    }`;

  const containerClass = orientation === "horizontal"
    ? "flex flex-row gap-2 flex-wrap p-3 bg-[#161228] border border-[#211c38] rounded-xl h-fit w-fit"
    : "grid grid-cols-2 gap-2 p-3 bg-[#161228] border border-[#211c38] rounded-xl h-fit w-fit";

  return (
    <>
      <div className={containerClass}>
        <Button variant="outline" size="icon" onClick={() => onToolChange("brush")} className={getBtnClass("brush")} title="Brush"><Pencil size={18} /></Button>
        <Button variant="outline" size="icon" onClick={() => onToolChange("fill")} className={getBtnClass("fill")} title="Fill"><PaintBucket size={18} /></Button>
        {orientation !== "horizontal" && <div className="col-span-2 h-px w-full bg-[#211c38]" />}
        <Button variant="outline" size="icon" onClick={() => onToolChange("line")} className={getBtnClass("line")} title="Line"><Minus size={18} className="rotate-45" /></Button>
        <Button variant="outline" size="icon" onClick={() => onToolChange("rect")} className={getBtnClass("rect")} title="Rectangle"><RectangleHorizontal size={18} /></Button>
        <Button variant="outline" size="icon" onClick={() => onToolChange("square")} className={getBtnClass("square")} title="Square"><Square size={18} /></Button>
        <Button variant="outline" size="icon" onClick={() => onToolChange("circle")} className={getBtnClass("circle")} title="Circle"><Circle size={18} /></Button>
        <Button variant="outline" size="icon" onClick={() => onToolChange("triangle")} className={getBtnClass("triangle")} title="Triangle"><Triangle size={18} /></Button>
        <Button variant="outline" size="icon" onClick={() => onToolChange("eraser")} className={getBtnClass("eraser")} title="Eraser"><Eraser size={18} /></Button>
        {orientation !== "horizontal" && <div className="col-span-2 h-px w-full bg-[#211c38]" />}
        <Button variant="outline" size="icon" onClick={onUndo} className="h-11 w-11 flex-shrink-0 bg-[#211c38] text-white hover:bg-[#2a2447]" title="Undo"><Undo2 size={18} /></Button>
        <Button variant="outline" size="icon" onClick={() => setShowClearDialog(true)} className="h-11 w-11 flex-shrink-0 bg-[#211c38] text-[#FF6B6B] border-transparent hover:bg-[#FF6B6B]/20" title="Clear"><Trash2 size={18} /></Button>
      </div>
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent className="bg-[#161228] border border-[#211c38] text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Clear canvas?</DialogTitle>
            <DialogDescription className="text-[#7a6f99]">This will remove everything on the canvas. This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowClearDialog(false)} className="bg-[#211c38] border-[#211c38] text-white hover:bg-[#2a2447] hover:text-white">Cancel</Button>
            <Button onClick={() => { setShowClearDialog(false); onClear(); }} className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/80 text-white border-0">Clear canvas</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── 4. CompactToolbar — single row below canvas (used in skribbl) ───────────
export function CompactToolbar({ color, brushSize, activeTool, onColorChange, onToolChange, onBrushSizeChange, onUndo, onClear }: {
  color: string;
  brushSize: number;
  activeTool: CanvasTool;
  onColorChange: (c: string) => void;
  onToolChange: (t: CanvasTool) => void;
  onBrushSizeChange: (s: number) => void;
  onUndo: () => void;
  onClear: () => void;
}) {
  const [showMoreColors, setShowMoreColors] = useState(false);
  const [showShapes, setShowShapes]         = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const moreColorsRef = useRef<HTMLDivElement>(null);
  const shapesRef     = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (moreColorsRef.current && !moreColorsRef.current.contains(e.target as Node)) setShowMoreColors(false);
      if (shapesRef.current     && !shapesRef.current.contains(e.target as Node))     setShowShapes(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const isShapeTool     = SHAPE_TOOLS.includes(activeTool);
  const activeShapeTool = isShapeTool ? activeTool : "rect";
  const effectiveColor  = activeTool === "eraser" ? "#ffffff" : color;

  const toolBtn = (tool: CanvasTool) =>
    `w-8 h-8 rounded-md border flex items-center justify-center transition-all duration-100 flex-shrink-0 ${
      activeTool === tool
        ? "bg-[#9B6FDF]/30 text-[#9B6FDF] border-[#9B6FDF] ring-2 ring-[#9B6FDF]/40 shadow-[0_0_8px_rgba(155,111,223,0.4)] scale-105"
        : "bg-[#211c38] text-white border-transparent hover:bg-[#2a2447]"
    }`;

  const dot = Math.min(14, Math.floor(brushSize / 3) + 4);

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5 p-2 bg-[#161228] border border-[#211c38] rounded-xl">

        <button
          onClick={() => onToolChange("brush")}
          title="Active color (switch to brush)"
          className="w-8 h-8 rounded-lg border-2 border-white/25 flex-shrink-0 transition-transform hover:scale-105"
          style={{ backgroundColor: effectiveColor }}
        />

        {QUICK_COLORS.map((c) => {
          const active = activeTool !== "eraser" && color.toLowerCase() === c.toLowerCase();
          return (
            <button
              key={c}
              onClick={() => { onColorChange(c); if (activeTool === "eraser") onToolChange("brush"); }}
              className={`w-6 h-6 rounded-md flex-shrink-0 transition-transform hover:scale-110 ${active ? "ring-2 ring-white ring-offset-1 ring-offset-[#161228]" : ""}`}
              style={{ backgroundColor: c }}
            />
          );
        })}

        <div ref={moreColorsRef} className="relative flex-shrink-0">
          <button
            onClick={() => setShowMoreColors((v) => !v)}
            className="w-6 h-6 rounded-md bg-[#211c38] flex items-center justify-center text-white hover:bg-[#2a2447]"
            title="More colors"
          >
            <MoreHorizontal size={12} />
          </button>
          {showMoreColors && (
            <div className="absolute bottom-full left-0 mb-2 p-2 bg-[#161228] border border-[#211c38] rounded-xl shadow-xl z-50 flex flex-wrap gap-1 w-max">
              {MORE_COLORS.map((c) => {
                const active = activeTool !== "eraser" && color.toLowerCase() === c.toLowerCase();
                return (
                  <button
                    key={c}
                    onClick={() => { onColorChange(c); if (activeTool === "eraser") onToolChange("brush"); setShowMoreColors(false); }}
                    className={`w-7 h-7 rounded-md flex-shrink-0 transition-transform hover:scale-110 ${active ? "ring-2 ring-white ring-offset-1 ring-offset-[#161228]" : ""}`}
                    style={{ backgroundColor: c }}
                  />
                );
              })}
              <div className="relative w-7 h-7 rounded-md bg-[#211c38] overflow-hidden flex items-center justify-center cursor-pointer hover:bg-[#2a2447]">
                <Plus size={12} className="text-white absolute pointer-events-none" />
                <input
                  type="color" value={color}
                  onChange={(e) => { onColorChange(e.target.value); if (activeTool === "eraser") onToolChange("brush"); }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-[#211c38] mx-0.5 flex-shrink-0" />

        <div className="flex items-center gap-1.5 min-w-[72px] max-w-[110px] flex-1">
          <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
            <div className="rounded-full" style={{ width: `${dot}px`, height: `${dot}px`, backgroundColor: effectiveColor }} />
          </div>
          <Slider min={1} max={40} step={1} value={[brushSize]} onValueChange={([v]) => onBrushSizeChange(v)} className="flex-1" />
        </div>

        <div className="w-px h-6 bg-[#211c38] mx-0.5 flex-shrink-0" />

        <button onClick={() => onToolChange("brush")}  className={toolBtn("brush")}  title="Brush"><Pencil      size={14} /></button>
        <button onClick={() => onToolChange("fill")}   className={toolBtn("fill")}   title="Fill"><PaintBucket  size={14} /></button>
        <button onClick={() => onToolChange("eraser")} className={toolBtn("eraser")} title="Eraser"><Eraser     size={14} /></button>

        <div ref={shapesRef} className="relative flex-shrink-0">
          <button
            onClick={() => setShowShapes((v) => !v)}
            title="Shapes"
            className={`w-8 h-8 rounded-md border flex items-center justify-center gap-0.5 transition-all duration-100 ${
              isShapeTool
                ? "bg-[#9B6FDF]/30 text-[#9B6FDF] border-[#9B6FDF] ring-2 ring-[#9B6FDF]/40 shadow-[0_0_8px_rgba(155,111,223,0.4)] scale-105"
                : "bg-[#211c38] text-white border-transparent hover:bg-[#2a2447]"
            }`}
          >
            <ShapeIcon tool={activeShapeTool} />
            <ChevronDown size={9} />
          </button>
          {showShapes && (
            <div className="absolute bottom-full left-0 mb-2 flex gap-1 p-2 bg-[#161228] border border-[#211c38] rounded-xl shadow-xl z-50">
              {SHAPE_TOOLS.map((t) => (
                <button key={t} onClick={() => { onToolChange(t); setShowShapes(false); }} className={toolBtn(t)} title={t}>
                  <ShapeIcon tool={t} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-[#211c38] mx-0.5 flex-shrink-0" />

        <button onClick={onUndo}                        className="w-8 h-8 rounded-md bg-[#211c38] text-white flex items-center justify-center hover:bg-[#2a2447] flex-shrink-0" title="Undo"><Undo2 size={14} /></button>
        <button onClick={() => setShowClearDialog(true)} className="w-8 h-8 rounded-md bg-[#211c38] text-[#FF6B6B] flex items-center justify-center hover:bg-[#FF6B6B]/20 flex-shrink-0" title="Clear canvas"><Trash2 size={14} /></button>
      </div>

      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent className="bg-[#161228] border border-[#211c38] text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Clear canvas?</DialogTitle>
            <DialogDescription className="text-[#7a6f99]">This will remove everything on the canvas. This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowClearDialog(false)} className="bg-[#211c38] border-[#211c38] text-white hover:bg-[#2a2447] hover:text-white">Cancel</Button>
            <Button onClick={() => { setShowClearDialog(false); onClear(); }} className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/80 text-white border-0">Clear canvas</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}