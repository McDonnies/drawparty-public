import type { GarticChainDTO, GarticChainStepDTO, FabricStroke } from "@/types/game";

const STEP_W = 240;
const DRAW_H = 180; // 240 × (600/800) to preserve 4:3 ratio
const LABEL_H = 36;
const STEP_H = DRAW_H + LABEL_H;
const STEP_GAP = 12;
const CHAIN_HEADER_H = 40;
const CHAIN_H = CHAIN_HEADER_H + STEP_H;
const CHAIN_GAP = 20;
const OUTER_PAD = 24;
const TITLE_H = 56;

const BG = "#0e0b1a";
const CARD_BG = "#1a1530";
const ACCENT = "#9B6FDF";
const TEXT_WHITE = "#ffffff";
const TEXT_MUTED = "#7a6f99";

function resolveStrokes(raw: FabricStroke[]): FabricStroke[] {
  const result: FabricStroke[] = [];
  for (const s of raw) {
    if (s.type === "undo") {
      for (let i = result.length - 1; i >= 0; i--) {
        if (result[i].type === "path" || result[i].type === "clear") {
          result.splice(i, 1);
          break;
        }
      }
    } else if (s.type === "path" || s.type === "clear") {
      result.push(s);
    }
  }
  return result;
}

async function renderStrokesToCanvas(strokes: FabricStroke[]): Promise<HTMLCanvasElement> {
  const LW = 800;
  const LH = 600;
  const offscreen = document.createElement("canvas");
  offscreen.width = LW;
  offscreen.height = LH;
  const ctx = offscreen.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, LW, LH);

  for (const stroke of resolveStrokes(strokes)) {
    if (stroke.type === "clear") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, LW, LH);
      continue;
    }
    if (stroke.type !== "path" || !stroke.path) continue;

    ctx.strokeStyle = stroke.color ?? "#000000";
    ctx.lineWidth = stroke.width ?? 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (stroke.path.startsWith("CUSTOM:")) {
      const parts = stroke.path.split(":");
      const kind = parts[1];
      if (kind === "rect") {
        const [, , l, t, w, h] = parts;
        ctx.strokeRect(parseFloat(l), parseFloat(t), parseFloat(w), parseFloat(h));
      } else if (kind === "circle") {
        const [, , l, t, rx, ry] = parts;
        ctx.beginPath();
        ctx.ellipse(parseFloat(l) + parseFloat(rx), parseFloat(t) + parseFloat(ry), parseFloat(rx), parseFloat(ry), 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (kind === "triangle") {
        const ptsStr = parts[2];
        const pts = ptsStr.split("|").map((p) => {
          const [x, y] = p.split(",");
          return { x: parseFloat(x), y: parseFloat(y) };
        });
        if (pts.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
          ctx.closePath();
          ctx.stroke();
        }
      } else if (kind === "fill") {
        const src = parts.slice(5).join(":");
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => { ctx.drawImage(img, 0, 0, LW, LH); resolve(); };
          img.onerror = () => resolve();
          img.src = src;
        });
      }
    } else {
      try {
        ctx.stroke(new Path2D(stroke.path));
      } catch {
        // invalid path — skip
      }
    }
  }

  return offscreen;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, cx: number, startY: number, maxW: number, lineH: number): void {
  const words = text.split(" ");
  let line = "";
  let y = startY;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxW && line) {
      ctx.fillText(line, cx, y);
      line = word;
      y += lineH;
    } else {
      line = candidate;
    }
  }
  if (line) ctx.fillText(line, cx, y);
}

