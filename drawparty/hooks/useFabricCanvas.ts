"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Canvas, PencilBrush, Path, Ellipse, Rect, Polygon, FabricImage } from "fabric";
import {
  serializeStroke,
  applyRemoteStroke as applyStrokeUtil,
  compressImageIfNeeded,
  performFloodFill
} from "@/components/canvas/canvasUtils";
import type { FabricStroke } from "@/types/game";

export type CanvasTool = "brush" | "eraser" | "fill" | "circle" | "square" | "rect" | "triangle" | "line";

export type UseFabricCanvasReturn = {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  color: string;
  brushSize: number;
  activeTool: CanvasTool;
  setColor: (color: string) => void;
  setBrushSize: (size: number) => void;
  setActiveTool: (tool: CanvasTool) => void;
  undo: () => void;
  clearCanvas: (opts?: { silent?: boolean }) => void;
  getImageBase64: () => Promise<string>;
  getStrokes: () => FabricStroke[];
  applyRemoteStroke: (stroke: FabricStroke) => void;
  setReadOnly: (readOnly: boolean) => void;
  loadSnapshot: (base64: string) => Promise<void>;
};

/**
 * Initializes and manages a Fabric.js canvas.
 */
export function useFabricCanvas(
  roomId: string,
  onStrokeEmit?: (stroke: FabricStroke) => void
): UseFabricCanvasReturn {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const historyRef = useRef<any[]>([]);

  const onStrokeEmitRef = useRef(onStrokeEmit);
  useEffect(() => {
    onStrokeEmitRef.current = onStrokeEmit;
  }, [onStrokeEmit]);

  const [color, setColorState] = useState<string>("#000000");
  const [brushSize, setBrushSizeState] = useState<number>(4);
  const [activeTool, setActiveToolState] = useState<CanvasTool>("brush");
  const [readOnly, setReadOnlyState] = useState<boolean>(false);

  // État stocké dans une ref pour être accessible dans les événements Fabric (évite les stale closures)
  const stateRef = useRef({ activeTool, color, brushSize, isDrawingShape: false, originX: 0, originY: 0, readOnly: false });
  const activeShapeRef = useRef<any>(null);

  useEffect(() => {
    stateRef.current = { ...stateRef.current, activeTool, color, brushSize, readOnly };
  }, [activeTool, color, brushSize, readOnly]);

  // ── Canvas initialization (on mount) ────────────────────────────────────

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    // React StrictMode double-invokes effects (mount→cleanup→mount). Fabric sets
    // `data-fabric="main"` on the element and throws if it finds that attribute on
    // a second init call. Clear the stale markers left by the first (dev-only)
    // cleanup so the second mount initialises cleanly.
    el.removeAttribute('data-fabric');
    el.classList.remove('lower-canvas');

    // Fixed logical resolution shared by all clients — ensures strokes drawn on any screen
    // size (mobile/desktop) map to the same coordinate space. Fabric scales mouse events
    // correctly via getBoundingClientRect, so CSS display size is independent.
    const width = 800;
    const height = 600;

    const canvas = new Canvas(el, {
      isDrawingMode: true,
      width,
      height,
      backgroundColor: "#ffffff",
      enableRetinaScaling: false,
      selection: false, // Désactive la sélection de groupe par défaut
    });

    const brush = new PencilBrush(canvas);
    brush.color = "#000000";
    brush.width = 4;
    canvas.freeDrawingBrush = brush;

    // Tracking vars for real-time freehand preview
    let isPointerDown = false;
    let previewPoints: { x: number; y: number }[] = [];
    let lastPreviewEmit = 0;
    const PREVIEW_THROTTLE_MS = 33; // ~30fps

    // DESSIN LIBRE
    canvas.on("path:created", (e) => {
      const path = e.path as Path;
      path.set({ selectable: false, evented: false });
      historyRef.current.push(path);

      // Tell receivers to drop the preview before adding the final accurate path
      onStrokeEmitRef.current?.({ type: "preview_end" });
      const stroke = serializeStroke(path);
      onStrokeEmitRef.current?.(stroke);
    });

    // ÉVÉNEMENTS SOURIS (Formes et Pot de peinture)
    canvas.on("mouse:down", async (o) => {
      const { activeTool, color, brushSize } = stateRef.current;

      // Track pointer down for freehand real-time preview
      if (canvas.isDrawingMode) {
        isPointerDown = true;
        const pt = canvas.getScenePoint(o.e);
        previewPoints = [{ x: pt.x, y: pt.y }];
      }

      // On ignore si on est en train de dessiner au pinceau/gomme
      if (canvas.isDrawingMode || activeTool === "brush" || activeTool === "eraser") return;

      const pointer = canvas.getScenePoint(o.e);

      // LOGIQUE FLOOD FILL
      if (activeTool === "fill") {
        document.body.style.cursor = "wait"; 
        
        // Sécurité sur les coordonnées
        const startX = Math.max(0, Math.min(width - 1, Math.round(pointer.x)));
        const startY = Math.max(0, Math.min(height - 1, Math.round(pointer.y)));
        
        const fillBase64 = await performFloodFill(canvas, startX, startY, color);
        
        if (fillBase64) {
          const img = await FabricImage.fromURL(fillBase64.dataUrl);
          // On ancre l'image strictement en haut à gauche
          img.set({ 
            left: 0, 
            top: 0, 
            originX: 'left', 
            originY: 'top', 
            selectable: false, 
            evented: false 
          });
          canvas.add(img);
          historyRef.current.push(img);
          
          const stroke = serializeStroke(img);
          onStrokeEmitRef.current?.(stroke);
        }
        document.body.style.cursor = "default";
        return;
      }

      // LOGIQUE FORMES (Début du tracé)
      stateRef.current.isDrawingShape = true;
      stateRef.current.originX = pointer.x;
      stateRef.current.originY = pointer.y;

      const commonOpts = { 
        stroke: color, 
        strokeWidth: brushSize, 
        fill: "transparent", 
        selectable: false, 
        evented: false, 
        originX: 'left' as const, 
        originY: 'top' as const 
      };

      if (activeTool === "rect" || activeTool === "square") {
        activeShapeRef.current = new Rect({ left: pointer.x, top: pointer.y, width: 0, height: 0, ...commonOpts });
      } else if (activeTool === "circle") {
        activeShapeRef.current = new Ellipse({ left: pointer.x, top: pointer.y, rx: 0, ry: 0, ...commonOpts });
      } else if (activeTool === "triangle") {
        // Polygon initialisé sur le point de départ
        activeShapeRef.current = new Polygon([
          { x: pointer.x, y: pointer.y }, 
          { x: pointer.x, y: pointer.y }, 
          { x: pointer.x, y: pointer.y }
        ], commonOpts);
      }
      
      if (activeShapeRef.current) {
        canvas.add(activeShapeRef.current);
      }
    });

    canvas.on("mouse:move", (o) => {
      // Real-time freehand preview for remote viewers
      if (canvas.isDrawingMode && isPointerDown) {
        const now = Date.now();
        if (now - lastPreviewEmit >= PREVIEW_THROTTLE_MS) {
          lastPreviewEmit = now;
          const pt = canvas.getScenePoint(o.e);
          previewPoints.push({ x: pt.x, y: pt.y });
          if (previewPoints.length >= 2) {
            const pathStr = previewPoints
              .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
              .join(" ");
            onStrokeEmitRef.current?.({
              type: "preview",
              path: pathStr,
              color: stateRef.current.activeTool === "eraser" ? "#ffffff" : stateRef.current.color,
              width: stateRef.current.brushSize,
            });
          }
        }
      }

      if (!stateRef.current.isDrawingShape || !activeShapeRef.current) return;
      
      const pointer = canvas.getScenePoint(o.e);
      const { originX, originY, activeTool } = stateRef.current;
      
      // Shift pour contraindre les proportions. On force le type MouseEvent
      const isShiftHeld = (o.e as MouseEvent).shiftKey === true;

      let w = Math.abs(pointer.x - originX);
      let h = Math.abs(pointer.y - originY);
      
      // Contrainte proportionnelle pour carré OU si shift est maintenu
      if (activeTool === "square" || isShiftHeld) {
        const size = Math.max(w, h);
        w = size; 
        h = size;
      }

      const newLeft = pointer.x < originX ? originX - w : originX;
      const newTop = pointer.y < originY ? originY - h : originY;

      if (activeTool === "rect" || activeTool === "square") {
        activeShapeRef.current.set({ width: w, height: h, left: newLeft, top: newTop });
      } else if (activeTool === "circle") {
        activeShapeRef.current.set({ rx: w / 2, ry: h / 2, left: newLeft, top: newTop });
      } else if (activeTool === "triangle") {
        // On supprime l'ancien triangle de l'aperçu
        canvas.remove(activeShapeRef.current);
        
        // 3 points calculés dynamiquement
        const points = [
          { x: newLeft + w / 2, y: newTop }, // Pointe en haut au centre
          { x: newLeft + w, y: newTop + h }, // Coin inférieur droit
          { x: newLeft, y: newTop + h }      // Coin inférieur gauche
        ];
        
        // On recrée le polygone proprement avec la couleur/taille active
        activeShapeRef.current = new Polygon(points, {
          stroke: stateRef.current.color,
          strokeWidth: stateRef.current.brushSize,
          fill: "transparent",
          selectable: false,
          evented: false,
          originX: 'left',
          originY: 'top'
        });
        
        // On le remet sur le canvas
        canvas.add(activeShapeRef.current);
      }


      canvas.renderAll();
    });

    canvas.on("mouse:up", () => {
      // Reset freehand tracking (path:created handles the final emit)
      isPointerDown = false;
      previewPoints = [];

      if (!stateRef.current.isDrawingShape || !activeShapeRef.current) return;

      stateRef.current.isDrawingShape = false;
      historyRef.current.push(activeShapeRef.current);

      const stroke = serializeStroke(activeShapeRef.current);
      onStrokeEmitRef.current?.(stroke);

      activeShapeRef.current = null;
    });

    fabricRef.current = canvas;

    // Override Fabric's fixed-pixel inline styles so the canvas fills its container responsively.
    // The logical coordinate space stays 800×600; Fabric scales pointer events via getBoundingClientRect.
    const upperEl = (canvas as any).upperCanvasEl as HTMLElement | null;
    const wrapperEl = (canvas as any).wrapperEl as HTMLElement | null;
    const responsiveStyle = { position: "absolute", inset: "0", width: "100%", height: "100%" };
    [el, upperEl, wrapperEl].forEach((elem) => {
      if (elem) Object.assign(elem.style, responsiveStyle);
    });

    return () => {
      canvas.dispose();
      fabricRef.current = null;
    };
  }, []);

  // ── Sync effects ───────────────────────────────────────────────────

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    
    // isDrawingMode ne doit être vrai QUE pour le pinceau ou la gomme
    const isFreehand = activeTool === "brush" || activeTool === "eraser";
    canvas.isDrawingMode = isFreehand && !readOnly;

    if (canvas.freeDrawingBrush && isFreehand) {
      canvas.freeDrawingBrush.color = activeTool === "eraser" ? "#ffffff" : color;
      canvas.freeDrawingBrush.width = brushSize;
    }
  }, [activeTool, color, brushSize, readOnly]);

  // ── Exposed controls ─────────────────────────────────────────────────────

  const setColor = useCallback((c: string) => {
    setColorState(c);
    const canvas = fabricRef.current;
    if (!canvas) return;
    stateRef.current.color = c;
    const { activeTool: tool } = stateRef.current;
    if (canvas.freeDrawingBrush && (tool === "brush" || tool === "eraser")) {
      canvas.freeDrawingBrush.color = tool === "eraser" ? "#ffffff" : c;
    }
  }, []);

  const setBrushSize = useCallback((s: number) => {
    const clamped = Math.min(40, Math.max(1, s));
    setBrushSizeState(clamped);
    const canvas = fabricRef.current;
    if (!canvas) return;
    stateRef.current.brushSize = clamped;
    if (canvas.freeDrawingBrush) canvas.freeDrawingBrush.width = clamped;
  }, []);

  const setActiveTool = useCallback((tool: CanvasTool) => {
    setActiveToolState(tool);
    const canvas = fabricRef.current;
    if (!canvas) return;
    stateRef.current.activeTool = tool;
    const isFreehand = tool === "brush" || tool === "eraser";
    canvas.isDrawingMode = isFreehand && !stateRef.current.readOnly;
    if (canvas.freeDrawingBrush && isFreehand) {
      canvas.freeDrawingBrush.color = tool === "eraser" ? "#ffffff" : stateRef.current.color;
      canvas.freeDrawingBrush.width = stateRef.current.brushSize;
    }
  }, []);

  const undo = useCallback((): void => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const last = historyRef.current.pop();
    if (last) {
      canvas.remove(last);
      canvas.renderAll();
      onStrokeEmitRef.current?.({ type: "undo" } as any);
    }
  }, []);

  const clearCanvas = useCallback((opts?: { silent?: boolean }): void => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.clear();
    canvas.backgroundColor = "#ffffff";
    canvas.renderAll();
    historyRef.current = [];
    if (!opts?.silent) {
      onStrokeEmitRef.current?.({ type: "clear" } as any);
    }
  }, []);

  const getImageBase64 = useCallback(async (): Promise<string> => {
    const canvas = fabricRef.current;
    if (!canvas) return "";
    const dataUrl = canvas.toDataURL({ format: "png", multiplier: 1 });
    return compressImageIfNeeded(dataUrl);
  }, []);

  const getStrokes = useCallback((): FabricStroke[] => {
    return historyRef.current.map(serializeStroke);
  }, []);

  const applyRemoteStroke = useCallback((stroke: FabricStroke): void => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    applyStrokeUtil(canvas, stroke);
  }, []);

  const setReadOnly = useCallback((isReadOnly: boolean): void => {
    setReadOnlyState(isReadOnly);
    stateRef.current.readOnly = isReadOnly;
    const canvas = fabricRef.current;
    if (!canvas) return;
    const { activeTool: tool } = stateRef.current;
    canvas.isDrawingMode = (tool === "brush" || tool === "eraser") && !isReadOnly;
  }, []);

  // Load a flat PNG snapshot as background so the next player draws on top of
  // all previous players' strokes. Clears objects but keeps the snapshot.
  const loadSnapshot = useCallback(async (base64: string): Promise<void> => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.clear();
    canvas.backgroundColor = "#ffffff";
    historyRef.current = [];
    // Skip placeholder blank canvas — just start with a clean white canvas
    const isBlank = !base64 || base64.length < 200;
    if (isBlank) {
      canvas.renderAll();
      return;
    }
    const dataUrl = base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`;
    const img = await FabricImage.fromURL(dataUrl);
    img.set({ left: 0, top: 0, originX: "left", originY: "top", selectable: false, evented: false });
    (canvas as any).backgroundImage = img;
    canvas.renderAll();
  }, []);

  void roomId;

  return {
    canvasRef,
    color,
    brushSize,
    activeTool,
    setColor,
    setBrushSize,
    setActiveTool,
    undo,
    clearCanvas,
    getImageBase64,
    getStrokes,
    applyRemoteStroke,
    setReadOnly,
    loadSnapshot,
  };
}