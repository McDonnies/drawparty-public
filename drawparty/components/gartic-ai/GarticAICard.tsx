"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createRoom, joinRoom } from "@/lib/api";
import { useLanguage } from "@/context/LanguageContext";
import { useSound } from "@/hooks/useSound";

const ACCENT = "#F5C518";

const STEPS = [
  {
    image: "/tutorial_cards/ai_judge/ai_judge_step_1.png",
    title: "Word Revealed",
    description: "The AI picks a secret word shown only to the current player.",
  },
  {
    image: "/tutorial_cards/ai_judge/ai_judge_step_2.png",
    title: "Draw It Fast",
    description: "Draw the word on the canvas before the countdown runs out.",
  },
  {
    image: "/tutorial_cards/ai_judge/ai_judge_step_3.png",
    title: "AI Judges",
    description: "The AI analyzes your drawing and tries to guess the word.",
  },
  {
    image: "/tutorial_cards/ai_judge/ai_judge_step_4.png",
    title: "Win or Lose a Heart",
    description: "Fool the AI and keep your heart — or lose one if it guesses right.",
  },
  {
    image: "/tutorial_cards/ai_judge/ai_judge_step_5.png",
    title: "Survive as Long as You Can",
    description: "Last player with hearts remaining wins the game.",
  },
];

