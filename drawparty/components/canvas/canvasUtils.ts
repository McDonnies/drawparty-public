import { Path, Canvas, Rect, Ellipse, Polygon, FabricImage } from "fabric";
import type { FabricStroke } from "@/types/game";

function hexToRgb(hex: string) {
  const bigint = parseInt(hex.replace("#", ""), 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255, a: 255 };
}

function colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) {
  // Distance euclidienne dans le cube RGB
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

/**
 * Évolution de l'algorithme de remplissage (Flood Fill) :
 * - Algorithme "Scanline Flood Fill" avec Tolérance Dynamique
 * - Dilatation Matérielle floutée pour gérer l'anti-aliasing
 */

export async function performFloodFill(fabricCanvas: Canvas, startX: number, startY: number, fillColorHex: string): Promise<{ dataUrl: string; isWhite: boolean } | null> {
  const currentVpt = fabricCanvas.viewportTransform;

  // On dézoom le canvas de force à x1 pour que les formes soient bien calculées
  fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
  fabricCanvas.renderAll();
  
  // On regarde ce que le joueur voit vraiment à l'écran.
  const visibleCanvas = fabricCanvas.toCanvasElement();
  const ctxVisible = visibleCanvas.getContext("2d", { willReadFrequently: true });
  
  if (!ctxVisible) {
    if (currentVpt) fabricCanvas.setViewportTransform(currentVpt);
    fabricCanvas.renderAll();
    return null;
  }

  const width = visibleCanvas.width;
  const height = visibleCanvas.height;
  const visibleData = ctxVisible.getImageData(0, 0, width, height).data;

  const startIdx = (startY * width + startX) * 4;
  const visR = visibleData[startIdx], visG = visibleData[startIdx + 1], visB = visibleData[startIdx + 2];
  const fillRGB = hexToRgb(fillColorHex);

  const isFillWhite = fillRGB.r === 255 && fillRGB.g === 255 && fillRGB.b === 255;
  const distToVisible = colorDistance(visR, visG, visB, fillRGB.r, fillRGB.g, fillRGB.b);

  // anti-spam : on annule si la couleur cliquée (visible) est déjà la bonne
  if (distToVisible === 0 || (!isFillWhite && distToVisible <= 10)) {
    if (currentVpt) fabricCanvas.setViewportTransform(currentVpt);
    fabricCanvas.renderAll();
    return null; 
  }

  // On cache les anciens remplissages pour ne se baser que sur les traits purs
  // Cela empêche le flou de s'élargir cumulativement à chaque clic
  const fillLayers = fabricCanvas.getObjects().filter(o => (o as any).isFillLayer);
  fillLayers.forEach(layer => layer.set('visible', false));
  fabricCanvas.renderAll();

  const baseCanvas = fabricCanvas.toCanvasElement();
  const ctxBase = baseCanvas.getContext("2d", { willReadFrequently: true });
  const baseData = ctxBase!.getImageData(0, 0, width, height).data;

  fillLayers.forEach(layer => layer.set('visible', true));
  if (currentVpt) fabricCanvas.setViewportTransform(currentVpt);
  fabricCanvas.renderAll();

  const targetR = baseData[startIdx], targetG = baseData[startIdx + 1], targetB = baseData[startIdx + 2];
  const isTargetWhite = targetR > 250 && targetG > 250 && targetB > 250;
  
  // Tolérance Dynamique
  const tolerance = isTargetWhite ? 100 : 10;

  const resultImageData = new ImageData(width, height);
  const resultData = resultImageData.data;
  const visited = new Uint8Array(width * height);
  
  const stack = [startX, startY];

  const match = (x: number, y: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return false;
    const idx1D = y * width + x;
    if (visited[idx1D]) return false;
    
    // On calcule la propagation uniquement par rapport aux traits de base
    const idx4D = idx1D * 4;
    const dist = colorDistance(baseData[idx4D], baseData[idx4D + 1], baseData[idx4D + 2], targetR, targetG, targetB);
    return dist <= tolerance;
  };

  // BOUCLE SCANLINE
  while (stack.length > 0) {
    const y = stack.pop()!;
    let x = stack.pop()!;

    let lx = x;
    while (match(lx - 1, y)) lx--;

    let rx = x;
    while (match(rx, y)) rx++;

    let spanAbove = false;
    let spanBelow = false;

    for (let i = lx; i < rx; i++) {
      const idx1D = y * width + i;
      visited[idx1D] = 1;

      const idx4D = idx1D * 4;
      resultData[idx4D] = fillRGB.r;
      resultData[idx4D + 1] = fillRGB.g;
      resultData[idx4D + 2] = fillRGB.b;
      resultData[idx4D + 3] = 255;

      if (!spanAbove && match(i, y - 1)) {
        stack.push(i, y - 1);
        spanAbove = true;
      } else if (spanAbove && !match(i, y - 1)) {
        spanAbove = false;
      }

      if (!spanBelow && match(i, y + 1)) {
        stack.push(i, y + 1);
        spanBelow = true;
      } else if (spanBelow && !match(i, y + 1)) {
        spanBelow = false;
      }
    }
  }


  // application du blur
  const rawCanvas = document.createElement("canvas");
  rawCanvas.width = width;
  rawCanvas.height = height;
  rawCanvas.getContext("2d")?.putImageData(resultImageData, 0, 0);

  const dilatedCanvas = document.createElement("canvas");
  dilatedCanvas.width = width;
  dilatedCanvas.height = height;
  const dCtx = dilatedCanvas.getContext("2d");

  if (dCtx) {
    dCtx.filter = 'blur(1px)';
    dCtx.drawImage(rawCanvas, 0, 0);
    dCtx.drawImage(rawCanvas, 0, 0);
    dCtx.drawImage(rawCanvas, 0, 0);
    dCtx.drawImage(rawCanvas, 0, 0);
    dCtx.filter = 'none';
  }

  return {
    dataUrl: (dCtx ? dilatedCanvas : rawCanvas).toDataURL("image/png"),
    isWhite: isTargetWhite
  };
}

// ── Image compression ─────────────────────────────────────────────────────

export async function compressImageIfNeeded(base64: string, maxBytes = 2 * 1024 * 1024): Promise<string> {
  const currentBytes = Math.ceil((base64.length * 3) / 4);
  if (currentBytes <= maxBytes) return base64;

  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const offscreenCanvas = document.createElement("canvas");
      offscreenCanvas.width = img.width;
      offscreenCanvas.height = img.height;

      const ctx = offscreenCanvas.getContext("2d");
      if (!ctx) return reject(new Error("Impossible d'obtenir le contexte 2D."));

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
      ctx.drawImage(img, 0, 0);

      let quality = 0.9;
      let compressed = offscreenCanvas.toDataURL("image/jpeg", quality);
      let newSize = Math.ceil((compressed.length * 3) / 4);

      while (newSize > maxBytes && quality > 0.3) {
        quality -= 0.1;
        quality = Math.round(quality * 10) / 10;
        compressed = offscreenCanvas.toDataURL("image/jpeg", quality);
        newSize = Math.ceil((compressed.length * 3) / 4);
      }
      resolve(compressed);
    };
    img.onerror = () => reject(new Error("Erreur lors du chargement de l'image."));
    img.src = base64;
  });
}

