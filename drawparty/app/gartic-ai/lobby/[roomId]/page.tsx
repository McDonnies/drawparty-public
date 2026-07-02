"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { toast } from "sonner";

import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { RoomCodeDisplay } from "@/components/lobby/RoomCodeDisplay";
import { PlayerList } from "@/components/lobby/PlayerList";
import { LobbyChat } from "@/components/lobby/LobbyChat";

import { useRoom } from "@/hooks/useRoom";
import { useSocket } from "@/hooks/useSocket";
import { useLanguage } from "@/context/LanguageContext";
import type { RoomDTO } from "@/types/game";

import { LogOut, Bot } from "lucide-react";

export default function GarticAILobbyPage(): React.ReactElement {
  const params = useParams<{ roomId: string }>();
  const router = useRouter();
  const currentUserId = useCurrentUserId();
  const roomId = params.roomId;

  const { socket } = useSocket();
  const { t } = useLanguage();
  const { room, players, isHost, chatMessages, isLoading } = useRoom(roomId);

  const [isChatRateLimited, setIsChatRateLimited] = useState<boolean>(false);
  const rateLimitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleServerError = ({ message }: { message: string }): void => {
      toast.error(message);
    };
    socket.on("error" as any, handleServerError);
    return () => { socket.off("error" as any, handleServerError); };
  }, [socket]);

  useEffect(() => {
    const handleGameStarted = ({ roomId: rid }: { roomId: string }): void => {
      router.push(`/gartic-ai/play/${rid}`);
    };
    socket.on("room:game_started", handleGameStarted);
    return () => { socket.off("room:game_started", handleGameStarted); };
  }, [socket, router]);

  async function copyInviteLink(): Promise<void> {
    if (!room) return;
    const link = `${window.location.origin}/join/${(room as RoomDTO).code}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success(t.lobby.inviteCopied);
    } catch {
      toast.error(t.lobby.inviteFailed);
    }
  }

  function kickPlayer(playerId: string): void {
    if (!isHost) return;
    socket.emit("room:kick_player", { targetId: playerId });
  }

  function startGame(): void {
    if (!isHost) return;
    if (players.length < 2) {
      toast.warning(t.lobby.needMorePlayers);
      return;
    }
    socket.emit("room:start_game", {});
  }

  function sendMessage(message: string): void {
    if (message === "" || isChatRateLimited) return;
    socket.emit("lobby:chat_message", { roomId, message });
    setIsChatRateLimited(true);
    rateLimitTimerRef.current = setTimeout((): void => setIsChatRateLimited(false), 500);
  }

  function leaveLobby(): void {
    socket.emit("room:leave", { roomId });
    router.push("/");
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#0e0b1a] pt-0 md:pt-16 pb-20 md:pb-8">

        <div className="max-w-7xl mx-auto px-4 mt-6">
          <div className="border border-[#211c38] bg-[#161228] rounded-xl px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
            <div className="flex items-center justify-between sm:contents gap-4">
              <Button
                variant="ghost"
                size="sm"
                className="text-[#FF6B6B] hover:text-[#FF6B6B] hover:bg-[#FF6B6B]/10 shrink-0"
                onClick={leaveLobby}
              >
                <LogOut size={14} className="mr-1.5" />
                {t.lobby.leave}
              </Button>
              <span className="sm:hidden text-xs uppercase tracking-widest text-[#7a6f99] font-medium">
                {t.lobby.waitingForPlayers}
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-2">
              <Bot size={14} className="text-[#3AAFD4]" />
              <span className="text-xs uppercase tracking-widest text-[#7a6f99] font-medium">
                Gartic AI — {t.garticAI.aiJudgeMode}
              </span>
            </div>

            {isLoading ? (
              <Skeleton className="h-14 w-full sm:h-7 sm:w-36" />
            ) : (
              <RoomCodeDisplay code={(room as RoomDTO)?.code ?? "------"} />
            )}
          </div>
        </div>

        {/* How it works banner */}
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <div className="rounded-xl bg-[#3AAFD4]/10 border border-[#3AAFD4]/20 px-4 py-3 flex flex-wrap gap-4 items-center justify-center text-sm text-[#7a6f99]">
            <span className="flex items-center gap-1.5"><span className="text-base">🤖</span> {t.garticAI.howItWorks1}</span>
            <span className="text-[#211c38]">•</span>
            <span className="flex items-center gap-1.5"><span className="text-base">🎨</span> {t.garticAI.howItWorks2}</span>
            <span className="text-[#211c38]">•</span>
            <span className="flex items-center gap-1.5"><span className="text-base">❤️</span> {t.garticAI.howItWorks3}</span>
            <span className="text-[#211c38]">•</span>
            <span className="flex items-center gap-1.5"><span className="text-base">✅</span> {t.garticAI.howItWorks4}</span>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row gap-6 items-stretch">

            {/* Players */}
            <div className="flex-1 min-w-0">
              <div className="rounded-xl bg-[#161228] border border-[#211c38] p-4 h-full">
                {isLoading ? (
                  <div className="flex flex-col gap-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="w-8 h-8 rounded-full" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <PlayerList
                    players={players}
                    isHost={isHost}
                    currentUserId={currentUserId}
                    onKick={kickPlayer}
                    maxPlayers={8}
                  />
                )}
              </div>
            </div>

            {/* Start + invite */}
            <div className="flex-1 min-w-0">
              {isLoading ? (
                <div className="rounded-xl bg-[#161228] border border-[#211c38] p-4 h-full">
                  <Skeleton className="h-4 w-full mb-3" />
                </div>
              ) : (
                <div className="rounded-xl bg-[#161228] border border-[#211c38] p-6 h-full flex flex-col gap-6 items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#7B4FBF] to-[#3AAFD4] flex items-center justify-center mx-auto mb-3 text-2xl shadow-[0_0_24px_rgba(123,79,191,0.4)]">
                      🤖
                    </div>
                    <p className="text-white font-syne font-bold text-lg">Gartic AI</p>
                    <p className="text-[#7a6f99] text-sm mt-1">{t.garticAI.collaborativeDesc}</p>
                  </div>

                  <div className="flex items-center justify-center gap-3 w-full">
                    {isHost && (
                      <Button
                        onClick={startGame}
                        disabled={players.length < 2}
                        className="bg-gradient-to-r from-[#7B4FBF] to-[#3AAFD4] text-white font-syne font-bold hover:opacity-90 px-10 py-2 transition-all hover:shadow-[0_0_20px_rgba(123,79,191,0.5)] disabled:opacity-40"
                      >
                        {t.lobby.startGame}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="border-[#211c38] text-white hover:bg-[#1e1836] px-10 py-2"
                      onClick={(): void => void copyInviteLink()}
                    >
                      {t.lobby.inviteLink}
                    </Button>
                  </div>

                  {!isHost && (
                    <p className="text-[#7a6f99] text-sm text-center">{t.lobby.waitingForHost}</p>
                  )}
                </div>
              )}
            </div>

            {/* Chat */}
            <div className="flex-1 min-w-0">
              <div className="rounded-xl bg-[#161228] border border-[#211c38] p-4 h-[min(420px,50vh)] lg:h-full">
                <LobbyChat
                  messages={chatMessages}
                  currentUserId={currentUserId}
                  onSendMessage={sendMessage}
                  isRateLimited={isChatRateLimited}
                />
              </div>
            </div>

          </div>
        </div>
      </div>
      <BottomNav />
    </>
  );
}