async function drawStep(ctx: CanvasRenderingContext2D, step: GarticChainStepDTO, x: number, y: number): Promise<void> {
  roundRect(ctx, x, y, STEP_W, DRAW_H, 8);
  ctx.fillStyle = CARD_BG;
  ctx.fill();

  if (step.type === "DRAW") {
    if (step.imageBase64) {
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          ctx.save();
          roundRect(ctx, x, y, STEP_W, DRAW_H, 8);
          ctx.clip();
          ctx.drawImage(img, x, y, STEP_W, DRAW_H);
          ctx.restore();
          resolve();
        };
        img.onerror = () => resolve();
        img.src = step.imageBase64!;
      });
    } else if (step.strokeData) {
      const strokes: FabricStroke[] = (() => {
        try { return JSON.parse(step.strokeData) as FabricStroke[]; } catch { return []; }
      })();
      if (strokes.length > 0) {
        const drawn = await renderStrokesToCanvas(strokes);
        ctx.save();
        roundRect(ctx, x, y, STEP_W, DRAW_H, 8);
        ctx.clip();
        ctx.drawImage(drawn, x, y, STEP_W, DRAW_H);
        ctx.restore();
      } else {
        ctx.fillStyle = TEXT_MUTED;
        ctx.font = "11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("No drawing", x + STEP_W / 2, y + DRAW_H / 2);
      }
    } else {
      ctx.fillStyle = TEXT_MUTED;
      ctx.font = "11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("No drawing", x + STEP_W / 2, y + DRAW_H / 2);
    }
  } else {
    const isPrompt = step.type === "PROMPT";
    const badgeW = isPrompt ? 54 : 66;

    // Badge
    roundRect(ctx, x + 8, y + 8, badgeW, 20, 4);
    ctx.fillStyle = isPrompt ? "#7B4FBF" : "#3AAFD4";
    ctx.fill();
    ctx.fillStyle = TEXT_WHITE;
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(isPrompt ? "PROMPT" : "DESCRIBE", x + 12, y + 22);

    // Text
    const text = step.content ?? "";
    ctx.fillStyle = TEXT_WHITE;
    ctx.font = "13px sans-serif";
    ctx.textAlign = "center";
    const lineH = 18;
    const lines = Math.ceil(text.length / 22) || 1;
    const blockH = lines * lineH;
    wrapText(ctx, text, x + STEP_W / 2, y + (DRAW_H - blockH) / 2 + 6, STEP_W - 24, lineH);
  }

  // Author label
  ctx.fillStyle = TEXT_MUTED;
  ctx.font = "11px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`by ${step.authorUsername}`, x + STEP_W / 2, y + DRAW_H + 22);
}

export async function generateGarticCollage(chains: GarticChainDTO[]): Promise<string> {
  if (chains.length === 0) throw new Error("No chains to export");

  const maxSteps = Math.max(...chains.map((c) => c.steps.length));
  const canvasW = OUTER_PAD * 2 + maxSteps * STEP_W + Math.max(0, maxSteps - 1) * STEP_GAP;
  const canvasH = OUTER_PAD + TITLE_H + chains.length * CHAIN_H + Math.max(0, chains.length - 1) * CHAIN_GAP + OUTER_PAD;

  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d")!;

  // Background
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Title
  ctx.fillStyle = TEXT_WHITE;
  ctx.font = "bold 22px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("DrawParty — Gartic Phone", canvasW / 2, OUTER_PAD + 28);

  ctx.fillStyle = ACCENT;
  ctx.fillRect(canvasW / 2 - 70, OUTER_PAD + 36, 140, 3);

  // Chains
  for (let ci = 0; ci < chains.length; ci++) {
    const chain = chains[ci];
    const chainY = OUTER_PAD + TITLE_H + ci * (CHAIN_H + CHAIN_GAP);

    // Header background
    roundRect(ctx, OUTER_PAD, chainY, canvasW - OUTER_PAD * 2, CHAIN_HEADER_H, 8);
    ctx.fillStyle = "#211c38";
    ctx.fill();

    // Accent left bar
    roundRect(ctx, OUTER_PAD, chainY, 4, CHAIN_HEADER_H, 2);
    ctx.fillStyle = ACCENT;
    ctx.fill();

    ctx.fillStyle = TEXT_WHITE;
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`${chain.ownerUsername}'s chain`, OUTER_PAD + 16, chainY + 25);

    // Steps
    for (let si = 0; si < chain.steps.length; si++) {
      const stepX = OUTER_PAD + si * (STEP_W + STEP_GAP);
      const stepY = chainY + CHAIN_HEADER_H;
      await drawStep(ctx, chain.steps[si], stepX, stepY);
    }
  }

  return canvas.toDataURL("image/png");
}
