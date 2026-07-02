"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";

import { useSocket } from "@/hooks/useSocket";
import { toast } from "sonner";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useFabricCanvas } from "@/hooks/useFabricCanvas";
import { useRoom } from "@/hooks/useRoom";
import { useLanguage } from "@/context/LanguageContext";
import { useSound } from "@/hooks/useSound";

import { FabricCanvas } from "@/components/canvas/FabricCanvas";
import { ReconnectingOverlay } from "@/components/shared/ReconnectingOverlay";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { ColorPalette, BrushSlider, ActionTools, CompactToolbar } from "@/components/canvas/CanvasToolbar";
import { LivesDisplay } from "@/components/gartic-ai/LivesDisplay";
import { AIJudgingScreen } from "@/components/gartic-ai/AIJudgingScreen";
import { RoundResult } from "@/components/gartic-ai/RoundResult";
import { WordReveal } from "@/components/gartic-ai/WordReveal";
import { TurnIndicator } from "@/components/gartic-ai/TurnIndicator";

import type {
  GarticAIRoundStartDTO,
  GarticAIDrawingStartDTO,
  GarticAITurnStartDTO,
  GarticAITurnEndDTO,
  GarticAIRoundResultDTO,
  GarticAIGameOverDTO,
  FabricStroke,
} from "@/types/game";

type UIPhase = "WORD_REVEAL" | "DRAWING" | "JUDGING" | "ROUND_RESULT";
type DrawMode = "turn" | "shared";

