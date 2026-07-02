"use client";

import type { RoomPlayerDTO } from "@/types/game";
import type React from "react";
import { useLanguage } from "@/context/LanguageContext";

// ── Props ──────────────────────────────────────────────────────────────────

type LeaderboardProps = {
  /**
   * Players to display, already carrying up-to-date scores.
   * The component sorts them by score descending — do NOT pre-sort in the parent.
   * Pass RoomPlayerDTO[] from the skribbl:phase_changed payload's `players` field.
   */
  players: RoomPlayerDTO[];
  /** Current viewer's clerkId — used to highlight the "You" row */
  currentUserId: string;
  /**
   * When true (set briefly on ROUND_END), show an animated "+N pts" badge
   * next to each player whose score changed since the last round.
   * The parent calculates the delta and passes it via deltaScores below.
   */
  highlightRound?: boolean;
  /**
   * Map of clerkId → points gained this round.
   * Only relevant when highlightRound=true.
   * Example: { "user_abc": 320, "user_def": 200 }
   */
  deltaScores?: Record<string, number>;
  /**
   * Optional callback fired when a player row is clicked.
   * Used on the results page to filter drawings by player.
   */
  onPlayerClick?: (clerkId: string) => void;
  /** clerkId of the currently selected/highlighted player (results page filter) */
  selectedPlayerId?: string | null;
  /** Set of clerkIds who have guessed correctly this round — shown with ✓ indicator */
  guessedPlayerIds?: Set<string>;
};

// ── Component ──────────────────────────────────────────────────────────────
//
// Layout (vertical list — left sidebar on the play page):
//
//   ┌─────────────────────────────┐
//   │  Leaderboard                │  ← header
//   │─────────────────────────────│
//   │  👑 1  [avatar] Alice  480  │  ← rank 1 (crown icon)
//   │     2  [avatar] You    320  │  ← current player (highlight bg)
//   │     3  [avatar] Bob    140  │
//   │     4  [avatar] Carol    0  │
//   └─────────────────────────────┘
//
// Row styles:
//   CURRENT USER → bg-[#7B4FBF]/20 border border-[#7B4FBF]/40 rounded-lg
//   RANK 1        → crown emoji before rank number (or lucide Crown icon)
//   ALL ROWS      → flex items-center gap-3 px-3 py-2 text-sm
//
// Avatar:
//   w-7 h-7 rounded-full, avatarUrl or initials fallback (same as ChatGuess.tsx)
//
// Score:
//   ml-auto text-white font-bold
//
// +N pts badge (when highlightRound=true and delta > 0):
//   Absolutely positioned or inline after the score
//   text-emerald-400 text-xs font-bold animate-[fadeInUp_0.4s_ease-out]
//   Hide after 2.5s (CSS animation with forwards fill-mode or JS setTimeout)
//
// Inline keyframe for badge animation (same style as RewindViewer.tsx):
//   @keyframes fadeInUp {
//     0%   { opacity: 0; transform: translateY(4px); }
//     20%  { opacity: 1; transform: translateY(0); }
//     80%  { opacity: 1; transform: translateY(0); }
//     100% { opacity: 0; transform: translateY(-4px); }
//   }

export function Leaderboard({
  players,
  currentUserId,
  highlightRound = false,
  deltaScores = {},
  onPlayerClick,
  selectedPlayerId = null,
  guessedPlayerIds,
}: LeaderboardProps): React.ReactElement {
  const { t } = useLanguage();
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          0%   { opacity: 0; transform: translateY(4px); }
          20%  { opacity: 1; transform: translateY(0); }
          80%  { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-4px); }
        }
      `}</style>
      <div className="flex flex-col border border-[#211c38] rounded-xl bg-[#0e0b1a] overflow-hidden h-full">

        {/* Header */}
        <div className="px-4 py-3 border-b border-[#211c38]">
          <h3 className="text-sm font-semibold text-white">{t.skribbl.leaderboard}</h3>
        </div>

        {/* Player rows */}
        <div className="flex flex-col gap-1 p-2">
          {sorted.map((player, index) => {
            const rank = index + 1;
            const isMe = player.clerkId === currentUserId;
            const delta = deltaScores[player.clerkId] ?? 0;
            const isSelected = selectedPlayerId === player.clerkId;
            const hasGuessed = guessedPlayerIds?.has(player.clerkId) ?? false;

            return (
              <div
                key={player.clerkId}
                onClick={() => onPlayerClick?.(player.clerkId)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
                  ${onPlayerClick ? "cursor-pointer" : ""}
                  ${isSelected ? "bg-[#3AAFD4]/20 border border-[#3AAFD4]/40" : hasGuessed ? "bg-emerald-500/10 border border-emerald-500/30" : isMe ? "bg-[#7B4FBF]/20 border border-[#7B4FBF]/40" : "hover:bg-[#161228]"}`}
              >
                {/* Rank */}
                <span className="text-[#7a6f99] w-5 text-center flex-shrink-0">
                  {rank === 1 ? "👑" : rank}
                </span>

                {/* Avatar */}
                <div className="w-7 h-7 rounded-full flex-shrink-0 bg-[#211c38] overflow-hidden">
                  {player.avatarUrl
                    ? <img src={player.avatarUrl} alt={player.username} className="w-full h-full object-cover" />
                    : <span className="text-xs text-white flex items-center justify-center h-full">{player.username[0]?.toUpperCase()}</span>
                  }
                </div>

                {/* Username + guessed indicator */}
                <span className={`flex-1 truncate ${isMe ? "text-white font-semibold" : "text-[#7a6f99]"}`}>
                  {isMe ? t.common.you : player.username}
                </span>
                {hasGuessed && (
                  <span className="text-emerald-400 text-xs flex-shrink-0">✓</span>
                )}

                {/* Score + delta badge */}
                <div className="relative flex-shrink-0">
                  <span className="text-white font-bold ml-auto">{player.score}</span>
                  {highlightRound && delta > 0 && (
                    <span
                      className="absolute -top-4 right-0 text-emerald-400 text-xs font-bold whitespace-nowrap"
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
    </>
  );
}
