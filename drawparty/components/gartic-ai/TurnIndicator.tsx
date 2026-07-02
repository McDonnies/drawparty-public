"use client";

import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { RoomPlayerDTO } from "@/types/game";
import { useLanguage } from "@/context/LanguageContext";

type TurnIndicatorProps = {
  players: RoomPlayerDTO[];
  playerOrder: string[];
  currentPlayerId: string;
  turnIndex: number;
  totalTurns: number;
  isMyTurn: boolean;
};

export function TurnIndicator({
  players,
  playerOrder,
  currentPlayerId,
  turnIndex,
  totalTurns,
  isMyTurn,
}: TurnIndicatorProps) {
  const { t } = useLanguage();
  const playerMap = new Map(players.map((p) => [p.clerkId, p]));

  return (
    <div className="flex items-center gap-2 flex-wrap justify-center">
      {playerOrder.map((clerkId, idx) => {
        const player = playerMap.get(clerkId);
        if (!player) return null;
        const isCurrent = clerkId === currentPlayerId;
        const isDone = idx < turnIndex;

        return (
          <motion.div
            key={clerkId}
            layout
            animate={isCurrent ? { scale: 1.15 } : { scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="flex flex-col items-center gap-1"
          >
            <div className="relative">
              <Avatar
                className={`w-9 h-9 border-2 transition-all ${
                  isCurrent
                    ? "border-[#7B4FBF] shadow-[0_0_12px_rgba(123,79,191,0.7)]"
                    : isDone
                    ? "border-[#3AAFD4] opacity-60"
                    : "border-[#211c38] opacity-40"
                }`}
              >
                <AvatarImage src={player.avatarUrl ?? undefined} />
                <AvatarFallback className="bg-[#211c38] text-white text-xs">
                  {player.username[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {isCurrent && (
                <motion.div
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#7B4FBF]"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              )}
              {isDone && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-[#0e0b1a]/60">
                  <span className="text-[#3AAFD4] text-xs font-bold">✓</span>
                </div>
              )}
            </div>
            <span
              className={`text-[10px] max-w-[44px] truncate text-center ${
                isCurrent ? "text-[#9B6FDF] font-semibold" : "text-[#7a6f99]"
              }`}
            >
              {player.username}
            </span>
          </motion.div>
        );
      })}

      <div className="ml-2 flex flex-col items-center">
        <span className="text-xs text-[#7a6f99]">{turnIndex + 1}/{totalTurns}</span>
        {isMyTurn ? (
          <span className="text-[10px] font-semibold text-[#7B4FBF] mt-0.5">{t.garticAI.yourTurn}</span>
        ) : (
          <span className="text-[10px] text-[#7a6f99] mt-0.5">{t.garticAI.waitingTurn}</span>
        )}
      </div>
    </div>
  );
}
