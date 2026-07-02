"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useSocket } from "@/hooks/useSocket";
import { useFabricCanvas } from "@/hooks/useFabricCanvas";
import { useSound } from "@/hooks/useSound";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Leaderboard } from "@/components/skribbl/Leaderboard";
import WordChoice from "@/components/skribbl/WordChoice";
import HintDisplay from "@/components/skribbl/HintDisplay";
import GuessInput from "@/components/skribbl/GuessInput";
import ChatGuess from "@/components/skribbl/ChatGuess";
import { FabricCanvas } from "@/components/canvas/FabricCanvas";
import { CompactToolbar } from "@/components/canvas/CanvasToolbar";

import { PodiumScreen } from "@/components/skribbl/PodiumScreen";
import { ReconnectingOverlay } from "@/components/shared/ReconnectingOverlay";
import { useLanguage } from "@/context/LanguageContext";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import type {
  SkribblPhase,
  SkribblRoundDTO,
  SkribblGuessDTO,
  SkribblChatDTO,
  RoomPlayerDTO,
  SkribblPhasePayload,
  FabricStroke,
  SkribblResultDTO,
} from "@/types/game";

function resizeForAI(base64: string, maxPx = 512, quality = 0.5): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(maxPx / img.width, maxPx / img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.src = base64;
  });
}

