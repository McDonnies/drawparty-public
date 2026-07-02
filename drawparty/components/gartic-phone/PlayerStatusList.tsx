"use client";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Check, Loader2 } from "lucide-react";
import type { RoomPlayerDTO } from "@/types/game";
import { useLanguage } from "@/context/LanguageContext";

// ── Props ──────────────────────────────────────────────────────────────────

type PlayerStatusListProps = {
  // players — full player list for the current game
  players: RoomPlayerDTO[];

  // donePlayers — set of clerkIds who have submitted for this round
  donePlayers: Set<string>;

  // variant — "full" shows usernames; "mini" shows avatars only (used in top bar)
  variant?: "full" | "mini";
};

// ── Component ──────────────────────────────────────────────────────────────

/**
 * Read-only list showing player completion status for the current round.
 *
 * Done indicator: green checkmark overlay on avatar / green dot next to name
 * Pending: avatar slightly dimmed (opacity-50) / no indicator
 * Disconnected: "absent" badge — round continues without them after 30s
 *
 * Updated automatically: parent passes the `donePlayers` set which grows
 * as the server emits "gartic:player_done" events.
 *
 * STRUCTURE — variant="full":
 *   [LIST] flex-col gap-2
 *     For each player:
 *       [ROW] flex items-center gap-2
 *         [AVATAR WRAPPER] relative w-8 h-8
 *           <Avatar> — AvatarImage + AvatarFallback
 *           if done: absolute inset-0 rounded-full bg-emerald-400/20 flex items-center justify-center
 *                    <Check size={12} className="text-emerald-400" />
 *           if !done && status === DISCONNECTED: opacity-40 + small yellow dot
 *         <span> player.username (text-sm)
 *         if done: <Check size={14} className="text-emerald-400 ml-auto" />
 *         else: <Loader2 size={14} className="text-[#7a6f99] ml-auto animate-spin" />
 *
 * STRUCTURE — variant="mini":
 *   [ROW] flex items-center gap-1
 *     For each player: <Avatar w-6 h-6> with opacity-40 if pending, full opacity if done
 *     Done count badge: "{donePlayers.size} / {players.length}"
 */
export function PlayerStatusList({ players, donePlayers, variant = "full" }: PlayerStatusListProps) {
  const { t } = useLanguage();
  const doneCount = players.filter((player) => donePlayers.has(player.clerkId)).length;

  if (variant === "mini") {
    return (
      <div className="flex items-center gap-2" aria-label="Player submission status">
        <div className="flex items-center gap-1">
          {players.map((player) => {
            const isDone = donePlayers.has(player.clerkId);
            const isDisconnected = player.status === "DISCONNECTED";

            return (
              <div key={player.clerkId} className="relative">
                <Avatar
                  className={`w-6 h-6 border border-[#211c38] ${isDone ? "opacity-100" : "opacity-40"}`}
                  aria-label={`${player.username} ${isDone ? "done" : "pending"}`}
                >
                  <AvatarImage src={player.avatarUrl ?? undefined} />
                  <AvatarFallback className="bg-[#211c38] text-white text-[10px]">
                    {player.username[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {isDone && (
                  <span className="absolute -right-0.5 -bottom-0.5 w-3 h-3 rounded-full bg-emerald-500 flex items-center justify-center">
                    <Check size={8} className="text-white" aria-hidden="true" />
                  </span>
                )}
                {!isDone && isDisconnected && (
                  <span
                    className="absolute -right-0.5 -bottom-0.5 w-2.5 h-2.5 rounded-full bg-yellow-400"
                    aria-label={`${player.username} disconnected`}
                  />
                )}
              </div>
            );
          })}
        </div>
        <span className="text-xs text-[#7a6f99] tabular-nums">{doneCount} / {players.length}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2" aria-label="Player submission status" aria-live="polite">
      {players.map((player) => {
        const isDone = donePlayers.has(player.clerkId);
        const isDisconnected = player.status === "DISCONNECTED";

        return (
          <div key={player.clerkId} className="flex items-center gap-2">
            <div className="relative w-8 h-8">
              <Avatar className={`w-8 h-8 border border-[#211c38] ${!isDone ? "opacity-50" : ""}`}>
                <AvatarImage src={player.avatarUrl ?? undefined} />
                <AvatarFallback className="bg-[#211c38] text-white text-xs">
                  {player.username[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {isDone && (
                <span className="absolute inset-0 rounded-full bg-emerald-400/20 flex items-center justify-center">
                  <Check size={12} className="text-emerald-400" aria-hidden="true" />
                </span>
              )}
              {!isDone && isDisconnected && (
                <span className="absolute -right-0.5 -bottom-0.5 w-2.5 h-2.5 rounded-full bg-yellow-400" aria-label="Disconnected" />
              )}
            </div>
            <span className="text-sm text-white">{player.username}</span>
            {isDone ? (
              <Check size={14} className="text-emerald-400 ml-auto" aria-label={`${player.username} done`} />
            ) : (
              <Loader2 size={14} className="text-[#7a6f99] ml-auto animate-spin" aria-label={`${player.username} pending`} />
            )}
          </div>
        );
      })}
      {players.length > 0 && doneCount === players.length && (
        <p className="text-xs text-emerald-400 text-center">{t.garticPhone.allReady}</p>
      )}
    </div>
  );
}