export default function GarticAIPlayPage() {
  const { t } = useLanguage();
  const params = useParams<{ roomId: string }>();
  const router = useRouter();
  const roomId = params?.roomId ?? "";

  const { socket, isConnected } = useSocket();
  const myUserId = useCurrentUserId();
  const { players } = useRoom(roomId);
  const { play } = useSound();

  const [uiPhase, setUIPhase] = useState<UIPhase | null>(null);
  const [currentWord, setCurrentWord] = useState("");
  const [wordLength, setWordLength] = useState(0);
  const [letterHint, setLetterHint] = useState("");
  const [roundInfo, setRoundInfo] = useState<{ lives: number; score: number } | null>(null);
  const [roundResult, setRoundResult] = useState<GarticAIRoundResultDTO | null>(null);
  const [timeLeft, setTimeLeft] = useState(20);
  const [totalTime, setTotalTime] = useState(20);

  const [drawMode, setDrawMode] = useState<DrawMode>("turn");
  const [currentTurnPlayerId, setCurrentTurnPlayerId] = useState<string | null>(null);
  const [playerOrder, setPlayerOrder] = useState<string[]>([]);
  const [turnIndex, setTurnIndex] = useState(0);
  const [totalTurns, setTotalTurns] = useState(1);

  const hasSubmittedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playerOrderRef = useRef<string[]>([]);
  const isDrawing = uiPhase === "DRAWING";

  const isMyTurn = drawMode === "shared"
    ? isDrawing
    : isDrawing && currentTurnPlayerId === myUserId;

  const handleStrokeEmit = useCallback(
    (stroke: FabricStroke) => {
      socket.emit("gartic_ai:stroke", { roomId, strokeData: stroke });
    },
    [socket, roomId]
  );

  const {
    canvasRef,
    color, setColor,
    brushSize, setBrushSize,
    activeTool, setActiveTool,
    undo, clearCanvas,
    getImageBase64,
    applyRemoteStroke,
    setReadOnly,
  } = useFabricCanvas(roomId, handleStrokeEmit);

  useEffect(() => {
    setReadOnly(!isMyTurn);
  }, [isMyTurn, setReadOnly]);

  function stopTimer(): void {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function startTimer(seconds: number): void {
    stopTimer();
    setTotalTime(seconds);
    setTimeLeft(seconds);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { stopTimer(); return 0; }
        return t - 1;
      });
    }, 1000);
  }

  const submitCanvas = useCallback(async () => {
    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;
    const canvas64 = await getImageBase64();
    socket.emit("gartic_ai:submit_canvas", { roomId, canvasBase64: canvas64 });
  }, [socket, roomId, getImageBase64]);

  useEffect(() => {
    function handleRoundStart(data: GarticAIRoundStartDTO): void {
      hasSubmittedRef.current = false;
      stopTimer();
      clearCanvas();
      setActiveTool("brush");
      play("transition_new_word");
      setCurrentWord(data.word);
      setWordLength(data.wordLength ?? data.word.length);
      setLetterHint(data.letterHint ?? "");
      setRoundInfo({ lives: data.lives, score: data.score });
      setRoundResult(null);
      setCurrentTurnPlayerId(null);
      setPlayerOrder([]);
      playerOrderRef.current = [];
      setTurnIndex(0);
      setUIPhase("WORD_REVEAL");
    }

    function handleDrawingStart(data: GarticAIDrawingStartDTO): void {
      hasSubmittedRef.current = false;
      setDrawMode("shared");
      setUIPhase("DRAWING");
      startTimer(Math.round(data.durationMs / 1000));
    }

    function handleTurnStart(data: GarticAITurnStartDTO): void {
      hasSubmittedRef.current = false;
      setDrawMode("turn");
      setUIPhase("DRAWING");
      setCurrentTurnPlayerId(data.playerId);
      setTurnIndex(data.turnIndex);
      setTotalTurns(data.totalTurns);
      if (!playerOrderRef.current.includes(data.playerId)) {
        playerOrderRef.current = [...playerOrderRef.current, data.playerId];
        setPlayerOrder([...playerOrderRef.current]);
      }
      startTimer(Math.round(data.durationMs / 1000));
    }

    function handleTurnEnd(data: GarticAITurnEndDTO): void {
      if (data.playerId === myUserId) stopTimer();
    }

    function handleTimeUp(): void {
      stopTimer();
      if (drawMode === "shared" || currentTurnPlayerId === myUserId) {
        void submitCanvas();
      }
    }

    function handleStrokeReceived(stroke: FabricStroke): void {
      applyRemoteStroke(stroke);
    }

    function handleJudging(): void {
      stopTimer();
      setUIPhase("JUDGING");
    }

    function handleRoundResult(result: GarticAIRoundResultDTO): void {
      if (result.success) play("correct_guess");
      else play("lost_heart_ai_judge");
      setRoundResult(result);
      setRoundInfo({ lives: result.lives, score: result.score });
      setUIPhase("ROUND_RESULT");
    }

    function handleGameOver(data: GarticAIGameOverDTO): void {
      stopTimer();
      play("lost_game_ai_judge");
      sessionStorage.setItem(`gartic_ai_result_${roomId}`, JSON.stringify(data));
      router.push(`/gartic-ai/results/${roomId}`);
    }

    socket.on("gartic_ai:round_start", handleRoundStart);
    socket.on("gartic_ai:drawing_start", handleDrawingStart);
    socket.on("gartic_ai:turn_start", handleTurnStart);
    socket.on("gartic_ai:turn_end", handleTurnEnd);
    socket.on("gartic_ai:time_up", handleTimeUp);
    socket.on("gartic_ai:stroke_received", handleStrokeReceived);
    socket.on("gartic_ai:judging", handleJudging);
    socket.on("gartic_ai:round_result", handleRoundResult);
    socket.on("gartic_ai:game_over", handleGameOver);

    const handleSessionError = ({ message }: { message: string }): void => {
      if (message === "Not a member of this room") {
        toast.error(t.common.sessionExpired);
        router.push("/");
      }
    };
    socket.on("error" as any, handleSessionError);

    return () => {
      socket.off("gartic_ai:round_start", handleRoundStart);
      socket.off("gartic_ai:drawing_start", handleDrawingStart);
      socket.off("gartic_ai:turn_start", handleTurnStart);
      socket.off("gartic_ai:turn_end", handleTurnEnd);
      socket.off("gartic_ai:time_up", handleTimeUp);
      socket.off("gartic_ai:stroke_received", handleStrokeReceived);
      socket.off("gartic_ai:judging", handleJudging);
      socket.off("gartic_ai:round_result", handleRoundResult);
      socket.off("gartic_ai:game_over", handleGameOver);
      socket.off("error" as any, handleSessionError);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, router, roomId, drawMode, currentTurnPlayerId, myUserId, play]);

  useEffect(() => () => stopTimer(), []);

  const timerPercent = totalTime > 0 ? Math.max(0, (timeLeft / totalTime) * 100) : 0;
  const timerColor =
    timerPercent > 50 ? "#3AAFD4" : timerPercent > 25 ? "#F5C518" : "#FF6B6B";

  const showTimer = isDrawing;
  const showTurnIndicator = isDrawing && drawMode === "turn" && playerOrder.length > 0;

  // Build the letter hint display: "_ P _ _ E" → tokens split by space
  const hintTokens = letterHint ? letterHint.split(" ") : Array.from({ length: wordLength }, () => "_");

  const navHUD = (
    <div className="flex items-center gap-4">
      {currentWord && uiPhase !== "JUDGING" && (
        <span className="text-white font-syne font-bold text-sm uppercase tracking-wide truncate max-w-[160px]">
          {currentWord}
        </span>
      )}
      <div className="flex items-center gap-1 text-[#7a6f99] text-xs">
        <span className="uppercase tracking-wider">Score</span>
        <span className="text-white font-bold ml-1">{roundInfo?.score ?? 0}</span>
      </div>
      <LivesDisplay lives={roundInfo?.lives ?? 3} />
    </div>
  );

  return (
    <>
    <Navbar>{navHUD}</Navbar>
    <div className="h-[calc(100dvh-64px)] md:mt-16 bg-[#0e0b1a] flex flex-col overflow-hidden">
      <ReconnectingOverlay isVisible={!isConnected} />

      {/* ── Mobile word + score + lives (Navbar hidden on mobile) ─── */}
      <div className="md:hidden flex items-center justify-between px-3 py-2 border-b border-[#211c38] bg-[#161228] shrink-0">
        <div className="flex-1 min-w-0">
          {currentWord && uiPhase !== "JUDGING" && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[#7a6f99] leading-none mb-0.5">{t.garticAI.drawThis}</p>
              <p className="text-white font-syne font-bold text-base tracking-wide uppercase truncate leading-tight">
                {currentWord}
              </p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-widest text-[#7a6f99] leading-none">Score</p>
            <p className="text-white font-syne font-bold text-lg leading-tight">{roundInfo?.score ?? 0}</p>
          </div>
          <LivesDisplay lives={roundInfo?.lives ?? 3} />
        </div>
      </div>

      {/* ── Turn indicator (turn-based only) ────────────────────────────────── */}
      {showTurnIndicator && (
        <div className="px-3 py-1.5 border-b border-[#211c38] bg-[#0f0c1f] shrink-0">
          <TurnIndicator
            players={players}
            playerOrder={playerOrder}
            currentPlayerId={currentTurnPlayerId ?? ""}
            turnIndex={turnIndex}
            totalTurns={totalTurns}
            isMyTurn={isMyTurn}
          />
        </div>
      )}

      {/* ── Timer + letter hint bar ──────────────────────────────────────────── */}
      {showTimer && (
        <div className="flex flex-col gap-1 px-3 py-1 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-[#211c38] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${timerPercent}%`, backgroundColor: timerColor }}
              />
            </div>
            <span
              className="text-xs font-bold tabular-nums w-7 text-right shrink-0"
              style={{ color: timerColor }}
            >
              {timeLeft}s
            </span>
          </div>
          {/* Letter hint — shown only when there are revealed letters or wordLength is known */}
          {wordLength > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[10px] text-[#7a6f99] uppercase tracking-widest shrink-0">{t.garticAI.aiSees}</span>
              <div className="flex gap-1 flex-wrap">
                {hintTokens.map((token, i) => (
                  <span
                    key={i}
                    className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold font-mono border ${
                      token !== "_"
                        ? "bg-[#7B4FBF]/20 border-[#7B4FBF] text-[#c4b5e8]"
                        : "bg-[#211c38] border-[#2a2447] text-[#3a3360]"
                    }`}
                  >
                    {token !== "_" ? token : "·"}
                  </span>
                ))}
              </div>
              <span className="text-[10px] text-[#4a4370] ml-1">{t.skribbl.nLetters.replace("{n}", String(wordLength))}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Main drawing area ────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-auto justify-center py-2 md:py-4">
        <div className={`flex items-start gap-2 w-full px-2 ${isMyTurn ? "max-w-3xl" : "max-w-xl"}`}>

        {/* Left toolbar — md+ (tablet & desktop), active player only */}
        {isMyTurn && (
          <div className="hidden md:flex flex-col gap-2 p-2 shrink-0">
            <ColorPalette
              color={color}
              activeTool={activeTool}
              onColorChange={setColor}
              onToolChange={setActiveTool}
            />
            <BrushSlider
              brushSize={brushSize}
              color={color}
              activeTool={activeTool}
              onBrushSizeChange={setBrushSize}
            />
          </div>
        )}

        {/* Canvas + overlays */}
        <div className="flex flex-col flex-1 min-w-0 gap-1.5 md:gap-2">
          <div className="relative">
            <FabricCanvas canvasRef={canvasRef} readOnly={!isMyTurn} className="w-full" />
            <AnimatePresence>
              {!uiPhase && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#0e0b1a]/80 rounded-xl">
                  <p className="text-[#7a6f99] text-sm">{t.common.waitingForGame}</p>
                </div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {uiPhase === "WORD_REVEAL" && <WordReveal word={currentWord} />}
            </AnimatePresence>
            <AnimatePresence>
              {uiPhase === "JUDGING" && <AIJudgingScreen />}
            </AnimatePresence>
            <AnimatePresence>
              {uiPhase === "ROUND_RESULT" && roundResult && (
                <RoundResult
                  success={roundResult.success}
                  aiGuess={roundResult.aiGuess}
                  word={roundResult.word}
                  lives={roundResult.lives}
                  score={roundResult.score}
                />
              )}
            </AnimatePresence>

            {/* Waiting badge — turn-based, not your turn */}
            {isDrawing && drawMode === "turn" && !isMyTurn && currentTurnPlayerId && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
                <span className="bg-[#0e0b1a]/80 text-[#7a6f99] text-xs px-3 py-1.5 rounded-full border border-[#211c38]">
                  {players.find((p) => p.clerkId === currentTurnPlayerId)?.username ?? t.garticAI.waitingTurn} {t.garticAI.isDrawing}
                </span>
              </div>
            )}
          </div>

          {/* Compact toolbar — phone only (< md), active player only */}
          {isMyTurn && (
            <div className="md:hidden shrink-0">
              <CompactToolbar
                color={color}
                brushSize={brushSize}
                activeTool={activeTool}
                onColorChange={setColor}
                onToolChange={setActiveTool}
                onBrushSizeChange={setBrushSize}
                onUndo={undo}
                onClear={clearCanvas}
              />
            </div>
          )}
        </div>

        {/* Right toolbar — md+ (tablet & desktop), active player only */}
        {isMyTurn && (
          <div className="hidden md:flex flex-col gap-2 p-2 shrink-0">
            <ActionTools
              activeTool={activeTool}
              onToolChange={setActiveTool}
              onUndo={undo}
              onClear={() => clearCanvas()}
            />
          </div>
        )}
        </div>
      </div>
    </div>
    <BottomNav />
    </>
  );
}