// ── Stroke serialization ──────────────────────────────────────────────────

export function serializeStroke(fabricObj: any): FabricStroke {
  if (!fabricObj) return { type: "path", path: "", color: "#000000", width: 1 };

  const type = fabricObj.type;
  const color = fabricObj.stroke || "#000000";
  const width = fabricObj.strokeWidth || 4;

  if (type === "rect") return { type: "path", path: `CUSTOM:rect:${fabricObj.left}:${fabricObj.top}:${fabricObj.width}:${fabricObj.height}`, color, width };
  if (type === "ellipse") return { type: "path", path: `CUSTOM:circle:${fabricObj.left}:${fabricObj.top}:${fabricObj.rx}:${fabricObj.ry}`, color, width };
  if (type === "polygon") {
    const pts = fabricObj.points.map((p: any) => `${p.x},${p.y}`).join("|");
    return { type: "path", path: `CUSTOM:triangle:${pts}:${fabricObj.left}:${fabricObj.top}:${fabricObj.width}:${fabricObj.height}`, color, width };
  }
  if (type === "image") {
    const isW = (fabricObj as any).isWhiteFill ? "1" : "0";
    return { type: "path", path: `CUSTOM:fill:${isW}:${fabricObj.left}:${fabricObj.top}:${fabricObj.getSrc()}`, color, width };
  }

  let pathString = "";
  if (Array.isArray(fabricObj.path)) {
    pathString = fabricObj.path.map((segment: any) => segment.join(" ")).join(" ");
  } else if (typeof fabricObj.path === "string") {
    pathString = fabricObj.path;
  }
  return { type: "path", path: pathString, color, width };
}