export function GarticAICard() {
  const router = useRouter();
  const { getToken, isSignedIn } = useAuth();

  const { t } = useLanguage();
  const { play } = useSound();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"play" | "howto">("play");
  const [step, setStep] = useState(0);
  const [guestName, setGuestNameState] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState("");

  function handleOpenChange(val: boolean) {
    setOpen(val);
    if (!val) {
      setView("play");
      setStep(0);
      setError("");
    }
  }

  useEffect(() => {
    if (open && !isSignedIn) {
      import("@/lib/guestId").then(({ getGuestName }) => {
        const saved = getGuestName();
        if (saved) setGuestNameState(saved);
      });
    }
  }, [open, isSignedIn]);

  async function handleCreateRoom() {
    setError("");
    if (!isSignedIn) {
      const { setGuestName } = await import("@/lib/guestId");
      setGuestName(guestName);
    }
    setIsCreating(true);
    try {
      const room = await createRoom(getToken, "GARTIC_PHONE", { aiJudgeMode: true });
      play("joined_lobby_or_game");
      router.push(`/gartic-ai/lobby/${room.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create room");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleJoinRoom() {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) {
      setError(t.garticPhone.roomCodeError);
      return;
    }
    setError("");
    if (!isSignedIn) {
      const { setGuestName } = await import("@/lib/guestId");
      setGuestName(guestName);
    }
    setIsJoining(true);
    try {
      const room = await joinRoom(getToken, code);
      const dest = room.settings.aiJudgeMode
        ? `/gartic-ai/lobby/${room.id}`
        : `/gartic-phone/lobby/${room.id}`;
      router.push(dest);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Room not found");
    } finally {
      setIsJoining(false);
    }
  }

  const currentStep = STEPS[step];
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  return (
    <>
      {/* Card */}
      <div
        onClick={() => setOpen(true)}
        className="game-card cursor-pointer rounded-2xl bg-[#161228] border border-[#211c38] overflow-hidden hover:shadow-[0_20px_60px_rgba(245,197,24,0.15)] group col-span-full"
      >
        <div className="relative h-44 sm:h-52 bg-gradient-to-br from-[#1e1836] to-[#0e0b1a] overflow-hidden flex items-center justify-center">
          <div className="absolute w-40 h-40 bg-[#F5C518]/10 rounded-full blur-2xl top-4 left-1/4 animate-blob" />
          <div className="absolute w-28 h-28 bg-[#FF6B6B]/10 rounded-full blur-2xl bottom-4 right-1/4 animate-blob" style={{ animationDelay: "2s" }} />

          <div className="relative z-10 flex items-center gap-6">
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl" style={{ background: `${ACCENT}1a`, border: `1px solid ${ACCENT}33` }}>
                🤖
              </div>
              <div className="flex gap-1">
                {["❤️", "❤️", "❤️"].map((h, i) => (
                  <span key={i} className="text-base">{h}</span>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              {["Draw it…", "AI guesses:", "🤔 a cat?"].map((text, i) => (
                <div
                  key={i}
                  className="px-3 py-1.5 rounded-lg text-xs font-mono"
                  style={{
                    background: i === 2 ? "rgba(245,197,24,0.1)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${i === 2 ? "rgba(245,197,24,0.25)" : "rgba(255,255,255,0.08)"}`,
                    color: i === 2 ? ACCENT : "#fff",
                  }}
                >
                  {text}
                </div>
              ))}
            </div>
          </div>

          <div className="absolute top-3 right-3 bg-[#F5C518]/20 border border-[#F5C518]/40 text-[#F5C518] text-[10px] font-bold font-syne uppercase tracking-wider px-2.5 py-1 rounded-full">
            AI Judge
          </div>
        </div>

        <div className="p-5">
          <h3 className="font-syne font-bold text-xl text-white group-hover:text-[#F5C518] transition-colors">
            {t.garticAI.aiJudgeMode}
          </h3>
          <p className="text-sm text-[#7a6f99] mt-1.5 leading-relaxed">
            {t.garticAI.collaborativeDesc}
          </p>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-1.5 text-xs text-[#7a6f99]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              2–8 players
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#7a6f99]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F5C518] inline-block" />
              Cooperative
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-[#F5C518] group-hover:translate-x-1 transition-transform">
            {t.garticPhone.playNow}
          </div>
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="bg-[#161228] border border-[#211c38] text-white w-[calc(100vw-2rem)] max-w-sm rounded-2xl p-6">
          <DialogHeader className="pb-0">
            <div className="flex items-center justify-between gap-3">
              {view === "howto" ? (
                <button
                  onClick={() => { setView("play"); setStep(0); }}
                  className="flex items-center gap-1.5 text-sm text-[#7a6f99] hover:text-white transition-colors"
                >
                  {t.garticPhone.back}
                </button>
              ) : (
                <DialogTitle className="font-syne text-white text-xl leading-none">{t.garticAI.aiJudgeMode}</DialogTitle>
              )}
              {view === "play" && (
                <button
                  onClick={() => setView("howto")}
                  className="flex items-center gap-1.5 text-xs text-[#7a6f99] hover:text-[#F5C518] transition-colors flex-shrink-0"
                >
                  <span
                    className="w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold"
                    style={{ borderColor: ACCENT, color: ACCENT }}
                  >
                    ?
                  </span>
                  {t.garticPhone.howToPlay}
                </button>
              )}
              {view === "howto" && (
                <DialogTitle className="font-syne text-white text-lg leading-none">{t.garticPhone.howToPlay}</DialogTitle>
              )}
            </div>
          </DialogHeader>

          {/* Play view */}
          {view === "play" && (
            <div className="flex flex-col gap-5 pt-2">
              {!isSignedIn && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-[#7a6f99]">{t.garticPhone.displayName}</label>
                  <Input
                    value={guestName}
                    onChange={(e) => setGuestNameState(e.target.value.slice(0, 20))}
                    placeholder={t.garticPhone.namePlaceholder}
                    maxLength={20}
                    className="bg-[#0e0b1a] border-[#211c38] text-white focus:border-[#F5C518]"
                  />
                </div>
              )}

              <Button
                onClick={handleCreateRoom}
                disabled={isCreating || isJoining || (!isSignedIn && !guestName.trim())}
                className="w-full hover:opacity-90 text-black font-bold py-5 text-base"
                style={{ background: `linear-gradient(135deg, ${ACCENT}, #e6b800)` }}
              >
                {isCreating ? t.garticPhone.creating : t.garticPhone.createRoom}
              </Button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-[#211c38]" />
                <span className="text-xs text-[#7a6f99]">{t.garticPhone.orJoin}</span>
                <div className="flex-1 h-px bg-[#211c38]" />
              </div>

              <div className="flex gap-2">
                <Input
                  value={joinCode}
                  onChange={(e) => {
                    setJoinCode(e.target.value.toUpperCase().slice(0, 6));
                    setError("");
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter") void handleJoinRoom(); }}
                  placeholder="ABC123"
                  maxLength={6}
                  className="flex-1 bg-[#0e0b1a] border-[#211c38] text-white font-mono text-center tracking-widest uppercase placeholder:normal-case placeholder:tracking-normal focus:border-[#F5C518]"
                />
                <Button
                  onClick={handleJoinRoom}
                  disabled={isJoining || isCreating || joinCode.trim().length !== 6 || (!isSignedIn && !guestName.trim())}
                  variant="outline"
                  className="border-[#211c38] text-white hover:bg-[#1e1836]"
                >
                  {isJoining ? "…" : t.garticPhone.join}
                </Button>
              </div>

              {error && (
                <p className="text-xs text-[#FF6B6B] text-center">{error}</p>
              )}

              {!isSignedIn && (
                <div className="rounded-xl border border-[#211c38] bg-[#0e0b1a]/60 p-3 flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0"
                    style={{ background: `${ACCENT}1a`, border: `1px solid ${ACCENT}33` }}
                  >
                    🏆
                  </div>
                  <p className="text-xs text-[#7a6f99] leading-relaxed">
                    {t.garticPhone.playingAsGuest}{" "}
                    <Link href="/sign-in" className="hover:underline transition-colors" style={{ color: ACCENT }}>
                      {t.nav.signIn}
                    </Link>
                    {" "}·{" "}
                    <Link href="/sign-up" className="hover:underline transition-colors" style={{ color: ACCENT }}>
                      {t.garticPhone.createAccount}
                    </Link>
                    {" "}{t.garticPhone.toSaveStats}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* How-to view */}
          {view === "howto" && (
            <div className="flex flex-col gap-5 pt-2">
              {/* Step card */}
              <div
                className="rounded-xl overflow-hidden text-center"
                style={{ border: `1px solid ${ACCENT}22` }}
              >
                <img
                  src={currentStep.image}
                  alt={currentStep.title}
                  className="w-full h-44 object-contain bg-[#161228]"
                />
                <div className="px-4 py-3 space-y-1.5" style={{ background: `${ACCENT}0d` }}>
                  <p className="text-xs font-mono uppercase tracking-widest" style={{ color: ACCENT }}>
                    Step {step + 1} / {STEPS.length}
                  </p>
                  <h4 className="font-syne font-bold text-white text-base leading-tight">
                    {currentStep.title}
                  </h4>
                  {currentStep.description && (
                    <p className="text-sm text-[#7a6f99] leading-relaxed">{currentStep.description}</p>
                  )}
                </div>
              </div>

              {/* Dot indicators */}
              <div className="flex justify-center gap-2">
                {STEPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setStep(i)}
                    className="w-2 h-2 rounded-full transition-all"
                    style={{
                      background: i === step ? ACCENT : "#211c38",
                      transform: i === step ? "scale(1.3)" : "scale(1)",
                    }}
                    aria-label={`Go to step ${i + 1}`}
                  />
                ))}
              </div>

              {/* Prev / Next */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep((s) => s - 1)}
                  disabled={isFirst}
                  className="flex-1 border-[#211c38] text-[#7a6f99] hover:bg-[#1e1836] hover:text-white disabled:opacity-30"
                >
                  {t.garticPhone.prevStep}
                </Button>
                <Button
                  onClick={() => {
                    if (isLast) { setView("play"); setStep(0); }
                    else setStep((s) => s + 1);
                  }}
                  className="flex-1 text-black font-bold hover:opacity-90"
                  style={{ background: `linear-gradient(135deg, ${ACCENT}, #e6b800)` }}
                >
                  {isLast ? t.garticPhone.letsPlay : t.garticPhone.nextStep}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
