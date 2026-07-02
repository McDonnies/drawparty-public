"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useSocket } from "@/hooks/useSocket";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import type { GarticAIGameOverDTO } from "@/types/game";
import { Trophy, RotateCcw, X, ChevronDown, ChevronUp } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

type Round = GarticAIGameOverDTO["rounds"][number];

function DrawingCard({ round, index, onClick }: { round: Round; index: number; onClick: () => void }) {
  const { t } = useLanguage();
  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * index, duration: 0.3 }}
      onClick={onClick}
      className="group relative rounded-xl overflow-hidden border border-[#211c38] bg-[#161228] hover:border-[#7B4FBF]/60 transition-colors text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B4FBF]"
    >
      <div className="relative aspect-[4/3] bg-white">
        {round.canvas ? (
          <img src={round.canvas} alt={`Drawing of ${round.word}`} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#f5f5f5]">
            <span className="text-[#bbb] text-xs">{t.garticAI.noImage}</span>
          </div>
        )}
        <div className={`absolute top-2 right-2 text-base leading-none rounded-full p-1 shadow ${round.success ? "bg-emerald-500/90" : "bg-[#FF6B6B]/90"}`}>
          {round.success ? "✅" : "❌"}
        </div>
        <div className="absolute top-2 left-2">
          <span className="bg-[#0e0b1a]/80 text-white text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md">
            {round.word}
          </span>
        </div>
        <div className="absolute inset-0 bg-[#0e0b1a]/0 group-hover:bg-[#0e0b1a]/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <span className="text-white text-xs font-semibold bg-[#0e0b1a]/60 px-3 py-1.5 rounded-full">{t.garticAI.viewFull}</span>
        </div>
      </div>
      <div className="px-3 py-2">
        <p className="text-[#7a6f99] text-xs truncate">
          {t.garticAI.aiGuessed} <span className={round.success ? "text-emerald-400" : "text-[#FF6B6B]"}>&ldquo;{round.aiGuess || "…"}&rdquo;</span>
        </p>
      </div>
    </motion.button>
  );
}

