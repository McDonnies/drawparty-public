"use client";

import { useState, useEffect, useRef } from "react";
import { Canvas } from "fabric";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { applyRemoteStroke } from "@/components/canvas/canvasUtils";
import type { GarticChainDTO, GarticChainStepDTO, FabricStroke, StepRating } from "@/types/game";
import type { AppSocket } from "@/hooks/useSocket";
import { useLanguage } from "@/context/LanguageContext";

// ── Props ──────────────────────────────────────────────────────────────────

type RewindViewerProps = {
  chains: GarticChainDTO[];
  socket: AppSocket | null;
  isHost: boolean;
  roomId: string;
};

// ── Stroke Replay Canvas ──────────────────────────────────────────────────
// Replays a drawing stroke by stroke when fresh=true, or renders all at once when false.

type StrokeReplayCanvasProps = {
  strokes: FabricStroke[];
  fresh: boolean;
};

export function StrokeReplayCanvas({ strokes, fresh }: StrokeReplayCanvasProps): React.ReactElement {
  const canvasElRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvasElRef.current;
    if (!el) return;

    // Read container dimensions so the internal resolution matches the display size
    const containerWidth = el.parentElement?.clientWidth ?? 800;
    const containerHeight = Math.round(containerWidth * (600 / 800));

    const canvas = new Canvas(el, {
      isDrawingMode: false,
      width: containerWidth,
      height: containerHeight,
      backgroundColor: "#ffffff",
      enableRetinaScaling: false,
    });

    // Strokes are stored in 800×600 coords (draw canvas size) — zoom rescales to container
    canvas.setZoom(containerWidth / 800);
    canvas.setDimensions({ width: containerWidth, height: containerHeight });

    let cancelled = false;

    if (!fresh || strokes.length === 0) {
      // Apply all strokes immediately
      for (const stroke of strokes) {
        applyRemoteStroke(canvas, stroke);
      }
      canvas.renderAll();
    } else {
      // Animate strokes one by one with 40ms delay
      const applyNext = (index: number) => {
        if (cancelled || index >= strokes.length) return;
        applyRemoteStroke(canvas, strokes[index]);
        canvas.renderAll();
        setTimeout(() => applyNext(index + 1), 40);
      };
      applyNext(0);
    }

    return () => {
      cancelled = true;
      canvas.dispose();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount only — strokes and fresh are stable per step reveal

  return (
    <div className="bg-white rounded-xl overflow-hidden border border-[#211c38] w-full max-w-[640px]">
      <canvas ref={canvasElRef} style={{ width: "100%", aspectRatio: "4/3", display: "block" }} />
    </div>
  );
}

// ── Typing Indicator ───────────────────────────────────────────────────────

function TypingIndicator(): React.ReactElement {
  return (
    <div className="flex gap-1 items-center p-3 bg-[#1e1836] rounded-2xl w-14 h-10">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-[#7a6f99] animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

// ── Rating Badge ───────────────────────────────────────────────────────────

const RATING_META: Record<StepRating, { color: string; bg: string }> = {
  GREEN:  { color: "#22c55e", bg: "rgba(34,197,94,0.15)"  },
  YELLOW: { color: "#eab308", bg: "rgba(234,179,8,0.15)"  },
  RED:    { color: "#DC2626", bg: "rgba(220,38,38,0.15)"  },
};

function RatingBadge({ rating }: { rating: StepRating }): React.ReactElement {
  const { t } = useLanguage();
  const { color, bg } = RATING_META[rating];
  const label = rating === "GREEN" ? t.garticPhone.ratingGreen : rating === "YELLOW" ? t.garticPhone.ratingYellow : t.garticPhone.ratingRed;
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border"
      style={{ color, background: bg, borderColor: color, fontFamily: "'DM Sans', sans-serif" }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
      {label}
    </span>
  );
}

// ── Step Item ─────────────────────────────────────────────────────────────

type StepItemProps = {
  step: GarticChainStepDTO;
  fresh: boolean;
};

function StepItem({ step, fresh }: StepItemProps): React.ReactElement {
  const { t } = useLanguage();
  if (step.type === "DRAW") {
    const strokes: FabricStroke[] = step.strokeData
      ? (() => { try { return JSON.parse(step.strokeData) as FabricStroke[]; } catch { return []; } })()
      : [];

    return (
      <div className="flex flex-col gap-2" style={fresh ? { animation: "fadeIn 0.35s ease-out forwards" } : undefined}>
        <div className="flex items-center gap-2">
          <Avatar className="w-6 h-6 shrink-0">
            <AvatarFallback className="text-[10px] bg-[#7B4FBF] text-white">
              {step.authorUsername.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-[#7a6f99]">{step.authorUsername} {t.garticPhone.drew}</span>
        </div>
        {strokes.length > 0 ? (
          <StrokeReplayCanvas strokes={strokes} fresh={fresh} />
        ) : step.imageBase64 !== null ? (
          <div className="bg-white rounded-xl overflow-hidden border border-[#211c38] w-full max-w-[640px]">
            <img
              src={step.imageBase64}
              alt={`Drawing by ${step.authorUsername}`}
              className="w-full aspect-[4/3] object-contain"
              style={fresh ? { animation: "revealDraw 2.5s ease-in-out forwards" } : undefined}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-32 bg-[#1e1836] rounded-xl border border-[#211c38] text-[#7a6f99] text-sm">
            {t.garticPhone.playerDisconnected}
          </div>
        )}
      </div>
    );
  }

  // PROMPT or DESCRIBE — right-aligned chat bubble
  return (
    <div
      className="flex flex-col items-end gap-2"
      style={fresh ? { animation: "fadeIn 0.35s ease-out forwards" } : undefined}
    >
      <div className="flex items-center gap-2">
        <span className="text-xs text-[#7a6f99]">
          {step.authorUsername} {t.garticPhone.said}
        </span>
        <Avatar className="w-6 h-6 shrink-0">
          <AvatarFallback className="text-[10px] bg-[#3AAFD4] text-white">
            {step.authorUsername.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>
      <div className="flex flex-col items-end gap-1">
        <div className="bg-[#9B6FDF] rounded-2xl rounded-tr-sm px-4 py-3 max-w-[360px]">
          <p className="text-sm text-white leading-relaxed break-words">
            {step.content ?? <span className="italic opacity-70">No content</span>}
          </p>
        </div>
        {step.rating && <RatingBadge rating={step.rating} />}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export function RewindViewer({ chains, socket, isHost, roomId }: RewindViewerProps): React.ReactElement | null {
  const { t } = useLanguage();
  const [chainIndex, setChainIndex] = useState<number>(0);
  const [visibleSteps, setVisibleSteps] = useState<number>(0);
  const [showTyping, setShowTyping] = useState<boolean>(false);

  const t1 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t2 = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentChain: GarticChainDTO | undefined = chains[chainIndex];

  function clearTimers(): void {
    if (t1.current) { clearTimeout(t1.current); t1.current = null; }
    if (t2.current) { clearTimeout(t2.current); t2.current = null; }
  }

  // Reset steps when chain advances
  useEffect(() => {
    clearTimers();
    setVisibleSteps(0);
    setShowTyping(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainIndex]);

  // Auto-reveal sequence: pause → typing (1.5s) → reveal → 3s → typing → reveal …
  useEffect(() => {
    if (!currentChain) return;
    if (visibleSteps >= currentChain.steps.length) {
      setShowTyping(false);
      return;
    }

    const pauseMs = visibleSteps === 0 ? 500 : 3000;

    t1.current = setTimeout(() => {
      setShowTyping(true);
      t2.current = setTimeout(() => {
        setShowTyping(false);
        setVisibleSteps((prev) => prev + 1);
      }, 1500);
    }, pauseMs);

    return clearTimers;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleSteps, chainIndex]);

  // Host-controlled chain advance
  useEffect(() => {
    if (!socket) return;
    const onNext = (): void => setChainIndex((prev) => prev + 1);
    socket.on("gartic:rewind_next", onNext);
    return () => { socket.off("gartic:rewind_next", onNext); };
  }, [socket]);

  if (chains.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-[#7a6f99] text-sm">
        No chains to display.
      </div>
    );
  }

  if (chainIndex >= chains.length) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <span className="text-3xl">🎉</span>
        <p className="text-sm text-[#7a6f99]">{t.garticPhone.allChainsRevealed}</p>
      </div>
    );
  }

  if (!currentChain) return null;

  const allStepsShown = visibleSteps >= currentChain.steps.length;
  const isLastChain = chainIndex >= chains.length - 1;

  return (
    <>
      <style>{`
        @keyframes revealDraw {
          from { clip-path: inset(0 100% 0 0); }
          to   { clip-path: inset(0 0% 0 0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="flex flex-col gap-6">

        {/* ── CHAIN HEADER ─────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-[#7a6f99] uppercase tracking-widest font-mono">
              {t.garticPhone.chainN.replace("{n}", String(chainIndex + 1)).replace("{m}", String(chains.length))}
            </span>
            <span className="text-base font-bold font-syne text-white">
              {t.garticPhone.ownerStory.replace("{n}", currentChain.ownerUsername)}
            </span>
          </div>
        </div>

        {/* ── STEPS ────────────────────────────────────────── */}
        <div className="flex flex-col gap-5 min-h-[120px]">
          {currentChain.steps.slice(0, visibleSteps).map((step, index) => (
            <StepItem
              key={`${currentChain.chainId}-${index}`}
              step={step}
              fresh={index === visibleSteps - 1}
            />
          ))}

          {showTyping && (
            <div className={`flex ${visibleSteps % 2 === 1 ? "justify-start" : "justify-end"}`}>
              <TypingIndicator />
            </div>
          )}
        </div>

        {/* ── HOST NEXT BUTTON ─────────────────────────────── */}
        {isHost && allStepsShown && (
          <div className="flex justify-center pt-2">
            <Button
              onClick={() => {
                if (isLastChain) {
                  socket?.emit("gartic:end_rewind", { roomId });
                } else {
                  socket?.emit("gartic:rewind_next", { roomId });
                }
              }}
              className="bg-gradient-to-r from-[#7B4FBF] to-[#3AAFD4] text-white font-bold px-8 py-3"
            >
              {isLastChain ? t.garticPhone.finishRewind : t.garticPhone.nextChain}
            </Button>
          </div>
        )}

        {!isHost && allStepsShown && !isLastChain && (
          <p className="text-xs text-[#7a6f99] text-center animate-pulse">
            {t.garticPhone.waitingHostContinue}
          </p>
        )}
      </div>
    </>
  );
}