export function applyRemoteStroke(canvas: unknown, stroke: FabricStroke): void {
  const fabricCanvas = canvas as Canvas;

  if (stroke.type === "clear") {
    fabricCanvas.clear();
    fabricCanvas.backgroundColor = "#ffffff";
    fabricCanvas.renderAll();
    return;
  }
  if (stroke.type === "undo") {
    const objects = fabricCanvas.getObjects();
    if (objects.length > 0) {
      fabricCanvas.remove(objects[objects.length - 1]);
      fabricCanvas.renderAll();
    }
    return;
  }
  if (stroke.type === "preview_end") {
    const preview = fabricCanvas.getObjects().find((o: any) => o.__isPreview);
    if (preview) { fabricCanvas.remove(preview); fabricCanvas.renderAll(); }
    return;
  }
  if (stroke.type === "preview" && stroke.path) {
    const existing = fabricCanvas.getObjects().find((o: any) => o.__isPreview);
    if (existing) fabricCanvas.remove(existing);
    const p = new Path(stroke.path, {
      stroke: stroke.color,
      strokeWidth: stroke.width,
      fill: "transparent",
      selectable: false,
      evented: false,
      strokeLineCap: "round",
      strokeLineJoin: "round",
    });
    (p as any).__isPreview = true;
    fabricCanvas.add(p);
    fabricCanvas.renderAll();
    return;
  }

  if (stroke.type === "path" && stroke.path) {
    const commonOpts = {
      stroke: stroke.color,
      strokeWidth: stroke.width,
      fill: "transparent",
      selectable: false,
      evented: false,
      originX: 'left' as const,
      originY: 'top' as const,
      strokeLineJoin: 'round' as const,
      objectCaching: false
    };

    if (stroke.path.startsWith("CUSTOM:")) {
      const parts = stroke.path.split(":");
      const customType = parts[1];

      if (customType === "rect") {
        const [_, __, l, t, w, h] = parts;
        fabricCanvas.add(new Rect({ ...commonOpts, left: parseFloat(l), top: parseFloat(t), width: parseFloat(w), height: parseFloat(h) }));
      } 
      else if (customType === "circle") {
        const [_, __, l, t, rx, ry] = parts;
        fabricCanvas.add(new Ellipse({ ...commonOpts, left: parseFloat(l), top: parseFloat(t), rx: parseFloat(rx), ry: parseFloat(ry) }));
      } 
      else if (customType === "triangle") {
        const [_, __, ptsStr, l, t, w, h] = parts;
        const points = ptsStr.split("|").map(p => { 
          const coords = p.split(","); 
          return { x: parseFloat(coords[0]), y: parseFloat(coords[1]) }; 
        });
        const poly = new Polygon(points, commonOpts);
        poly.set({ left: parseFloat(l), top: parseFloat(t), width: parseFloat(w), height: parseFloat(h) });
        fabricCanvas.add(poly);
      } 
      else if (customType === "fill") {
        const isWhiteFill = parts[2] === "1";
        const l = parseFloat(parts[3]);
        const t = parseFloat(parts[4]);
        const src = parts.slice(5).join(":"); 
        
        FabricImage.fromURL(src).then((img) => {
          img.set({ left: l, top: t, originX: 'left', originY: 'top', selectable: false, evented: false });
          (img as any).isFillLayer = true;
          (img as any).isWhiteFill = isWhiteFill;
          fabricCanvas.add(img);     
          fabricCanvas.renderAll();
        });
        return;
      }
    } else {
      fabricCanvas.add(new Path(stroke.path, { ...commonOpts, strokeLineCap: "round", strokeLineJoin: "round", objectCaching: false }));
    }

    fabricCanvas.renderAll();
  }
}

export function getCanvasDimensions(containerWidth: number): { width: number; height: number } {
  const width = Math.min(containerWidth, 800);
  const height = Math.floor(width * 0.75);
  return { width, height };
}