"use client";

import { useState, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import type { RoomPlayerDTO } from "@/types/game";
import { useLanguage } from "@/context/LanguageContext";

// ── Handle ─────────────────────────────────────────────────────────────────
// Exposed via ref so the play page can read the current input on timer expiry.

export type PromptInputHandle = {
  getCurrentValue: () => string;
};

// ── Props ──────────────────────────────────────────────────────────────────

type PromptInputProps = {
  onSubmit: (prompt: string) => void;
  onUnlock: () => void;
  hasSubmitted: boolean;
  donePlayers: Set<string>;
  players: RoomPlayerDTO[];
};

// ── Component ──────────────────────────────────────────────────────────────

export const PromptInput = forwardRef<PromptInputHandle, PromptInputProps>(
  function PromptInput({ onSubmit, onUnlock, hasSubmitted, donePlayers, players }, ref) {
    const { t } = useLanguage();
    const [promptText, setPromptText] = useState<string>("");
    const [validationError, setValidationError] = useState<string>("");

    useImperativeHandle(ref, () => ({ getCurrentValue: () => promptText }), [promptText]);

    function handleSubmit(): void {
      if (promptText.trim() === "") {
        setValidationError(t.garticPhone.pleaseEnterPrompt);
        return;
      }
      setValidationError("");
      onSubmit(promptText.trim());
    }

    const isAtLimit = promptText.length >= 80;
    const readyCount = donePlayers.size + (hasSubmitted ? 1 : 0);
    const totalPlayers = players.length || 1;

    return (
      <div className="flex flex-col gap-3 md:gap-5 w-full max-w-lg mx-auto mt-2 md:mt-8 text-center">

        {/* Instruction */}
        <h2 className="text-xl font-bold font-syne text-white">
          {t.garticPhone.writePrompt}
        </h2>

        {/* Textarea */}
        <textarea
          maxLength={80}
          rows={2}
          placeholder={t.garticPhone.promptPlaceholder}
          value={promptText}
          disabled={hasSubmitted}
          onChange={(e) => {
            setPromptText(e.target.value);
            if (validationError) setValidationError("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !hasSubmitted) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          className="w-full bg-[#161228] border border-[#211c38] focus:border-[#9B6FDF] focus:ring-1 focus:ring-[#9B6FDF] text-white rounded-xl p-4 resize-none transition-colors outline-none text-lg text-left disabled:opacity-50 disabled:cursor-not-allowed"
        />

        {/* Error + counter row */}
        <div className="flex justify-between items-center px-1 h-5">
          <span className="text-xs text-[#FF6B6B] font-medium">{validationError}</span>
          <span className={`text-xs font-mono transition-colors ${isAtLimit ? "text-[#FF6B6B]" : "text-[#7a6f99]"}`}>
            {promptText.length}/80
          </span>
        </div>

        {/* Ready count — visible to all as soon as anyone locks in */}
        {(donePlayers.size > 0 || hasSubmitted) && (
          <p className="text-sm text-[#7a6f99]">
            {t.garticPhone.lockedIn.replace("{n}", String(readyCount)).replace("{m}", String(totalPlayers))}
          </p>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          {hasSubmitted ? (
            <>
              <Button
                disabled
                className="flex-1 bg-gradient-to-r from-[#7B4FBF] to-[#3AAFD4] text-white font-bold py-3 md:py-6 text-lg rounded-xl opacity-60"
              >
                {t.garticPhone.lockedInBtn}
              </Button>
              <Button
                onClick={onUnlock}
                variant="outline"
                className="border-[#211c38] text-[#9B6FDF] hover:bg-[#1e1836] py-3 md:py-6 px-4 md:px-5 rounded-xl"
              >
                {t.garticPhone.modify}
              </Button>
            </>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={promptText.trim() === ""}
              className="flex-1 bg-gradient-to-r from-[#7B4FBF] to-[#3AAFD4] hover:opacity-90 text-white font-bold py-3 md:py-6 text-lg rounded-xl transition-all disabled:opacity-40"
            >
              {t.garticPhone.lockIn}
            </Button>
          )}
        </div>

      </div>
    );
  }
);
