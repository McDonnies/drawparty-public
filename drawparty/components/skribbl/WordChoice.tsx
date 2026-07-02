"use client";

import { useState } from "react";
import type React from "react";
import { useLanguage } from "@/context/LanguageContext";

// ── Props ──────────────────────────────────────────────────────────────────

type WordChoiceProps = {
  /** The 3 word options sent by the server — always exactly 3 strings */
  words: string[];
  /** Seconds remaining before the server auto-selects words[0] */
  timeLeft: number;
  /** Total seconds for the picking phase — used to compute timer bar width */
  timeLimit: number;
  /** Called when the drawer clicks a word — parent emits skribbl:choose_word */
  onChoose: (wordIndex: number) => void;
};

// ── Component ──────────────────────────────────────────────────────────────
//
// Layout (single centered card, dark palette matching the rest of the game UI):
//
//   ┌──────────────────────────────────────────────────┐
//   │  [====timer bar shrinks left-to-right=========]  │  ← progress bar (see DrawStep.tsx for exact classes)
//   │                                                  │
//   │    Choose a word to draw!                        │  ← heading (text-2xl font-bold text-white)
//   │    You have {timeLeft}s to decide                │  ← countdown (text-[#7a6f99])
//   │                                                  │
//   │  [  apple  ]  [  bicycle  ]  [  volcano  ]      │  ← 3 word buttons (flex gap-4)
//   └──────────────────────────────────────────────────┘
//
// Timer bar behaviour (mirrors gartic-phone/DrawStep.tsx progress bar):
//   width: `${(timeLeft / timeLimit) * 100}%`
//   Color transitions: purple (#7B4FBF) → yellow (timeLeft ≤ 10s) → red + animate-pulse (timeLeft ≤ 5s)
//
// Button states:
//   DEFAULT  (not yet chosen) → bg-[#161228] border-[#7B4FBF] text-white
//                                hover: bg-[#1e1640] ring-2 ring-[#7B4FBF]
//   SELECTED (this button)    → bg-[#7B4FBF] border-[#7B4FBF] text-white scale-105
//   DISABLED (other buttons)  → opacity-50 cursor-not-allowed bg-[#161228] border-[#211c38] text-[#7a6f99]
//
// On click:
//   1. Set local `chosen` state to the clicked index (prevents double-submit)
//   2. Call onChoose(index) — parent emits skribbl:choose_word { roomId, wordIndex: index }
//   3. Parent awaits skribbl:phase_changed { phase: "DRAWING" } to transition away

export default function WordChoice({
  words,
  timeLeft,
  timeLimit,
  onChoose,
}: WordChoiceProps): React.ReactElement {
  const { t } = useLanguage();
  const [chosen, setChosen] = useState<number | null>(null);

  function handleChoose(index: number): void {
    if (chosen !== null) return; // already chose — block double-submit
    setChosen(index);
    onChoose(index);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] gap-6 p-6 w-full max-w-lg mx-auto">

      {/* Timer bar */}
      <div className="w-full h-2 rounded-full bg-[#211c38]">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${
            timeLeft <= 5
              ? "bg-red-500 animate-pulse"
              : timeLeft <= 10
              ? "bg-yellow-400"
              : "bg-[#7B4FBF]"
          }`}
          style={{ width: `${Math.max(0, (timeLeft / timeLimit) * 100)}%` }}
        />
      </div>

      {/* Heading */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">{t.skribbl.chooseWord}</h2>
        <p className="text-[#7a6f99] mt-1 text-sm">{t.skribbl.youHaveNs.replace("{n}", String(timeLeft))}</p>
      </div>

      {/* Word buttons */}
      <div className="flex flex-wrap gap-4 justify-center">
        {words.map((word, index) => (
          <button
            key={index}
            onClick={() => handleChoose(index)}
            disabled={chosen !== null}
            className={`px-8 py-4 rounded-xl font-semibold text-lg border-2 transition-all duration-150
              ${chosen === index
                ? "bg-[#7B4FBF] border-[#7B4FBF] text-white scale-105 shadow-lg shadow-[#7B4FBF]/30"
                : chosen !== null
                  ? "bg-[#161228] border-[#211c38] text-[#7a6f99] opacity-50 cursor-not-allowed"
                  : "bg-[#161228] border-[#7B4FBF] text-white hover:bg-[#1e1640] hover:ring-2 hover:ring-[#7B4FBF] hover:ring-offset-2 hover:ring-offset-[#0e0b1a]"
              }`}
          >
            {word}
          </button>
        ))}
      </div>

    </div>
  );
}
