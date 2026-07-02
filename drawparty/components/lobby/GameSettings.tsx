"use client";

import { useState } from "react";
import type { GameMode, LobbySettings } from "@/types/game";
import { useLanguage } from "@/context/LanguageContext";

// ── Props ──────────────────────────────────────────────────────────────────

type GameSettingsProps = {
  settings: LobbySettings;
  isHost: boolean;
  gameMode: GameMode;
  onSettingsChange: (partial: Partial<LobbySettings>) => void;
};

const selectClass =
  "w-full bg-[#1e1836] border border-[#211c38] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#7B4FBF] disabled:opacity-50 disabled:cursor-not-allowed";

const CATEGORY_OPTIONS = [
  { label: "All categories", value: "" },
  { label: "Animals", value: "animals" },
  { label: "Objects", value: "objects" },
  { label: "Food", value: "food" },
  { label: "Places", value: "places" },
  { label: "Countries", value: "countries" },
  { label: "Actions", value: "actions" },
  { label: "Nature", value: "nature" },
  { label: "Sports", value: "sports" },
  { label: "Clothing", value: "clothing" },
];

const AI_DRAW_TIME_OPTIONS = [10, 15, 20, 30, 45, 60];
const AI_DRAW_TIME_PER_TURN_OPTIONS = [10, 15, 20, 30, 45, 60];
const AI_LIVES_OPTIONS = [1, 2, 3, 4, 5];

// ── Component ──────────────────────────────────────────────────────────────

