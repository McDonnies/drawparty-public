"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import type { DrawStepHandle } from "@/components/gartic-phone/DrawStep";
import { useSocket } from "@/hooks/useSocket";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useSound } from "@/hooks/useSound";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/context/LanguageContext";

import { PromptInput } from "@/components/gartic-phone/PromptInput";
import type { PromptInputHandle } from "@/components/gartic-phone/PromptInput";
import { DrawStep } from "@/components/gartic-phone/DrawStep";
import { DescribeStep } from "@/components/gartic-phone/DescribeStep";
import type { DescribeStepHandle } from "@/components/gartic-phone/DescribeStep";
import { PlayerStatusList } from "@/components/gartic-phone/PlayerStatusList";
import { RewindViewer } from "@/components/gartic-phone/RewindViewer";
import { ReconnectingOverlay } from "@/components/shared/ReconnectingOverlay";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";

import type { GarticPhase, GarticChainDTO, GarticResultDTO, RoomPlayerDTO, FabricStroke, LobbySettings } from "@/types/game";

// Constante d'une vraie image PNG de 1x1 pixel totalement transparente (pour éviter un envoi vide si le joueur est inactif)
const BLANK_IMAGE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

export default function GarticPlayPage() {
  const { t } = useLanguage();
  const params = useParams<{ roomId: string }>();
  const router = useRouter();
  const roomId = params?.roomId ?? "";

  const { socket, isConnected } = useSocket();
  const currentUserId = useCurrentUserId();
  const { play } = useSound();

  const [settings, setSettings] = useState<LobbySettings | null>(null);
  const [phase, setPhase] = useState<GarticPhase | "PROMPT" | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(45);
  const [players, setPlayers] = useState<RoomPlayerDTO[]>([]);
  const [isHost, setIsHost] = useState<boolean>(false);
  const [donePlayers, setDonePlayers] = useState<Set<string>>(new Set());
  const [currentPrompt, setCurrentPrompt] = useState<string | null>(null);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [chains, setChains] = useState<GarticChainDTO[]>([]);
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);


  // RÉFÉRENCES
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasSubmittedRef = useRef(false);
  const drawStepRef = useRef<DrawStepHandle>(null);
  const promptRef = useRef<PromptInputHandle>(null);
  const describeRef = useRef<DescribeStepHandle>(null);
  const disconnectedClerkIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    hasSubmittedRef.current = hasSubmitted;
  }, [hasSubmitted]);

  // HANDLERS (Sécurisés avec useCallback pour éviter de les recréer à chaque tick) 
  const handleSubmitPrompt = useCallback((prompt: string) => {
    if (hasSubmittedRef.current) return;
    socket?.emit("gartic:submit_prompt", { roomId, prompt: prompt.trim() || "???" });
    setHasSubmitted(true);
  }, [roomId]);

  const handleSubmitDrawing = useCallback(async (base64: string, strokes: FabricStroke[]) => {
    if (hasSubmittedRef.current) return;
    socket?.emit("gartic:submit_drawing", {
      roomId,
      imageBase64: base64,
      strokeData: JSON.stringify(strokes),
    });
    setHasSubmitted(true);
  }, [roomId]);

  const handleSubmitDescription = useCallback((description: string) => {
    if (hasSubmittedRef.current) return;
    socket?.emit("gartic:submit_description", { roomId, description: description.trim() || "???" });
    setHasSubmitted(true);
  }, [roomId]);


  // TIMER
  const startTimer = useCallback((duration: number, currentPhase: string) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(duration);
    let remaining = duration;

    timerRef.current = setInterval(async () => {
      remaining -= 1;
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(timerRef.current!);
        timerRef.current = null;

        if (!hasSubmittedRef.current) {
          if (currentPhase === "PROMPT") {
            handleSubmitPrompt(promptRef.current?.getCurrentValue() || "???");
          } else if (currentPhase === "DRAW") {
            const base64 = drawStepRef.current
              ? await drawStepRef.current.getImageBase64()
              : BLANK_IMAGE;
            const strokes = drawStepRef.current?.getStrokes() ?? [];
            void handleSubmitDrawing(base64, strokes);
          } else if (currentPhase === "DESCRIBE") {
            handleSubmitDescription(describeRef.current?.getCurrentValue() || "???");
          }
        }
      }
    }, 1000);
  }, [handleSubmitPrompt, handleSubmitDrawing, handleSubmitDescription]);

  // SOCKETS
  useEffect(() => {
    if (!socket) return;

    // Emit room:join once connected — the lobby's useSocket cleanup disconnects the socket,
    // so we must wait for the reconnect before emitting, otherwise the server never gets it.
    const emitJoin = () => socket.emit("room:join", { roomId });
    socket.on("connect", emitJoin);
    if (socket.connected) emitJoin();

    socket.on("gartic:phase_changed", ({ phase, prompt, imageBase64, timeLimit }) => {
      if (phase === "PROMPT") play("transition_new_word");
      if (phase === "DESCRIBE") play("give_title_gartic_phone");
      setPhase(phase);
      setCurrentPrompt(prompt ?? null);
      setCurrentImage(imageBase64 ?? null);
      setHasSubmitted(false);
      setDonePlayers(new Set());
      startTimer(timeLimit || 45, phase);
    });

    socket.on("room:joined", (roomDTO) => {
      setPlayers(roomDTO.players);
      setSettings(roomDTO.settings);
      const me = roomDTO.players.find((p) => p.clerkId === currentUserId);
      setIsHost(me?.isHost ?? false);
    });

    socket.on("gartic:player_done", ({ playerId }) => {
      if (playerId) setDonePlayers((prev) => new Set(Array.from(prev).concat(playerId)));
    });

    socket.on("gartic:rewind_data", ({ chains }) => {
      setPhase("REWIND");
      setChains(chains);
      if (timerRef.current) clearInterval(timerRef.current);
    });

    socket.on("gartic:game_ended", ({ roomId, results }: { roomId: string; results: GarticResultDTO }) => {
      sessionStorage.setItem(`gartic:results:${roomId}`, JSON.stringify(results));
      setPhase("FINISHED");
      router.push(`/gartic-phone/results/${roomId}`);
    });

    socket.on("room:player_left", ({ playerId }) => {
      setPlayers((prev) => {
        const leaving = prev.find((p) => p.clerkId === playerId);
        if (leaving) {
          disconnectedClerkIds.current.add(playerId);
          toast.warning(t.common.playerDisconnected.replace("{n}", leaving.username));
        }
        return prev.filter((p) => p.clerkId !== playerId);
      });
    });

    socket.on("room:player_joined", (player) => {
      if (disconnectedClerkIds.current.has(player.clerkId)) {
        disconnectedClerkIds.current.delete(player.clerkId);
        toast.success(t.common.playerReconnected.replace("{n}", player.username));
      }
      setPlayers((prev) =>
        prev.some((p) => p.clerkId === player.clerkId)
          ? prev.map((p) => p.clerkId === player.clerkId ? { ...p, status: "CONNECTED" as const } : p)
          : [...prev, player]
      );
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
      socket.off("room:joined");
      socket.off("gartic:phase_changed");
      socket.off("gartic:player_done");
      socket.off("gartic:rewind_data");
      socket.off("gartic:game_ended");
      socket.off("room:player_left");
      socket.off("room:player_joined");
      socket.off("error" as any, handleSessionError);
    };
  }, [roomId, router, startTimer, currentUserId]);

  // UI 
  let timerColor = "text-[#9B6FDF]";
  if (timeLeft <= 15) timerColor = "text-[#F5C518]";
  if (timeLeft <= 5) timerColor = "text-[#FF6B6B] animate-pulse";

  const phaseLabel = phase === "PROMPT" ? t.garticPhone.phasePrompt : phase === "DRAW" ? t.garticPhone.phaseDraw : phase === "DESCRIBE" ? t.garticPhone.phaseDescribe : t.common.loading;

  const navHUD = (phase === "PROMPT" || phase === "DRAW" || phase === "DESCRIBE") ? (
    <div className="flex items-center gap-3">
      <span className="text-[#7a6f99] text-xs uppercase tracking-wider">{phaseLabel}</span>
      <span className={`font-mono text-2xl font-bold ${timerColor}`}>{timeLeft}s</span>
    </div>
  ) : null;

  return (
    <>
    <Navbar>{navHUD}</Navbar>
    <div className="min-h-screen md:h-screen overflow-y-auto md:overflow-hidden bg-[#0e0b1a] flex flex-col pb-20 md:pb-0 md:pt-16">
      <ReconnectingOverlay isVisible={!isConnected} />

      {/* ── Mobile HUD + PlayerStatusList ───────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#211c38]">
        <div className="md:hidden flex items-center gap-3">
          {(phase === "PROMPT" || phase === "DRAW" || phase === "DESCRIBE") && (
            <>
              <span className="text-[#7a6f99] text-xs uppercase">{phaseLabel}</span>
              <span className={`font-mono text-xl font-bold ${timerColor}`}>{timeLeft}s</span>
            </>
          )}
        </div>
        <div className="ml-auto">
          <PlayerStatusList players={players} donePlayers={donePlayers} variant="mini" />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-3 md:py-5">
          <>
              {phase === "PROMPT" && (
                <PromptInput ref={promptRef} onSubmit={handleSubmitPrompt} onUnlock={() => setHasSubmitted(false)} hasSubmitted={hasSubmitted} donePlayers={donePlayers} players={players} />
              )}
              {phase === "DRAW" && (
                <DrawStep ref={drawStepRef} promptText={currentPrompt ?? ""} timeLeft={timeLeft} currentRound={1} totalRounds={players.length > 0 ? players.length : 5} onSubmit={handleSubmitDrawing} onUnlock={() => setHasSubmitted(false)} hasSubmitted={hasSubmitted} donePlayers={donePlayers} players={players} />
              )}
              {phase === "DESCRIBE" && (
                <DescribeStep ref={describeRef} imageBase64={currentImage ?? ""} timeLeft={timeLeft} currentRound={1} totalRounds={players.length > 0 ? players.length : 5} onSubmit={handleSubmitDescription} onUnlock={() => setHasSubmitted(false)} hasSubmitted={hasSubmitted} donePlayers={donePlayers} players={players} />
              )}
              {phase === null && (
                <div className="flex flex-col items-center justify-center pt-32 gap-4">
                  <Loader2 className="animate-spin text-[#9B6FDF]" size={48} />
                  <span className="text-sm text-[#7a6f99]">{t.common.waitingForGame}</span>
                </div>
              )}
              {phase === "REWIND" && <RewindViewer chains={chains} socket={socket} isHost={isHost} roomId={roomId} />}
              {phase === "FINISHED" && (
                <div className="flex flex-col items-center justify-center pt-32 gap-4">
                  <Loader2 className="animate-spin text-[#9B6FDF]" size={48} />
                  <span className="text-sm text-[#7a6f99]">{t.common.redirectingResults}</span>
                </div>
              )}
          </>
        </div>
      </div>
    </div>
    <BottomNav />
    </>
  );
}