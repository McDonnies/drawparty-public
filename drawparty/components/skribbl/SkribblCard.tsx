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

const ACCENT = "#3AAFD4";

const STEPS = [
  {
    image: "/tutorial_cards/skribbl/skribbl_step_1.png",
    title: "Join a Room",
    description: "Create a room or join one with friends using a 6-letter code.",
  },
  {
    image: "/tutorial_cards/skribbl/skribbl_step_2.png",
    title: "Pick a Word",
    description: "The active drawer secretly picks one word from three options.",
  },
  {
    image: "/tutorial_cards/skribbl/skribbl_step_3.png",
    title: "Draw It",
    description: "Draw your word on the canvas while everyone watches in real time.",
  },
  {
    image: "/tutorial_cards/skribbl/skribbl_step_4.png",
    title: "Guess Fast",
    description: "Type your guess in the chat — first correct guess scores the most points.",
  },
  {
    image: "/tutorial_cards/skribbl/skribbl_step_5.png",
    title: "Score & Next Round",
    description: "See the leaderboard update, then a new drawer takes the canvas.",
  },
];

export function SkribblCard() {
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
      const room = await createRoom(getToken, "SKRIBBL");
      play("joined_lobby_or_game");
      router.push(`/skribbl/lobby/${room.id}`);
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
      router.push(`/skribbl/lobby/${room.id}`);
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
        className="game-card cursor-pointer rounded-2xl bg-[#161228] border border-[#211c38] overflow-hidden hover:shadow-[0_20px_60px_rgba(58,175,212,0.2)] group"
      >
        <div className="relative h-44 sm:h-52 bg-gradient-to-br from-[#1e1836] to-[#0e0b1a] overflow-hidden flex items-center justify-center">
          <div className="absolute w-32 h-32 bg-[#3AAFD4]/15 rounded-full blur-2xl top-4 right-8 animate-blob" style={{ animationDelay: "1.5s" }} />
          <div className="absolute w-24 h-24 bg-[#7B4FBF]/15 rounded-full blur-2xl bottom-4 left-6 animate-blob" style={{ animationDelay: "4s" }} />

          <div className="relative z-10 flex items-center gap-4">
            <div className="w-28 h-20 sm:w-36 sm:h-24 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center relative overflow-hidden">
              <svg viewBox="0 0 80 60" className="w-full h-full p-2 opacity-70">
                <path d="M10 40 Q20 10 30 35 Q40 55 50 30 Q60 10 70 25" stroke="#7B4FBF" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <circle cx="20" cy="45" r="8" fill="#3AAFD4" opacity="0.6" />
                <rect x="45" y="35" width="20" height="18" rx="3" fill="#F5C518" opacity="0.5" />
              </svg>
            </div>
            <div className="space-y-2">
              {["_ _ _ _ _", "✓ Correct!", "🔥 +150"].map((text, i) => (
                <div
                  key={i}
                  className="px-3 py-1.5 rounded-lg text-xs font-mono"
                  style={{
                    background: i === 1 ? "rgba(58,175,212,0.1)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${i === 1 ? "rgba(58,175,212,0.25)" : "rgba(255,255,255,0.08)"}`,
                    color: i === 1 ? "#3AAFD4" : i === 2 ? "#F5C518" : "#fff",
                  }}
                >
                  {text}
                </div>
              ))}
            </div>
          </div>

          <div className="absolute top-3 right-3 bg-[#3AAFD4]/20 border border-[#3AAFD4]/40 text-[#5ACEF4] text-[10px] font-bold font-syne uppercase tracking-wider px-2.5 py-1 rounded-full">
            Competitive
          </div>
        </div>

        <div className="p-5">
          <h3 className="font-syne font-bold text-xl text-white group-hover:text-[#3AAFD4] transition-colors">
            Skribbl.io
          </h3>
          <p className="text-sm text-[#7a6f99] mt-1.5 leading-relaxed">
            {t.skribbl.desc}
          </p>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-1.5 text-xs text-[#7a6f99]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              {t.skribbl.tags.players}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#7a6f99]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3AAFD4] inline-block" />
              {t.skribbl.tags.type}
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-[#3AAFD4] group-hover:translate-x-1 transition-transform">
            {t.skribbl.playNow}
          </div>
        </div>
      </div>

      {/* Dialog — play view + how-to view inside one modal */}
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
                <DialogTitle className="font-syne text-white text-xl leading-none">Skribbl.io</DialogTitle>
              )}
              {view === "play" && (
                <button
                  onClick={() => setView("howto")}
                  className="flex items-center gap-1.5 text-xs text-[#7a6f99] hover:text-[#3AAFD4] transition-colors flex-shrink-0"
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
                    className="bg-[#0e0b1a] border-[#211c38] text-white focus:border-[#3AAFD4]"
                  />
                </div>
              )}

              <Button
                onClick={handleCreateRoom}
                disabled={isCreating || isJoining || (!isSignedIn && !guestName.trim())}
                className="w-full bg-gradient-to-r from-[#3AAFD4] to-[#7B4FBF] hover:opacity-90 text-white font-bold py-5 text-base"
              >
                {isCreating ? t.skribbl.creating : t.skribbl.createRoom}
              </Button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-[#211c38]" />
                <span className="text-xs text-[#7a6f99]">{t.skribbl.orJoin}</span>
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
                  className="flex-1 bg-[#0e0b1a] border-[#211c38] text-white font-mono text-center tracking-widest uppercase placeholder:normal-case placeholder:tracking-normal focus:border-[#3AAFD4]"
                />
                <Button
                  onClick={handleJoinRoom}
                  disabled={isJoining || isCreating || joinCode.trim().length !== 6 || (!isSignedIn && !guestName.trim())}
                  variant="outline"
                  className="border-[#211c38] text-white hover:bg-[#1e1836]"
                >
                  {isJoining ? "…" : t.skribbl.join}
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
                  ← Prev
                </Button>
                <Button
                  onClick={() => {
                    if (isLast) { setView("play"); setStep(0); }
                    else setStep((s) => s + 1);
                  }}
                  className="flex-1 text-white font-bold hover:opacity-90"
                  style={{ background: `linear-gradient(135deg, ${ACCENT}cc, ${ACCENT})` }}
                >
                  {isLast ? "Let's play!" : "Next →"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