export function GameSettings({
  settings,
  isHost,
  gameMode,
  onSettingsChange,
}: GameSettingsProps): React.ReactElement {
  const { t } = useLanguage();
  const [customWordsEnabled, setCustomWordsEnabled] = useState<boolean>(
    (settings.customWords ?? []).length > 0
  );

  const currentCategory = (settings.wordCategories ?? [])[0] ?? "";
  const customWordsText = (settings.customWords ?? []).join(", ");
  const aiJudgeEnabled = settings.aiJudgeMode ?? false;


  function handleCustomWordsToggle(enabled: boolean): void {
    setCustomWordsEnabled(enabled);
    if (!enabled) onSettingsChange({ customWords: [] });
  }

  function handleCustomWordsChange(raw: string): void {
    const words = [...new Set(raw.split(",").map((w) => w.trim()).filter(Boolean))];
    onSettingsChange({ customWords: words });
  }

  const hintCount = settings.aiHintLetters ?? 0;

  return (
    <div className="flex flex-col gap-4">

      {/* ── Gartic Phone mode selector (Classic / AI Judge) ── */}
      {gameMode === "GARTIC_PHONE" && (
        <div className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-widest text-[#7a6f99] font-semibold">Mode</span>
          <div className="grid grid-cols-2 gap-2">
            {/* Classic card */}
            <button
              disabled={!isHost}
              onClick={(): void => onSettingsChange({ aiJudgeMode: false })}
              className={`relative flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all disabled:cursor-not-allowed ${
                !aiJudgeEnabled
                  ? "border-[#3AAFD4] bg-[#3AAFD4]/10 shadow-[0_0_12px_rgba(58,175,212,0.2)]"
                  : "border-[#211c38] bg-[#161228] hover:border-[#3AAFD4]/40 disabled:hover:border-[#211c38]"
              }`}
            >
              <div className="flex items-center gap-2 w-full">
                <span className="text-lg">🎭</span>
                <span className={`text-sm font-bold font-syne ${!aiJudgeEnabled ? "text-[#3AAFD4]" : "text-[#c4b5e8]"}`}>
                  {t.settings.modeClassic}
                </span>
                {!aiJudgeEnabled && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-[#3AAFD4] flex-shrink-0" />
                )}
              </div>
              <span className="text-[10px] text-[#7a6f99] leading-tight">{t.settings.modeClassicDesc}</span>
            </button>

            {/* AI Judge card */}
            <button
              disabled={!isHost}
              onClick={(): void => onSettingsChange({ aiJudgeMode: true })}
              className={`relative flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all disabled:cursor-not-allowed ${
                aiJudgeEnabled
                  ? "border-[#7B4FBF] bg-[#7B4FBF]/10 shadow-[0_0_12px_rgba(123,79,191,0.2)]"
                  : "border-[#211c38] bg-[#161228] hover:border-[#7B4FBF]/40 disabled:hover:border-[#211c38]"
              }`}
            >
              <div className="flex items-center gap-2 w-full">
                <span className="text-lg">🤖</span>
                <span className={`text-sm font-bold font-syne ${aiJudgeEnabled ? "text-[#9B6FDF]" : "text-[#c4b5e8]"}`}>
                  {t.settings.modeAiJudge}
                </span>
                {aiJudgeEnabled && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-[#7B4FBF] flex-shrink-0" />
                )}
              </div>
              <span className="text-[10px] text-[#7a6f99] leading-tight">{t.settings.modeAiJudgeDesc}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Players ── */}
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-white shrink-0">{t.settings.players}</span>
        <select
          value={settings.maxPlayers}
          disabled={!isHost}
          onChange={(e): void => onSettingsChange({ maxPlayers: Number(e.target.value) })}
          className={selectClass}
        >
          {[2, 3, 4, 5, 6, 7, 8, 10, 12, 16].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      {/* ── Word language — Skribbl only ── */}
      {gameMode === "SKRIBBL" && (
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-white shrink-0">{t.settings.wordLanguage}</span>
          <select
            value={settings.wordLanguage ?? "en"}
            disabled={!isHost}
            onChange={(e): void => onSettingsChange({ wordLanguage: e.target.value })}
            className={selectClass}
          >
            <option value="en">{t.settings.wordLanguageEn}</option>
            <option value="fr">{t.settings.wordLanguageFr}</option>
            <option value="de">{t.settings.wordLanguageDe}</option>
          </select>
        </div>
      )}

      {/* ── Category filter — Skribbl only ── */}
      {gameMode === "SKRIBBL" && (
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-white shrink-0">{t.settings.category}</span>
          <select
            value={currentCategory}
            disabled={!isHost}
            onChange={(e): void => onSettingsChange({ wordCategories: e.target.value ? [e.target.value] : [] })}
            className={selectClass}
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* ── Draw Time — hidden when AI Judge active ── */}
      {!aiJudgeEnabled && (
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-white shrink-0">{t.settings.drawTime}</span>
          <select
            value={settings.timePerRound}
            disabled={!isHost}
            onChange={(e): void => onSettingsChange({ timePerRound: Number(e.target.value) })}
            className={selectClass}
          >
            {[30, 45, 60, 75, 90, 105, 120].map((s) => (
              <option key={s} value={s}>{s}s</option>
            ))}
          </select>
        </div>
      )}

      {/* ── Rounds — hidden when AI Judge active ── */}
      {!aiJudgeEnabled && (
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-white shrink-0">{t.settings.rounds}</span>
          <select
            value={settings.roundCount}
            disabled={!isHost}
            onChange={(e): void => onSettingsChange({ roundCount: Number(e.target.value) })}
            className={selectClass}
          >
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      )}

      {/* ── Custom words — Skribbl only ── */}
      {gameMode === "SKRIBBL" && (
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={customWordsEnabled}
              disabled={!isHost}
              onChange={(e): void => handleCustomWordsToggle(e.target.checked)}
              className="w-4 h-4 accent-[#7B4FBF] disabled:opacity-50"
            />
            <span className="text-sm text-white">{t.settings.customWords}</span>
          </label>
          {customWordsEnabled && (
            <textarea
              value={customWordsText}
              disabled={!isHost}
              onChange={(e): void => handleCustomWordsChange(e.target.value)}
              placeholder={t.settings.customWordsPlaceholder}
              rows={3}
              className="w-full bg-[#1e1836] border border-[#211c38] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#7B4FBF] disabled:opacity-50 disabled:cursor-not-allowed resize-none placeholder:text-[#7a6f99]"
            />
          )}
        </div>
      )}

      {/* ── AI Player — Skribbl only ── */}
      {gameMode === "SKRIBBL" && (
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={settings.withAI ?? false}
            disabled={!isHost}
            onChange={(e): void => onSettingsChange({ withAI: e.target.checked })}
            className="w-4 h-4 accent-[#7B4FBF] disabled:opacity-50"
          />
          <span className="text-sm text-white">{t.settings.aiPlayer}</span>
          <span className="text-xs text-[#7a6f99]">{t.settings.aiPlayerDesc}</span>
        </label>
      )}

      {/* ── AI Judge sub-settings — Gartic Phone, AI Judge mode only ── */}
      {gameMode === "GARTIC_PHONE" && aiJudgeEnabled && (
        <div className="flex flex-col gap-3 rounded-xl border border-[#7B4FBF]/30 bg-[#7B4FBF]/5 p-3">
          <p className="text-[10px] uppercase tracking-widest text-[#7B4FBF] font-semibold">{t.settings.aiSettings}</p>

          {/* Draw Mode */}
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-[#c4b5e8] shrink-0">{t.settings.drawMode}</span>
            <div className="flex gap-2">
              {(["turn", "shared"] as const).map((mode) => (
                <button
                  key={mode}
                  disabled={!isHost}
                  onClick={(): void => onSettingsChange({ aiDrawMode: mode })}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    (settings.aiDrawMode ?? "turn") === mode
                      ? "border-[#7B4FBF] bg-[#7B4FBF]/20 text-white"
                      : "border-[#211c38] text-[#7a6f99] hover:border-[#7B4FBF]/50"
                  }`}
                >
                  {mode === "turn" ? t.settings.drawModeTurn : t.settings.drawModeShared}
                </button>
              ))}
            </div>
          </div>

          {/* Time per turn / shared draw time */}
          {(settings.aiDrawMode ?? "turn") === "turn" ? (
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-[#c4b5e8] shrink-0">{t.settings.timePerTurn}</span>
              <select
                value={settings.aiDrawTimePerTurn ?? 20}
                disabled={!isHost}
                onChange={(e): void => onSettingsChange({ aiDrawTimePerTurn: Number(e.target.value) })}
                className="bg-[#1e1836] border border-[#211c38] text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#7B4FBF] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {AI_DRAW_TIME_PER_TURN_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}s</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-[#c4b5e8] shrink-0">{t.settings.drawingTime}</span>
              <select
                value={settings.aiDrawTime ?? 20}
                disabled={!isHost}
                onChange={(e): void => onSettingsChange({ aiDrawTime: Number(e.target.value) })}
                className="bg-[#1e1836] border border-[#211c38] text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#7B4FBF] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {AI_DRAW_TIME_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}s</option>
                ))}
              </select>
            </div>
          )}

          {/* AI Lives */}
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-[#c4b5e8] shrink-0">{t.settings.lives}</span>
            <select
              value={settings.aiLives ?? 3}
              disabled={!isHost}
              onChange={(e): void => onSettingsChange({ aiLives: Number(e.target.value) })}
              className="bg-[#1e1836] border border-[#211c38] text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#7B4FBF] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {AI_LIVES_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          {/* AI Word Category */}
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-[#c4b5e8] shrink-0">{t.settings.category}</span>
            <select
              value={settings.aiWordCategory ?? ""}
              disabled={!isHost}
              onChange={(e): void => onSettingsChange({ aiWordCategory: e.target.value })}
              className="bg-[#1e1836] border border-[#211c38] text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#7B4FBF] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* AI Hint Letters */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col">
                <span className="text-xs text-[#c4b5e8]">{t.settings.hintLetters}</span>
                <span className="text-[10px] text-[#7a6f99]">{t.settings.hintLettersDesc}</span>
              </div>
              <div className="flex gap-1">
                {[0, 1, 2, 3].map((n) => (
                  <button
                    key={n}
                    disabled={!isHost}
                    onClick={(): void => onSettingsChange({ aiHintLetters: n })}
                    className={`text-xs w-8 h-8 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-bold ${
                      hintCount === n
                        ? "border-[#7B4FBF] bg-[#7B4FBF]/20 text-white"
                        : "border-[#211c38] text-[#7a6f99] hover:border-[#7B4FBF]/50"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            {hintCount > 0 && (
              <p className="text-[10px] text-[#7a6f99] italic">
                {hintCount === 1
                  ? t.settings.hintLettersCaveat_one.replace("{{n}}", String(hintCount))
                  : t.settings.hintLettersCaveat_other.replace("{{n}}", String(hintCount))}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Read-only notice for non-hosts ── */}
      {!isHost && (
        <p className="text-xs text-[#7a6f99] italic mt-1">
          {t.settings.onlyHostCanChange}
        </p>
      )}
    </div>
  );
}
