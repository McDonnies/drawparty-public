"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type HowToPlayStep = {
  icon: string;
  title: string;
  description: string;
};

type HowToPlayProps = {
  game: string;
  accent: string;
  steps: HowToPlayStep[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function HowToPlay({ game, accent, steps, open, onOpenChange }: HowToPlayProps) {
  const [current, setCurrent] = useState(0);

  const step = steps[current];
  const isFirst = current === 0;
  const isLast = current === steps.length - 1;

  function handleOpenChange(val: boolean) {
    if (!val) setCurrent(0);
    onOpenChange(val);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-[#161228] border border-[#211c38] text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-syne text-white text-xl flex items-center gap-2">
            <span style={{ color: accent }}>?</span> How to Play — {game}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6 pt-2">
          {/* Step card */}
          <div
            className="rounded-xl p-6 flex flex-col items-center gap-3 text-center min-h-[180px] justify-center"
            style={{ background: `${accent}0d`, border: `1px solid ${accent}22` }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
              style={{ background: `${accent}1a`, border: `1px solid ${accent}33` }}
            >
              {step.icon || "✦"}
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-mono uppercase tracking-widest" style={{ color: accent }}>
                Step {current + 1} / {steps.length}
              </p>
              <h4 className="font-syne font-bold text-white text-lg leading-tight">
                {step.title || <span className="text-[#7a6f99]">Coming soon…</span>}
              </h4>
              <p className="text-sm text-[#7a6f99] leading-relaxed">
                {step.description || ""}
              </p>
            </div>
          </div>

          {/* Dot indicators */}
          <div className="flex justify-center gap-2">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className="w-2 h-2 rounded-full transition-all"
                style={{
                  background: i === current ? accent : "#211c38",
                  transform: i === current ? "scale(1.3)" : "scale(1)",
                }}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>

          {/* Prev / Next */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setCurrent((c) => c - 1)}
              disabled={isFirst}
              className="flex-1 border-[#211c38] text-[#7a6f99] hover:bg-[#1e1836] hover:text-white disabled:opacity-30"
            >
              ← Prev
            </Button>
            <Button
              onClick={() => {
                if (isLast) handleOpenChange(false);
                else setCurrent((c) => c + 1);
              }}
              className="flex-1 text-white font-bold hover:opacity-90"
              style={{ background: `linear-gradient(135deg, ${accent}cc, ${accent})` }}
            >
              {isLast ? "Got it!" : "Next →"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
