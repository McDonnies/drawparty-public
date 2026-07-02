"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useSocket } from "@/hooks/useSocket";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Leaderboard } from "@/components/skribbl/Leaderboard";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import type { SkribblResultDTO, SkribblPlayerResultDTO, RoomDTO, RoomPlayerDTO } from "@/types/game";
import { useLanguage } from "@/context/LanguageContext";

// ── Mock data (dev fallback) ──────────────────────────────────────────────────

const MOCK_RESULTS: SkribblResultDTO = {
  results: [
    { clerkId: "user_1", username: "Alice",  avatarUrl: null, totalScore: 1240, correctGuesses: 4, timesDrawn: 2, rank: 1 },
    { clerkId: "user_2", username: "Bob",    avatarUrl: null, totalScore:  820, correctGuesses: 3, timesDrawn: 2, rank: 2 },
    { clerkId: "user_3", username: "Carol",  avatarUrl: null, totalScore:  410, correctGuesses: 1, timesDrawn: 2, rank: 3 },
  ],
  totalRounds: 6,
  winnerClerkId: "user_1",
  rounds: [
    { roundNumber: 1, drawerClerkId: "user_1", drawerUsername: "Alice", word: "horse",  imageUrl: null, correctGuessCount: 2 },
    { roundNumber: 2, drawerClerkId: "user_2", drawerUsername: "Bob",   word: "pizza",  imageUrl: null, correctGuessCount: 1 },
    { roundNumber: 3, drawerClerkId: "user_3", drawerUsername: "Carol", word: "guitar", imageUrl: null, correctGuessCount: 0 },
  ],
};

// ── Component ──────────────────────────────────────────────────────────────────

