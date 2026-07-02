"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useSocket } from "@/hooks/useSocket";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { StrokeReplayCanvas } from "@/components/gartic-phone/RewindViewer";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import type { GarticResultDTO, GarticChainDTO, GarticChainStepDTO, GarticPlayerResultDTO, FabricStroke, RoomDTO } from "@/types/game";
import { useLanguage } from "@/context/LanguageContext";

const MOCK_RESULTS: GarticResultDTO = {
  chains: [] as GarticChainDTO[],
  playerResults: [
    { clerkId: "user_mock1", username: "sketchy_leo", avatarUrl: null, rank: 1, promptsWritten: 1, drawingsSubmitted: 2, descriptionsWritten: 2 },
    { clerkId: "user_mock2", username: "artsy_mia", avatarUrl: null, rank: 1, promptsWritten: 1, drawingsSubmitted: 2, descriptionsWritten: 2 },
    { clerkId: "user_mock3", username: "doodle_max", avatarUrl: null, rank: 1, promptsWritten: 1, drawingsSubmitted: 1, descriptionsWritten: 2 },
  ],
};

function StaticStepItem({ step }: { step: GarticChainStepDTO }): React.ReactElement {
  const { t } = useLanguage();
  if (step.type === "DRAW") {
    const strokes: FabricStroke[] = step.strokeData
      ? (() => { try { return JSON.parse(step.strokeData) as FabricStroke[]; } catch { return []; } })()
      : [];
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Avatar className="w-5 h-5 shrink-0">
            <AvatarFallback className="text-[9px] bg-[#7B4FBF] text-white">
              {step.authorUsername.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-[#7a6f99]">{step.authorUsername} {t.garticPhone.drew}</span>
        </div>
        {strokes.length > 0 ? (
          <StrokeReplayCanvas strokes={strokes} fresh={false} />
        ) : step.imageBase64 ? (
            <div className="bg-white rounded-xl overflow-hidden border border-[#211c38] w-full max-w-[520px]">
            <img
              src={step.imageBase64}
              alt={`Drawing by ${step.authorUsername}`}
              className="w-full max-h-[320px] object-contain"
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-24 bg-[#1e1836] rounded-xl border border-[#211c38] text-[#7a6f99] text-sm">
            {t.garticPhone.noDrawing}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <span className="text-xs text-[#7a6f99]">
          {step.authorUsername} {t.garticPhone.said}
        </span>
        <Avatar className="w-5 h-5 shrink-0">
          <AvatarFallback className="text-[9px] bg-[#3AAFD4] text-white">
            {step.authorUsername.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>
      <div className="bg-[#9B6FDF] rounded-2xl rounded-tr-sm px-3 py-2 max-w-[360px]">
        <p className="text-sm text-white leading-relaxed break-words">
          {step.content ?? <span className="italic opacity-70">{t.garticPhone.noContent}</span>}
        </p>
      </div>
    </div>
  );
}

export default function GarticResultsPage(): React.ReactElement {
  const { t } = useLanguage();
  const params = useParams<{ roomId: string }>();
  const router = useRouter();
  const currentUserId = useCurrentUserId();
  const { socket, isConnected } = useSocket();

  const roomId = params.roomId;

  const [isHost, setIsHost] = useState<boolean>(false);
  const [results, setResults] = useState<GarticResultDTO | null>(null);
  const [playerResults, setPlayerResults] = useState<GarticPlayerResultDTO[]>([]);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState<boolean>(false);

  async function shareResults(): Promise<void> {
    if (!results || results.chains.length === 0) {
      toast.info(t.garticPhone.noChains);
      return;
    }
    setIsSharing(true);
    const toastId = toast.loading("Generating image…");
    try {
      const { generateGarticCollage } = await import("@/lib/garticCollage");
      const dataUrl = await generateGarticCollage(results.chains);
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `drawparty-gartic-${roomId}.png`;
      a.click();
      toast.dismiss(toastId);
      toast.success("Image downloaded!");
    } catch {
      toast.dismiss(toastId);
      toast.error("Failed to generate image.");
    } finally {
      setIsSharing(false);
    }
  }

  function createNewGame(): void {
    if (!socket) return;
    socket.emit("room:new_game", { roomId });
  }

  function returnToHome(): void {
    router.push("/");
  }

  // Re-join the old room so the host can broadcast "New Game" and isHost is resolved.
  useEffect(() => {
    if (!isConnected || !socket) return;

    socket.emit("room:join", { roomId });

    const onRoomJoined = (roomDTO: RoomDTO) => {
      const me = roomDTO.players.find((p) => p.clerkId === currentUserId);
      setIsHost(me?.isHost ?? false);
    };

    const onNewGameStarted = ({ newRoomId }: { newRoomId: string }) => {
      router.push(`/gartic-phone/lobby/${newRoomId}`);
    };

    socket.on("room:joined", onRoomJoined);
    socket.on("room:new_game_started", onNewGameStarted);

    return () => {
      socket.off("room:joined", onRoomJoined);
      socket.off("room:new_game_started", onNewGameStarted);
    };
  }, [isConnected, socket, roomId, currentUserId, router]);

  // Load results from sessionStorage (stored by play page on gartic:game_ended).
  // Falls back to MOCK_RESULTS if session data is missing (e.g. direct page load in dev).
  useEffect(() => {
    const stored = sessionStorage.getItem(`gartic:results:${roomId}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as GarticResultDTO;
        setResults(parsed);
        setPlayerResults(parsed.playerResults);
        setSelectedOwnerId(parsed.chains[0]?.ownerId ?? null);
        return;
      } catch {
        // Malformed data — fall through to mock
      }
    }
    // Dev fallback
    setResults(MOCK_RESULTS);
    setPlayerResults(MOCK_RESULTS.playerResults);
    setSelectedOwnerId(MOCK_RESULTS.chains[0]?.ownerId ?? null);
  }, [roomId]);

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <>
    <Navbar />
    <div className="min-h-screen bg-[#0e0b1a] pt-16 pb-24 md:pb-8">
      <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-8">

        {/* ── HEADER ──────────────────────────────────────────── */}
        <div className="text-center flex flex-col items-center gap-2">
          <h1 className="text-3xl font-bold font-syne text-white">{t.common.gameOver}</h1>
          <Badge className="bg-[#9B6FDF]/20 text-[#9B6FDF] border border-[#9B6FDF]/30">
            Gartic Phone
          </Badge>
        </div>

        {/* ── CHAIN REWIND ────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-bold font-syne text-white uppercase tracking-widest">
            {t.garticPhone.chainRewind}
          </h2>
          {results && results.chains.length > 0 ? (
              <div className="flex flex-col sm:flex-row gap-4 min-h-[300px]">
              {/* Left column — player list */}
              <div className="flex flex-row sm:flex-col gap-1 w-full sm:w-40 overflow-x-auto shrink-0 pb-2 sm:pb-0">
                {results.chains.map((chain) => {
                  const avatar = results.playerResults.find(
                    (p) => p.clerkId === chain.ownerId
                  )?.avatarUrl;
                  const selected = chain.ownerId === selectedOwnerId;
                  return (
                    <button
                      key={chain.chainId}
                      onClick={() => setSelectedOwnerId(chain.ownerId)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-colors ${selected
                          ? "bg-[#1e1836] border border-[#9B6FDF]/50 text-white"
                          : "text-[#7a6f99] hover:bg-[#161228] hover:text-white"
                        }`}
                    >
                      <Avatar className="w-6 h-6 shrink-0">
                        <AvatarImage src={avatar ?? undefined} />
                        <AvatarFallback className="text-[10px] bg-[#7B4FBF] text-white">
                          {chain.ownerUsername.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium truncate">{chain.ownerUsername}</span>
                    </button>
                  );
                })}
              </div>

              {/* Right column — selected chain steps */}
              <div className="flex-1 min-w-0">
                {(() => {
                  const chain = results.chains.find((c) => c.ownerId === selectedOwnerId);
                  if (!chain) return null;
                  return (
                    <div className="flex flex-col gap-5">
                      <span className="text-xs text-[#7a6f99] font-mono uppercase tracking-widest">
                        {t.garticPhone.ownerStory.replace("{n}", chain.ownerUsername)}
                      </span>
                      {chain.steps.map((step: GarticChainStepDTO, i: number) => (
                        <StaticStepItem key={`${chain.chainId}-${i}`} step={step} />
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : (
            <p className="text-sm text-[#7a6f99]">{t.garticPhone.noChains}</p>
          )}
        </div>

        <Separator className="bg-[#211c38]" />

        {/* ── ACTION BUTTONS ──────────────────────────────────── */}
        <div className="flex flex-wrap gap-3 justify-center">
          {isHost && (
            <Button
              onClick={createNewGame}
              className="bg-gradient-to-r from-[#7B4FBF] to-[#3AAFD4] text-white font-bold"
            >
              {t.common.newGame}
            </Button>
          )}

          <Button
            variant="outline"
            onClick={returnToHome}
            className="border-[#211c38] text-[#7a6f99] hover:bg-[#1e1836] hover:text-white"
          >
            {isHost ? t.lobby.leave : t.nav.home}
          </Button>

          <Button
            variant="outline"
            onClick={() => void shareResults()}
            disabled={isSharing}
            className="border-[#211c38] text-[#7a6f99] hover:bg-[#1e1836] hover:text-white disabled:opacity-50"
          >
            {isSharing ? "Generating…" : t.garticPhone.shareResults}
          </Button>
        </div>

      </div>
    </div>
    <BottomNav />
    </>
  );
}