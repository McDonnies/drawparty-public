"use client";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Crown } from "lucide-react";
import { toast } from "sonner";
import type { RoomPlayerDTO } from "@/types/game";
import { useLanguage } from "@/context/LanguageContext";

// ── Props ──────────────────────────────────────────────────────────────────

type PlayerListProps = {
  players: RoomPlayerDTO[];
  isHost: boolean;
  currentUserId: string;
  onKick: (playerId: string) => void;
  maxPlayers: number;
};

// ── Component ──────────────────────────────────────────────────────────────

export function PlayerList({
  players,
  isHost,
  currentUserId,
  onKick,
  maxPlayers,
}: PlayerListProps): React.ReactElement {
  const { t } = useLanguage();
  const hasRoom = players.length < maxPlayers;

  function handleKick(player: RoomPlayerDTO): void {
    // Easter egg: cannot kick Adam (Project Manager)
    if (player.username === "Adam") {
      toast.error("Permission denied. You cannot kick the Project Manager.");
      return;
    }
    onKick(player.clerkId);
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs uppercase tracking-widest text-[#7a6f99]">
          {t.lobby.playersHeader}
        </span>
        <span className="text-xs text-[#7a6f99]">
          {players.length} / {maxPlayers}
        </span>
      </div>

      {/* Player rows */}
      <div className="flex flex-col gap-1.5">
        {players.map((player) => {
          const isMe = player.clerkId === currentUserId;
          const fallback = player.username.charAt(0).toUpperCase();

          return (
            <div
              key={player.id}
              className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                isMe ? "bg-[#1e1836]" : "hover:bg-[#1e1836]/50"
              }`}
            >
              {/* Avatar */}
              <Avatar className="w-8 h-8 shrink-0">
                {player.avatarUrl && <AvatarImage src={player.avatarUrl} alt={player.username} />}
                <AvatarFallback className="bg-[#7B4FBF] text-white text-xs font-bold">
                  {fallback}
                </AvatarFallback>
              </Avatar>

              {/* Name + badges */}
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <span className="text-sm font-medium text-white truncate">
                  {player.username}
                </span>
                {isMe && (
                  <Badge className="bg-[#7B4FBF] text-white text-[10px] px-1.5 py-0 shrink-0">
                    {t.common.you}
                  </Badge>
                )}
                {player.isHost && (
                  <Crown size={13} className="text-[#F5C518] shrink-0" />
                )}
              </div>

              {/* Status dot */}
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  player.status === "CONNECTED"
                    ? "bg-emerald-400"
                    : "bg-yellow-400"
                }`}
              />

              {/* Kick button (host only, not self, not other hosts) */}
              {isHost && !player.isHost && !isMe && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 shrink-0 text-[#7a6f99] hover:text-[#FF6B6B] hover:bg-[#FF6B6B]/10"
                  onClick={(): void => handleKick(player)}
                >
                  <X size={14} />
                </Button>
              )}
            </div>
          );
        })}

        {/* Single placeholder shown when room isn't full */}
        {hasRoom && (
          <div className="flex items-center gap-3 p-2 rounded-lg opacity-30">
            <div className="w-8 h-8 rounded-full bg-[#211c38]" />
            <span className="text-sm text-[#7a6f99] italic">{t.lobby.waitingDots}</span>
          </div>
        )}
      </div>
    </div>
  );
}
