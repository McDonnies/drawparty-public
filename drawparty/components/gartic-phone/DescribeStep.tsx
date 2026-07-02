"use client";

import { useState, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import type { RoomPlayerDTO } from "@/types/game";
import { useLanguage } from "@/context/LanguageContext";

// ── Handle ─────────────────────────────────────────────────────────────────

export type DescribeStepHandle = {
  getCurrentValue: () => string;
};

// ── Props ──────────────────────────────────────────────────────────────────

type DescribeStepProps = {
  imageBase64: string;
  timeLeft: number;
  currentRound: number;
  totalRounds: number;
  onSubmit: (description: string) => void;
  onUnlock: () => void;
  hasSubmitted: boolean;
  donePlayers: Set<string>;
  players: RoomPlayerDTO[];
};

// ── Component ──────────────────────────────────────────────────────────────

export const DescribeStep = forwardRef<DescribeStepHandle, DescribeStepProps>(
  function DescribeStep({ imageBase64, timeLeft, currentRound, totalRounds, onSubmit, onUnlock, hasSubmitted, donePlayers, players }, ref) {
    const { t } = useLanguage();
    const [descriptionText, setDescriptionText] = useState<string>("");
    const descWordCount = descriptionText.trim() === "" ? 0 : descriptionText.trim().split(/\s+/).length;
    const [validationError, setValidationError] = useState<string>("");

    useImperativeHandle(ref, () => ({ getCurrentValue: () => descriptionText }), [descriptionText]);

    function handleSubmit(): void {
      if (descriptionText.trim() === "") {
        setValidationError(t.garticPhone.pleaseDescribe);
        return;
      }
      setValidationError("");
      onSubmit(descriptionText.trim());
    }

    const isAtLimit = descriptionText.length >= 80;
    const readyCount = donePlayers.size + (hasSubmitted ? 1 : 0);
    const totalPlayers = players.length || 1;

    return (
      <div className="flex flex-col gap-3 md:gap-5 w-full max-w-2xl mx-auto mt-1 md:mt-4">

        {/* --- HEADER --- */}
        <div className="flex items-center gap-4 w-full">
          {/* Round pill */}
          <div className="bg-white text-[#161228] font-bold py-1.5 px-4 rounded-lg text-sm">
            {currentRound}/{totalRounds}
          </div>

          {/* Time progress bar */}
          <div className="flex-1 h-3 bg-[#211c38] rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-1000 ease-linear"
              style={{ width: `${(timeLeft / 45) * 100}%` }}
            />
          </div>
        </div>

        <h2 className="text-xl font-bold text-white font-syne text-center mt-2">
          {t.garticPhone.describeDrawing}
        </h2>

        {/* Drawing to describe */}
        <div className="w-full bg-white rounded-xl overflow-hidden border-2 border-[#211c38] shadow-lg flex items-center justify-center">
          {imageBase64 ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={imageBase64}
              alt="Drawing to describe"
              className="w-full max-h-[min(260px,28vh)] object-contain"
            />
          ) : (
            <span className="text-[#b0a8c4] font-syne animate-pulse">{t.garticPhone.loadingDrawing}</span>
          )}
        </div>

        <div className="flex flex-col gap-2 mt-2">
          <textarea
            maxLength={80}
            rows={2}
            placeholder={t.garticPhone.writeSentence}
            value={descriptionText}
            disabled={hasSubmitted}
            onChange={(e) => {
              setDescriptionText(e.target.value);
              if (validationError) setValidationError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !hasSubmitted) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            className="w-full bg-[#161228] border border-[#211c38] focus:border-[#3AAFD4] focus:ring-1 focus:ring-[#3AAFD4] text-white rounded-xl p-4 resize-none transition-colors outline-none text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          />

          <div className="flex justify-between items-center px-1 h-5">
            <span className="text-xs text-[#FF6B6B] font-medium">{validationError}</span>
            <span className={`text-xs font-mono transition-colors ${isAtLimit ? "text-[#FF6B6B]" : "text-[#7a6f99]"}`}>
              {descriptionText.length}/80
            </span>
          </div>
        </div>

        {/* Ready count — visible to all as soon as anyone locks in */}
        {(donePlayers.size > 0 || hasSubmitted) && (
          <p className="text-sm text-[#7a6f99] text-center">
            {t.garticPhone.lockedIn.replace("{n}", String(readyCount)).replace("{m}", String(totalPlayers))}
          </p>
        )}

        {/* Submit / Modify */}
        <div className="flex gap-3">
          {hasSubmitted ? (
            <>
              <Button
                disabled
                className="flex-1 bg-gradient-to-r from-[#3AAFD4] to-[#7B4FBF] text-white font-bold py-3 md:py-6 text-lg rounded-xl opacity-60"
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
              disabled={descriptionText.trim() === ""}
              className="w-full bg-gradient-to-r from-[#3AAFD4] to-[#7B4FBF] hover:opacity-90 text-white font-bold py-3 md:py-6 text-lg rounded-xl transition-all disabled:opacity-40"
            >
              {t.garticPhone.lockIn}
            </Button>
          )}
        </div>

      </div>
    );
  }
);