export default function SkribblResultsPage(): React.ReactElement {
  const params = useParams<{ roomId: string }>();
  const router = useRouter();
  const roomId = params.roomId;
  const currentUserId = useCurrentUserId();
  const { socket, isConnected } = useSocket();

  const [result, setResult] = useState<SkribblResultDTO | null>(null);
  const [isHost, setIsHost] = useState<boolean>(false);
  const [selectedRoundIndex, setSelectedRoundIndex] = useState<number | null>(null);
  const [filteredPlayerId, setFilteredPlayerId] = useState<string | null>(null);

  // Load results from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem(`skribbl_results`);
    if (stored) {
      try {
        setResult(JSON.parse(stored) as SkribblResultDTO);
      } catch {
        setResult(MOCK_RESULTS);
      }
    } else {
      setResult(MOCK_RESULTS);
    }
  }, [roomId]);

  // Socket: re-join room to receive new_game_started + resolve isHost
  useEffect(() => {
    if (!isConnected || !socket) return;

    socket.emit("room:join", { roomId });

    const onRoomJoined = (roomDTO: RoomDTO): void => {
      const me = roomDTO.players.find((p) => p.clerkId === currentUserId);
      setIsHost(me?.isHost ?? false);
    };

    const onNewGame = ({ newRoomId }: { newRoomId: string }): void => {
      router.push(`/skribbl/lobby/${newRoomId}`);
    };

    socket.on("room:joined", onRoomJoined);
    socket.on("room:new_game_started", onNewGame);

    return () => {
      socket.off("room:joined", onRoomJoined);
      socket.off("room:new_game_started", onNewGame);
    };
  }, [isConnected, socket, roomId, currentUserId, router]);

  // Adapt SkribblPlayerResultDTO[] → RoomPlayerDTO[] for the Leaderboard component
  function adaptToLeaderboardPlayers(results: SkribblPlayerResultDTO[]): RoomPlayerDTO[] {
    return results.map((r) => ({
      id: r.clerkId,
      userId: r.clerkId,
      clerkId: r.clerkId,
      username: r.username,
      avatarUrl: r.avatarUrl,
      isHost: false,
      isBot: false,
      score: r.totalScore,
      status: "CONNECTED" as const,
    }));
  }

  function handleNewGame(): void {
    socket?.emit("room:new_game", { roomId });
  }

  function handleShare(): void {
    const winner = result?.results[0];
    if (navigator.share) {
      void navigator.share({
        title: "DrawParty — Skribbl Results",
        text: `${winner?.username ?? "Someone"} won with ${winner?.totalScore ?? 0} points!`,
      });
    } else {
      toast.info("Take a screenshot to share your results!");
    }
  }

  const { t } = useLanguage();

  if (!result) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-[#0e0b1a] flex items-center justify-center text-[#7a6f99] pt-16">
          {t.common.loadingResults}
        </div>
        <BottomNav />
      </>
    );
  }

  const winner = result.results[0];

  return (
    <>
    <Navbar />
    <div className="min-h-screen bg-[#0e0b1a] text-white pt-16 pb-24 md:pb-8">
      <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col gap-8">

        {/* ── HEADER ───────────────────────────────────────────── */}
        <div className="text-center flex flex-col items-center gap-3">
          <Badge className="bg-[#9B6FDF]/20 text-[#9B6FDF] border border-[#9B6FDF]/30">
            Skribbl
          </Badge>
          <h1 className="text-3xl font-bold font-syne">{t.common.gameOver}</h1>

          {/* Winner hero */}
          {winner && (
            <div className="flex flex-col items-center gap-2 mt-2">
              <Avatar className="w-16 h-16">
                <AvatarImage src={winner.avatarUrl ?? undefined} />
                <AvatarFallback className="text-xl bg-[#7B4FBF] text-white">
                  {winner.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-white">{winner.username}</span>
                <span className="text-2xl">🏆</span>
              </div>
              <span className="text-[#9B6FDF] font-semibold">{winner.totalScore} pts</span>
            </div>
          )}

          <p className="text-sm text-[#7a6f99]">{t.skribbl.roundsPlayed.replace("{n}", String(result.totalRounds))}</p>
        </div>

        <Separator className="bg-[#211c38]" />

        {/* ── BODY ─────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-6 items-start">

          {/* Leaderboard */}
          <div className="w-full sm:w-56 shrink-0">
            <Leaderboard
              players={adaptToLeaderboardPlayers(result.results)}
              currentUserId={currentUserId ?? ""}
              onPlayerClick={(id) => setFilteredPlayerId(prev => prev === id ? null : id)}
              selectedPlayerId={filteredPlayerId}
            />
          </div>

          {/* Round gallery */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold font-syne text-white uppercase tracking-widest">
                {filteredPlayerId
                  ? `${result.results.find(r => r.clerkId === filteredPlayerId)?.username ?? t.dashboard.playerFallback}'s Drawings`
                  : t.skribbl.roundDrawings}
              </h2>
              {filteredPlayerId && (
                <button
                  onClick={() => setFilteredPlayerId(null)}
                  className="text-xs text-[#7a6f99] hover:text-white transition-colors"
                >
                  {t.skribbl.showAll}
                </button>
              )}
            </div>
            {result.rounds.length === 0 ? (
              <p className="text-sm text-[#7a6f99]">{t.skribbl.noRounds}</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {result.rounds.filter(r => !filteredPlayerId || r.drawerClerkId === filteredPlayerId).map((round) => {
                  const originalIndex = result.rounds.indexOf(round);
                  return (
                  <button
                    key={originalIndex}
                    onClick={() => setSelectedRoundIndex(originalIndex)}
                    className="bg-[#161228] border border-[#211c38] rounded-xl overflow-hidden text-left hover:border-[#7B4FBF] transition-colors"
                  >
                    {/* Drawing thumbnail */}
                    <div className="aspect-video bg-[#0e0b1a] flex items-center justify-center">
                      {round.imageUrl ? (
                        <img
                          src={round.imageUrl}
                          alt={round.word}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[#7a6f99] text-xs">{t.skribbl.noDrawing}</span>
                      )}
                    </div>
                    {/* Round info */}
                    <div className="p-3">
                      <p className="text-xs text-[#7a6f99]">{round.drawerUsername} drew:</p>
                      <p className="text-white font-bold truncate">{round.word}</p>
                      <p className="text-xs text-[#7a6f99] mt-1">
                        {t.skribbl.nGuessedCorrectly.replace("{n}", String(round.correctGuessCount))}
                      </p>
                    </div>
                  </button>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Round detail modal */}
        {selectedRoundIndex !== null && result.rounds[selectedRoundIndex] && (
          <div
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedRoundIndex(null)}
          >
            <div
              className="bg-[#161228] border border-[#211c38] rounded-2xl p-6 max-w-lg w-full flex flex-col gap-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#7a6f99]">
                    {result.rounds[selectedRoundIndex].drawerUsername} drew:
                  </p>
                  <p className="text-xl font-bold text-white">
                    {result.rounds[selectedRoundIndex].word}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedRoundIndex(null)}
                  className="text-[#7a6f99] hover:text-white text-lg leading-none"
                >
                  ✕
                </button>
              </div>
              <div className="bg-white rounded-xl overflow-hidden">
                {result.rounds[selectedRoundIndex].imageUrl ? (
                  <img
                    src={result.rounds[selectedRoundIndex].imageUrl!}
                    alt={result.rounds[selectedRoundIndex].word}
                    className="w-full object-contain max-h-[320px]"
                  />
                ) : (
                  <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
                    {t.skribbl.noDrawingSubmitted}
                  </div>
                )}
              </div>
              <p className="text-sm text-[#7a6f99] text-center">
                {t.skribbl.nGuessedCorrectly.replace("{n}", String(result.rounds[selectedRoundIndex].correctGuessCount))}
              </p>
            </div>
          </div>
        )}

        <Separator className="bg-[#211c38]" />

        {/* ── ACTION BUTTONS ───────────────────────────────────── */}
        <div className="flex flex-wrap gap-3 justify-center">
          {isHost && (
            <Button
              onClick={handleNewGame}
              className="bg-gradient-to-r from-[#7B4FBF] to-[#3AAFD4] text-white font-bold"
            >
              {t.skribbl.newGame}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => router.push("/")}
            className="border-[#211c38] text-[#7a6f99] hover:bg-[#1e1836] hover:text-white"
          >
            {t.skribbl.home}
          </Button>
          <Button
            variant="outline"
            onClick={handleShare}
            className="border-[#211c38] text-[#7a6f99] hover:bg-[#1e1836] hover:text-white"
          >
            {t.skribbl.shareResults}
          </Button>
        </div>

      </div>
    </div>
    <BottomNav />
    </>
  );
}
