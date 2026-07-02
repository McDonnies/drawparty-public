"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import type { SkribblPhase } from "@/types/game";
import type React from "react";
import { useLanguage } from "@/context/LanguageContext";

type GuessInputProps = {
  onSubmit: (guess: string) => void;
  isCorrect: boolean;
  isDrawer: boolean;
  phase: SkribblPhase;
  onChatMessage?: (msg: string) => void;
};

export default function GuessInput({
  onSubmit,
  isCorrect,
  isDrawer,
  phase,
  onChatMessage,
}: GuessInputProps): React.ReactElement | null {
  const { t } = useLanguage();
  const [value, setValue] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(): void {
    const trimmed = value.trim();
    if (trimmed === "") return;
    if (isDrawer) {
      onChatMessage?.(trimmed);
    } else {
      onSubmit(trimmed);
    }
    setValue("");
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  // Drawer — always chat input (during DRAWING, PICKING_WORD, ROUND_END)
  if (isDrawer) {
    return (
      <div className="flex gap-2 w-full">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={100}
          placeholder={t.skribbl.chatPlaceholder}
          className="flex-1 bg-[#161228] border border-[#3AAFD4]/40 rounded-lg px-4 py-2 text-white placeholder-[#7a6f99] focus:outline-none focus:ring-2 focus:ring-[#3AAFD4] text-sm"
        />
        <Button
          onClick={handleSubmit}
          disabled={value.trim() === ""}
          className="bg-[#3AAFD4] hover:bg-[#3AAFD4]/80 text-white px-5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t.skribbl.send}
        </Button>
      </div>
    );
  }

  // Non-drawer outside DRAWING — hide
  if (phase !== "DRAWING") {
    return null;
  }

  if (isCorrect) {
    return (
      <div className="flex items-center justify-center h-12">
        <span className="text-emerald-400 font-semibold text-lg">{t.skribbl.wellDone}</span>
      </div>
    );
  }

  return (
    <div className="flex gap-2 w-full">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        maxLength={50}
        placeholder={t.skribbl.guessPlaceholder}
        className="flex-1 bg-[#161228] border border-[#211c38] rounded-lg px-4 py-2 text-white placeholder-[#7a6f99] focus:outline-none focus:ring-2 focus:ring-[#7B4FBF] text-sm"
      />
      <Button
        onClick={handleSubmit}
        disabled={value.trim() === ""}
        className="bg-[#7B4FBF] hover:bg-[#9B6FDF] text-white px-5 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {t.skribbl.send}
      </Button>
    </div>
  );
}