function DrawingModal({ round, index, total, onClose, onPrev, onNext }: {
  round: Round; index: number; total: number;
  onClose: () => void; onPrev: () => void; onNext: () => void;
}) {
  const { t } = useLanguage();
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onPrev, onNext]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0e0b1a]/90 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="relative w-full max-w-lg rounded-2xl overflow-hidden bg-[#161228] border border-[#211c38] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-[#0e0b1a]/60 text-[#7a6f99] hover:text-white transition-colors">
          <X size={18} />
        </button>
        <div className="relative aspect-[4/3] bg-white">
          {round.canvas ? (
            <img src={round.canvas} alt={`Drawing of ${round.word}`} className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#f5f5f5]">
              <span className="text-[#bbb] text-sm">{t.garticAI.noImage}</span>
            </div>
          )}
        </div>
        <div className="px-5 py-4 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-white font-syne font-bold text-lg uppercase tracking-widest">{round.word}</p>
              <p className="text-[#7a6f99] text-sm mt-0.5">
                {t.garticAI.aiGuessed} <span className={round.success ? "text-emerald-400 font-semibold" : "text-[#FF6B6B] font-semibold"}>&ldquo;{round.aiGuess || "…"}&rdquo;</span>
              </p>
            </div>
            <span className={`text-xl leading-none rounded-full p-2 ${round.success ? "bg-emerald-500/15" : "bg-[#FF6B6B]/15"}`}>
              {round.success ? "✅" : "❌"}
            </span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <button onClick={onPrev} disabled={index === 0} className="text-xs text-[#7a6f99] hover:text-white disabled:opacity-30 transition-colors px-2 py-1 rounded">
              {t.garticPhone.prevStep}
            </button>
            <span className="text-xs text-[#7a6f99]">{index + 1} / {total}</span>
            <button onClick={onNext} disabled={index === total - 1} className="text-xs text-[#7a6f99] hover:text-white disabled:opacity-30 transition-colors px-2 py-1 rounded">
              {t.garticPhone.nextStep}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function GarticAIResultsPage() {
  const { t } = useLanguage();
  const params = useParams<{ roomId: string }>();
  const router = useRouter();
  const roomId = params?.roomId ?? "";
  const { socket, isConnected } = useSocket();
  const currentUserId = useCurrentUserId();
  const [isHost, setIsHost] = useState<boolean>(false);

  const [result, setResult] = useState<GarticAIGameOverDTO | null>(null);
  const [modalIndex, setModalIndex] = useState<number | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(`gartic_ai_result_${roomId}`);
    if (stored) {
      try { setResult(JSON.parse(stored)); } catch { /* ignore */ }
    }
  }, [roomId]);

  useEffect(() => {
    if (!isConnected) return;
    socket.emit("room:join", { roomId });

    const onRoomJoined = (roomDTO: import("@/types/game").RoomDTO): void => {
      const me = roomDTO.players.find((p) => p.clerkId === currentUserId);
      setIsHost(me?.isHost ?? false);
    };
    const handleNewGame = ({ newRoomId }: { newRoomId: string }): void => {
      router.push(`/gartic-phone/lobby/${newRoomId}`);
    };

    socket.on("room:joined", onRoomJoined);
    socket.on("room:new_game_started", handleNewGame);
    return () => {
      socket.off("room:joined", onRoomJoined);
      socket.off("room:new_game_started", handleNewGame);
    };
  }, [socket, isConnected, router, roomId, currentUserId]);

  const openModal = useCallback((i: number) => setModalIndex(i), []);
  const closeModal = useCallback(() => setModalIndex(null), []);
  const prevModal = useCallback(() => setModalIndex((i) => (i !== null && i > 0 ? i - 1 : i)), []);
  const nextModal = useCallback(
    () => setModalIndex((i) => (i !== null && result && i < result.rounds.length - 1 ? i + 1 : i)),
    [result]
  );

  function playAgain(): void {
    socket.emit("room:new_game", { roomId });
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-[#0e0b1a] flex items-center justify-center">
        <div className="text-[#7a6f99]">{t.common.loadingResults}</div>
      </div>
    );
  }

  const successCount = result.rounds.filter((r) => r.success).length;
  const successRate = result.rounds.length > 0 ? Math.round((successCount / result.rounds.length) * 100) : 0;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#0e0b1a] pt-16 pb-24 px-4">
        <div className="max-w-2xl mx-auto">

          {/* Score header */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-10">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#7B4FBF] to-[#3AAFD4] flex items-center justify-center mx-auto mb-4 shadow-[0_0_40px_rgba(123,79,191,0.4)]">
              <Trophy size={32} className="text-white" />
            </div>
            <p className="text-[#7a6f99] text-sm uppercase tracking-widest mb-1">{t.garticAI.finalScore}</p>
            <p className="text-white font-syne font-bold text-6xl">{result.finalScore}</p>
            <p className="text-[#7a6f99] text-sm mt-2">
              {successCount} word{successCount !== 1 ? "s" : ""} recognized out of {result.rounds.length}
            </p>
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="text-center">
                <p className="text-white font-bold text-xl">{successRate}%</p>
                <p className="text-[#7a6f99] text-xs uppercase tracking-wider">{t.garticAI.accuracy}</p>
              </div>
              <div className="w-px h-8 bg-[#211c38]" />
              <div className="text-center">
                <p className="text-white font-bold text-xl">{result.rounds.length}</p>
                <p className="text-[#7a6f99] text-xs uppercase tracking-wider">{t.garticAI.rounds}</p>
              </div>
              <div className="w-px h-8 bg-[#211c38]" />
              <div className="text-center">
                <p className="text-white font-bold text-xl">{result.rounds.length - successCount}</p>
                <p className="text-[#7a6f99] text-xs uppercase tracking-wider">{t.garticAI.missed}</p>
              </div>
            </div>
          </motion.div>

          {/* Drawing gallery */}
          {result.rounds.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="mb-6">
              <p className="text-xs uppercase tracking-widest text-[#7a6f99] mb-3 px-1">{t.garticAI.drawings}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {result.rounds.map((r, i) => (
                  <DrawingCard key={i} round={r} index={i} onClick={() => openModal(i)} />
                ))}
              </div>
            </motion.div>
          )}

          {/* Round history */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="rounded-xl bg-[#161228] border border-[#211c38] overflow-hidden mb-6">
            <button
              onClick={() => setHistoryOpen((o) => !o)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#1e1836] transition-colors"
            >
              <p className="text-xs uppercase tracking-widest text-[#7a6f99]">{t.garticAI.roundHistory}</p>
              {historyOpen ? <ChevronUp size={14} className="text-[#7a6f99]" /> : <ChevronDown size={14} className="text-[#7a6f99]" />}
            </button>

            <AnimatePresence initial={false}>
              {historyOpen && (
                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                  <div className="divide-y divide-[#211c38] border-t border-[#211c38]">
                    {result.rounds.map((r, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.04 * i }}
                        className="flex items-center justify-between px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-base">{r.success ? "✅" : "❌"}</span>
                          <div>
                            <p className="text-white font-medium uppercase tracking-wide text-sm">{r.word}</p>
                            <p className="text-[#7a6f99] text-xs">
                              {t.garticAI.aiGuessed} <span className={r.success ? "text-emerald-400" : "text-[#FF6B6B]"}>&ldquo;{r.aiGuess || "…"}&rdquo;</span>
                            </p>
                          </div>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r.success ? "bg-emerald-500/10 text-emerald-400" : "bg-[#FF6B6B]/10 text-[#FF6B6B]"}`}>
                          {r.success ? "+1" : "−1 ♥"}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Actions */}
          <div className="flex gap-3 justify-center">
            {isHost ? (
              <Button onClick={playAgain} className="bg-gradient-to-r from-[#7B4FBF] to-[#3AAFD4] text-white font-syne font-bold hover:opacity-90 px-8">
                <RotateCcw size={16} className="mr-2" />
                {t.garticAI.playAgain}
              </Button>
            ) : (
              <p className="text-[#7a6f99] text-xs self-center">{t.garticAI.waitingHostNewGame}</p>
            )}
            <Button variant="outline" className="border-[#211c38] text-white hover:bg-[#1e1836] px-8" onClick={() => router.push("/")}>
              {t.nav.home}
            </Button>
          </div>

        </div>
      </div>

      <AnimatePresence>
        {modalIndex !== null && (
          <DrawingModal round={result.rounds[modalIndex]} index={modalIndex} total={result.rounds.length} onClose={closeModal} onPrev={prevModal} onNext={nextModal} />
        )}
      </AnimatePresence>

      <BottomNav />
    </>
  );
}
