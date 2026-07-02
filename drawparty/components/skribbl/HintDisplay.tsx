"use client";

import type React from "react";
import { useLanguage } from "@/context/LanguageContext";

// ── Props ──────────────────────────────────────────────────────────────────

type HintDisplayProps = {
  /**
   * Current hint string from the server.
   * Format: space-separated tokens, each is either "_" (hidden) or a letter (revealed).
   * Example: "_ _ A _ _" for a 5-letter word with 3rd letter revealed.
   * Drawer receives the full word as hint during DRAWING phase.
   */
  hint: string;
  /** Total character count of the word (includes spaces for multi-word answers) */
  wordLength: number;
  /** Optional category tag, e.g. "Animals", "Food" — shown as a small badge */
  category: string | null;
  /**
   * True when the viewer is the drawer — shows the full word in a different style
   * (no letter boxes; plain text reminding them what they're drawing).
   */
  isDrawer: boolean;
};

// ── Component ──────────────────────────────────────────────────────────────
//
// Layout — GUESSER view:
//
//   ┌─────────────────────────────────────────────────────┐
//   │                                                     │
//   │   [ A ] [   ] [ R ] [   ] [   ]   (5 letters)      │  ← letter boxes
//   │                                                     │
//   │   [🐾 Animals]                                      │  ← category badge (if any)
//   └─────────────────────────────────────────────────────┘
//
// Letter box:
//   - Hidden letter ("_") → empty box with bottom border only (underline style)
//     className: "w-8 h-10 border-b-2 border-white/60 flex items-end justify-center pb-1"
//   - Revealed letter → box with the letter in bold, pop-in animation
//     className: "w-8 h-10 border-b-2 border-[#7B4FBF] flex items-end justify-center pb-1 animate-[letterReveal_0.3s_ease-out]"
//   - Space character → render as a spacer (wider gap between word groups)
//
// Revealed letter animation (inline keyframe — see RewindViewer.tsx for the pattern):
//   @keyframes letterReveal {
//     0%   { transform: translateY(-8px) scale(0.8); opacity: 0; }
//     100% { transform: translateY(0)    scale(1);   opacity: 1; }
//   }
//   Add this as a <style> tag inside the component (same approach as RewindViewer.tsx revealDraw)
//
// Layout — DRAWER view:
//   Skip the letter boxes; just show:
//     "You are drawing: [WORD]" in a purple pill/badge
//     (word text in bold white, pill bg-[#7B4FBF]/20 border border-[#7B4FBF])
//
// Category badge (both views, when category is not null):
//   Small pill below the letter boxes: e.g. "🐾 Animals"
//   bg-[#161228] border border-[#211c38] text-[#7a6f99] text-xs px-3 py-1 rounded-full

export default function HintDisplay({
  hint,
  wordLength,
  category,
  isDrawer,
}: HintDisplayProps): React.ReactElement {
  const { t } = useLanguage();
  const tokens = hint.split(" ");

  if (isDrawer) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="px-4 py-2 rounded-full bg-[#7B4FBF]/20 border border-[#7B4FBF] text-white font-semibold text-lg">
          {t.skribbl.youAreDrawing} <span className="text-[#7B4FBF]">{hint}</span>
        </div>
        {category && (
          <span className="text-xs text-[#7a6f99] bg-[#161228] border border-[#211c38] px-3 py-1 rounded-full">
            {category}
          </span>
        )}
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes letterReveal {
          0%   { transform: translateY(-8px) scale(0.8); opacity: 0; }
          100% { transform: translateY(0)    scale(1);   opacity: 1; }
        }
      `}</style>
      <div className="flex flex-col items-center gap-3">
        <div className="flex flex-wrap gap-2 justify-center">
          {tokens.map((token, i) => {
            if (token === "|") {
              // Word-break spacer — wider gap between word groups
              return <div key={i} className="w-4 mx-1" />;
            }
            const isRevealed = token !== "_";
            return (
              <div
                key={i}
                className={`w-8 h-10 flex items-end justify-center pb-1 font-bold text-lg
                  ${isRevealed
                    ? "border-b-2 border-[#7B4FBF] text-white animate-[letterReveal_0.3s_ease-out]"
                    : "border-b-2 border-white/40 text-transparent"
                  }`}
              >
                {isRevealed ? token.toUpperCase() : ""}
              </div>
            );
          })}
        </div>
        <p className="text-[#7a6f99] text-xs">{t.skribbl.nLetters.replace("{n}", String(wordLength))}</p>
        {category && (
          <span className="text-xs text-[#7a6f99] bg-[#161228] border border-[#211c38] px-3 py-1 rounded-full">
            {category}
          </span>
        )}
      </div>
    </>
  );
}