export default function SkribblPlayPage(): React.ReactElement {
  const { t } = useLanguage();
  const params = useParams<{ roomId: string }>();
  const router = useRouter();
  const currentUserId = useCurrentUserId();
  const roomId = params.roomId;
  const { socket, isConnected } = useSocket();
  const { play } = useSound();

  const [phase, setPhase] = useState<SkribblPhase>("WAITING");
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [timeLimit, setTimeLimit] = useState<number>(60);
  const [currentRound, setCurrentRound] = useState<SkribblRoundDTO | null>(null);
  const [players, setPlayers] = useState<RoomPlayerDTO[]>([]);
  const [guesses, setGuesses] = useState<SkribblGuessDTO[]>([]);
  const [chatMessages, setChatMessages] = useState<SkribblChatDTO[]>([]);
  const [hint, setHint] = useState<string>("");
  const [words, setWords] = useState<string[]>([]);
  const [hasGuessedCorrectly, setHasGuessedCorrectly] = useState<boolean>(false);
  const prevScoresRef = useRef<Record<string, number>>({});
  const [deltaScores, setDeltaScores] = useState<Record<string, number>>({});
  const [roundCount, setRoundCount] = useState<number>(3);
  const [guessedPlayerIds, setGuessedPlayerIds] = useState<Set<string>>(new Set());
  const [pendingResult, setPendingResult] = useState<{ data: SkribblResultDTO; redirectTo: string } | null>(null);

  const isDrawer = currentRound?.drawerClerkId === currentUserId;

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isDrawerRef = useRef(false);
  const currentUserIdRef = useRef(currentUserId);
  const disconnectedClerkIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    isDrawerRef.current = isDrawer;
  }, [isDrawer]);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  const onStrokeEmit = useCallback((stroke: FabricStroke) => {
    if (isDrawerRef.current) {
      socket?.emit("skribbl:stroke", { roomId, stroke });
    }
  }, [socket, roomId]);

  const fabricCanvas = useFabricCanvas(roomId, onStrokeEmit);

  useEffect(() => {
    fabricCanvas.setReadOnly(!isDrawer || phase !== "DRAWING");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDrawer, phase]);

  useEffect(() => {
    if (!socket) return;

    const emitJoin = () => socket.emit("room:join", { roomId });
    socket.on("connect", emitJoin);
    if (socket.connected) emitJoin();

    socket.on("skribbl:phase_changed", (payload: SkribblPhasePayload) => {
      if (timerRef.current) clearInterval(timerRef.current);

      const deltas: Record<string, number> = {};
      payload.players.forEach(p => {
        const prev = prevScoresRef.current[p.clerkId] ?? 0;
        if (p.score > prev) deltas[p.clerkId] = p.score - prev;
      });
      setDeltaScores(deltas);
      prevScoresRef.current = Object.fromEntries(payload.players.map(p => [p.clerkId, p.score]));

      setPhase(payload.phase);
      setRoundCount(payload.roundCount);
      setPlayers(payload.players);
      setTimeLeft(payload.timeLimit);
      setTimeLimit(payload.timeLimit);
      if (payload.round) {
        setCurrentRound(payload.round);
        setHint(payload.round.hint);
      }
      if (payload.words) setWords(payload.words);

      if (payload.phase === "ROUND_END" && isDrawerRef.current) {
        void fabricCanvas.getImageBase64().then((base64) => {
          if (base64) socket?.emit("skribbl:submit_drawing", { roomId, imageBase64: base64 });
        });
      }

      if (payload.phase === "PICKING_WORD") {
        play("transition_new_word");
        setGuesses([]);
        setHasGuessedCorrectly(false);
        setGuessedPlayerIds(new Set());
        // Canvas NOT cleared here — previous drawing stays as background
      }

      if (payload.phase === "DRAWING") {
        // Clear canvas locally; emit the clear only if WE are the drawer.
        // Use payload.round directly — isDrawerRef is stale at this point (state hasn't re-rendered yet).
        fabricCanvas.clearCanvas({ silent: true });
        fabricCanvas.setActiveTool("brush");
        if (payload.round?.drawerClerkId === currentUserId) {
          socket?.emit("skribbl:stroke", { roomId, stroke: { type: "clear" } as FabricStroke });
        }
      }

      timerRef.current = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000);
    });

    socket.on("skribbl:stroke_received", ({ stroke }) => {
      if (!isDrawerRef.current) {
        fabricCanvas.applyRemoteStroke(stroke);
      }
    });

    socket.on("skribbl:guess_result", ({ guess }) => {
      setGuesses(prev => [...prev, guess]);
      if (guess.isCorrect) {
        setGuessedPlayerIds(prev => new Set([...prev, guess.clerkId]));
      }
      if (guess.clerkId === currentUserId && guess.isCorrect) {
        play("correct_guess");
        setHasGuessedCorrectly(true);
      }
    });

    socket.on("skribbl:chat_received", (msg) => {
      setChatMessages(prev => [...prev, msg]);
    });

    socket.on("skribbl:hint_updated", ({ hint: newHint }) => {
      setHint(newHint);
    });

    socket.on("skribbl:game_ended", ({ roomId: endedRoomId, result }) => {
      if (timerRef.current) clearInterval(timerRef.current);
      setPhase("FINISHED");
      sessionStorage.setItem("skribbl_results", JSON.stringify(result));
      setPendingResult({ data: result, redirectTo: `/skribbl/results/${endedRoomId}` });
    });

    socket.on("room:player_left", ({ playerId }) => {
      setPlayers(prev => {
        const leaving = prev.find(p => p.clerkId === playerId);
        if (leaving) {
          disconnectedClerkIds.current.add(playerId);
          toast.warning(t.common.playerDisconnected.replace("{n}", leaving.username));
        }
        return prev.filter(p => p.clerkId !== playerId);
      });
    });

    socket.on("room:player_joined", (player) => {
      if (disconnectedClerkIds.current.has(player.clerkId)) {
        disconnectedClerkIds.current.delete(player.clerkId);
        toast.success(t.common.playerReconnected.replace("{n}", player.username));
      }
      setPlayers(prev =>
        prev.some(p => p.clerkId === player.clerkId)
          ? prev.map(p => p.clerkId === player.clerkId ? { ...p, status: "CONNECTED" as const } : p)
          : [...prev, player]
      );
    });

    socket.on("skribbl:request_canvas_snapshot", ({ roomId: rid, drawerClerkId }) => {
      if (rid !== roomId || !isDrawerRef.current) return;
      if (drawerClerkId !== currentUserIdRef.current) return;
      void fabricCanvas.getImageBase64().then((base64) => {
        if (!base64) return;
        void resizeForAI(base64).then((resized) => {
          socket.emit("skribbl:canvas_snapshot", { roomId, imageBase64: resized });
        });
      });
    });

    const handleSessionError = ({ message }: { message: string }): void => {
      if (message === "Not a member of this room") {
        toast.error(t.common.sessionExpired);
        router.push("/");
      }
    };
    socket.on("error" as any, handleSessionError);

    return () => {
      socket.off("connect", emitJoin);
      if (timerRef.current) clearInterval(timerRef.current);
      socket.off("skribbl:phase_changed");
      socket.off("skribbl:stroke_received");
      socket.off("skribbl:guess_result");
      socket.off("skribbl:chat_received");
      socket.off("skribbl:hint_updated");
      socket.off("skribbl:game_ended");
      socket.off("room:player_left");
      socket.off("room:player_joined");
      socket.off("skribbl:request_canvas_snapshot");
      socket.off("error" as any, handleSessionError);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, roomId]);

  function handleChooseWord(wordIndex: number): void {
    socket?.emit("skribbl:choose_word", { roomId, wordIndex });
  }

  function handleSubmitGuess(guess: string): void {
    socket?.emit("skribbl:submit_guess", { roomId, guess });
  }

  function handleDrawerChat(msg: string): void {
    socket?.emit("skribbl:chat_message", { roomId, message: msg });
  }

  function timerColor(): string {
    if (timeLeft <= 5) return "text-red-500 animate-pulse";
    if (timeLeft <= 15) return "text-yellow-400";
    return "text-[#7B4FBF]";
  }

  const showCanvas = phase !== "WAITING" && (phase !== "FINISHED" || pendingResult !== null);
  const canvasInteractive = phase === "DRAWING";

  const navHUD = (
    <div className="flex items-center gap-4">
      {currentRound && (
        <span className="text-[#7a6f99] text-sm">
          Round {Math.ceil(currentRound.roundNumber / Math.max(1, players.length))} / {roundCount}
        </span>
      )}
      {phase !== "WAITING" && phase !== "FINISHED" && (
        <span className={`text-2xl font-mono font-bold ${timerColor()}`}>
          {timeLeft}
        </span>
      )}
    </div>
  );

  return (
    <>
      <Navbar>{navHUD}</Navbar>
      <ReconnectingOverlay isVisible={!isConnected} />
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
          0%   { opacity: 0; transform: translateY(4px); }
          20%  { opacity: 1; transform: translateY(0); }
          80%  { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-4px); }
        }
      `}</style>
      <div className="min-h-screen md:h-screen overflow-y-auto md:overflow-hidden bg-[#0e0b1a] flex flex-col pb-20 md:pb-0 md:pt-16">

        {/* ── Mobile HUD (Navbar hidden on mobile) ────────────────── */}
        <div className="md:hidden flex items-center justify-end gap-3 px-4 py-2 border-b border-[#211c38]">
          {currentRound && (
            <span className="text-[#7a6f99] text-xs">
              Round {Math.ceil(currentRound.roundNumber / Math.max(1, players.length))} / {roundCount}
            </span>
          )}
          {phase !== "WAITING" && phase !== "FINISHED" && (
            <span className={`text-2xl font-mono font-bold ${timerColor()}`}>
              {timeLeft}
            </span>
          )}
        </div>

        {/* ── Game area ───────────────────────────────────────────── */}
        <div className="flex flex-1 flex-col md:flex-row gap-4 p-4 md:overflow-hidden">

          {/* Left sidebar: Leaderboard */}
          <div className="hidden lg:block w-48 flex-shrink-0">
            <Leaderboard
              players={players}
              currentUserId={currentUserId ?? ""}
              highlightRound={phase === "ROUND_END"}
              deltaScores={deltaScores}
              guessedPlayerIds={phase === "DRAWING" ? guessedPlayerIds : undefined}
            />
          </div>

          {/* Center: phase content */}
          <div className="flex-1 flex flex-col items-center gap-4 min-w-0">

            {/* WAITING */}
            {phase === "WAITING" && (
              <div className="flex flex-col items-center justify-center pt-20 gap-4" style={{ animation: "slideUp 0.3s ease-out" }}>
                <Loader2 className="animate-spin text-[#9B6FDF]" size={40} />
                <span className="text-sm text-[#7a6f99]">{t.common.waitingForGame}</span>
              </div>
            )}

            {/* DRAWING hint */}
            {phase === "DRAWING" && (
              <div className="w-full max-w-3xl" style={{ animation: "slideUp 0.3s ease-out" }}>
                <HintDisplay
                  hint={isDrawer ? (currentRound?.word ?? hint) : hint}
                  wordLength={currentRound?.wordLength ?? 0}
                  category={currentRound?.category ?? null}
                  isDrawer={isDrawer}
                />
              </div>
            )}

            {/* Canvas wrapper — always in DOM (Fabric.js needs ref on mount).
                Width capped via maxWidth so 4:3 canvas never overflows viewport height.
                Overlays are absolute inset-0, so wrapper width must equal canvas width. */}
            <div
              className={`relative w-full mx-auto ${showCanvas ? "" : "hidden"} skribbl-canvas-wrapper`}
              style={{ maxWidth: "calc((100vh - 300px) * (4 / 3))" }}
            >

              {/* Canvas */}
              <div className={`transition-all duration-500 ${canvasInteractive ? "" : "opacity-20 blur-sm pointer-events-none"}`}>
                <FabricCanvas canvasRef={fabricCanvas.canvasRef} readOnly={!isDrawer} />
              </div>

              {/* Compact toolbar — always below canvas, no side panels */}
              {isDrawer && (
                <div className="mt-2 md:mt-3">
                <CompactToolbar
                  color={fabricCanvas.color}
                  brushSize={fabricCanvas.brushSize}
                  activeTool={fabricCanvas.activeTool}
                  onColorChange={fabricCanvas.setColor}
                  onToolChange={fabricCanvas.setActiveTool}
                  onBrushSizeChange={fabricCanvas.setBrushSize}
                  onUndo={fabricCanvas.undo}
                  onClear={fabricCanvas.clearCanvas}
                />
                </div>
              )}

                {/* PICKING_WORD overlay */}
                {phase === "PICKING_WORD" && (
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center z-10 rounded-xl bg-[#0e0b1a]/75 backdrop-blur-sm p-6"
                    style={{ animation: "slideUp 0.3s ease-out" }}
                  >
                    {isDrawer ? (
                      <WordChoice
                        words={words}
                        timeLeft={timeLeft}
                        timeLimit={timeLimit}
                        onChoose={handleChooseWord}
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-3 text-center">
                        <p className="text-[#7a6f99] text-lg">{t.skribbl.waitingFor}</p>
                        <p className="text-white font-bold text-2xl">
                          {players.find(p => p.clerkId === currentRound?.drawerClerkId)?.username ?? "drawer"}
                        </p>
                        <p className="text-[#7a6f99] text-lg">{t.skribbl.toPickWord}</p>
                      </div>
                    )}
                    {isDrawer && (
                      <div className="mt-4 w-full max-w-sm">
                        <GuessInput
                          onSubmit={handleSubmitGuess}
                          isCorrect={false}
                          isDrawer={isDrawer}
                          phase={phase}
                          onChatMessage={handleDrawerChat}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* ROUND_END overlay */}
                {phase === "ROUND_END" && (
                  <div
                    className="absolute inset-0 flex flex-col items-start justify-start z-10 rounded-xl bg-[#0e0b1a]/80 backdrop-blur-sm p-4 overflow-y-auto"
                    style={{ animation: "slideUp 0.3s ease-out" }}
                  >
                    <div className="w-full max-w-md mx-auto flex flex-col gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-white">{t.skribbl.roundOver}</p>
                        <p className="text-[#7a6f99] mt-1">
                          {t.skribbl.theWordWas}{" "}
                          <span className="text-white font-bold">{currentRound?.word}</span>
                        </p>
                      </div>
                      <div className="border border-[#211c38] rounded-xl bg-[#0e0b1a] overflow-hidden">
                        <div className="px-4 py-3 border-b border-[#211c38]">
                          <h3 className="text-sm font-semibold text-white">{t.skribbl.scores}</h3>
                        </div>
                        <div className="flex flex-col gap-1 p-2">
                          {[...players].sort((a, b) => b.score - a.score).map((player, index) => {
                            const rank = index + 1;
                            const isMe = player.clerkId === (currentUserId ?? "");
                            const delta = deltaScores[player.clerkId] ?? 0;
                            return (
                              <div
                                key={player.clerkId}
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm
                                  ${isMe ? "bg-[#7B4FBF]/20 border border-[#7B4FBF]/40" : ""}`}
                              >
                                <span className="text-[#7a6f99] w-5 text-center flex-shrink-0">
                                  {rank === 1 ? "👑" : rank}
                                </span>
                                <div className="w-7 h-7 rounded-full flex-shrink-0 bg-[#211c38] overflow-hidden">
                                  {player.avatarUrl
                                    ? <img src={player.avatarUrl} alt={player.username} className="w-full h-full object-cover" />
                                    : <span className="text-xs text-white flex items-center justify-center h-full">{player.username[0]?.toUpperCase()}</span>
                                  }
                                </div>
                                <span className={`flex-1 truncate ${isMe ? "text-white font-semibold" : "text-[#7a6f99]"}`}>
                                  {isMe ? t.common.you : player.username}
                                </span>
                                <div className="relative flex-shrink-0 flex items-center gap-2">
                                  <span className="text-white font-bold">{player.score}</span>
                                  {delta > 0 && (
                                    <span
                                      className="text-emerald-400 text-xs font-bold whitespace-nowrap"
                                      style={{ animation: "fadeInUp 2.5s ease-out forwards" }}
                                    >
                                      +{delta}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      {isDrawer && (
                        <GuessInput
                          onSubmit={handleSubmitGuess}
                          isCorrect={false}
                          isDrawer={isDrawer}
                          phase={phase}
                          onChatMessage={handleDrawerChat}
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* FINISHED — podium overlay on top of the last canvas drawing */}
                {pendingResult && (
                  <PodiumScreen
                    results={pendingResult.data.results}
                    onComplete={() => router.push(pendingResult.redirectTo)}
                  />
                )}

            </div>

            {/* Guess / chat input — below canvas during DRAWING (drawer gets chat, guesser gets guess) */}
            {phase === "DRAWING" && (
              <div className="w-full max-w-3xl">
                <GuessInput
                  onSubmit={handleSubmitGuess}
                  isCorrect={hasGuessedCorrectly}
                  isDrawer={isDrawer}
                  phase={phase}
                  onChatMessage={handleDrawerChat}
                />
              </div>
            )}

          </div>

          {/* Right sidebar: ChatGuess — fixed height */}
          <div className="w-full md:w-48 lg:w-64 flex-shrink-0 h-72 md:h-auto">
            <ChatGuess
              guesses={guesses}
              currentUserId={currentUserId ?? ""}
              chatMessages={chatMessages}
            />
          </div>

        </div>
      </div>

      <BottomNav />
    </>
  );
}
