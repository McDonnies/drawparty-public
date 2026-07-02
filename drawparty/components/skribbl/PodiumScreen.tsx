"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy } from "lucide-react";
import type { SkribblPlayerResultDTO } from "@/types/game";
import { useLanguage } from "@/context/LanguageContext";

type Props = {
  results: SkribblPlayerResultDTO[];
  onComplete: () => void;
  delayMs?: number;
};

// Platform colors per rank
const RANK_STYLE: Record<number, { platform: string; label: string }> = {
  1: { platform: "bg-yellow-400/20 border-yellow-400/50", label: "text-yellow-300" },
  2: { platform: "bg-slate-400/20 border-slate-400/50",   label: "text-slate-300"  },
  3: { platform: "bg-amber-700/20 border-amber-600/50",   label: "text-amber-500"  },
};

// Platform heights per rank, responsive (mobile → sm → md)
const RANK_HEIGHT: Record<number, string> = {
  1: "h-14 sm:h-20 md:h-28",
  2: "h-10 sm:h-14 md:h-20",
  3: "h-7  sm:h-10 md:h-14",
};

function PlayerAvatar({
  player,
  className,
  textSize,
}: {
  player: SkribblPlayerResultDTO;
  className: string;
  textSize: string;
}): React.ReactElement {
  return (
    <Avatar className={className}>
      <AvatarImage src={player.avatarUrl ?? undefined} />
      <AvatarFallback className={`bg-[#7B4FBF] text-white ${textSize}`}>
        {player.username.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}

export function PodiumScreen({ results, onComplete, delayMs = 5500 }: Props): React.ReactElement {
  const { t } = useLanguage();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      setProgress(Math.min(elapsed / delayMs, 1));
      if (elapsed >= delayMs) {
        clearInterval(interval);
        onComplete();
      }
    }, 30);
    return () => clearInterval(interval);
  }, [delayMs, onComplete]);

  const podiumOrder = [
    { rank: 2, player: results.find((r) => r.rank === 2) ?? null },
    { rank: 1, player: results.find((r) => r.rank === 1) ?? null },
    { rank: 3, player: results.find((r) => r.rank === 3) ?? null },
  ];
  const rest = results.filter((r) => r.rank > 3);

  return (
    <AnimatePresence>
      <motion.div
        key="podium-screen"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        // Same bg + blur as ROUND_END overlay: bg-[#0e0b1a]/80 backdrop-blur-sm
        className="absolute inset-0 z-10 rounded-xl flex flex-col items-center justify-center overflow-y-auto py-4 bg-[#0e0b1a]/80 backdrop-blur-sm"
      >
        {/* Title */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.45, ease: "easeOut" }}
          className="flex flex-col items-center gap-1 mb-6 sm:mb-8 md:mb-10"
        >
          <Trophy className="text-yellow-400 w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />
          <h2 className="text-xl sm:text-2xl font-bold font-syne text-white tracking-wide">
            {t.common.gameOver}
          </h2>
        </motion.div>

        {/* Podium */}
        <div className="flex items-end gap-2 sm:gap-3 md:gap-4 mb-5 sm:mb-6 md:mb-8">
          {podiumOrder.map(({ rank, player }, i) => {
            if (!player) return <div key={rank} className="w-14 sm:w-18 md:w-24" />;
            const style = RANK_STYLE[rank] ?? RANK_STYLE[3];
            const isFirst = rank === 1;

            // Avatar responsive sizing
            const avatarClass = isFirst
              ? "w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16"
              : "w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12";
            const avatarText = isFirst
              ? "text-lg sm:text-xl md:text-2xl"
              : "text-sm sm:text-base md:text-lg";

            return (
              <motion.div
                key={player.clerkId}
                initial={{ y: 36, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 + i * 0.12, duration: 0.45, ease: "easeOut" }}
                className="flex flex-col items-center gap-1 sm:gap-2"
              >
                {/* Avatar + labels */}
                <div className="flex flex-col items-center gap-0.5 sm:gap-1">
                  {isFirst ? (
                    <motion.div
                      animate={{
                        x: [0, 0, 0, -5, 5, -3, 3, 0, 0, 0, 0],
                        y: [0, 0, 0, -7, -2, -7, -2, 0, 0, 0, 0],
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 4,
                        ease: "easeInOut",
                        times: [0, 0.22, 0.28, 0.38, 0.48, 0.58, 0.68, 0.78, 0.88, 0.94, 1],
                      }}
                    >
                      <PlayerAvatar player={player} className={avatarClass} textSize={avatarText} />
                    </motion.div>
                  ) : (
                    <PlayerAvatar player={player} className={avatarClass} textSize={avatarText} />
                  )}

                  <span className={`text-[10px] sm:text-[11px] font-bold ${style.label}`}>
                    #{rank}
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-[#9a8fc0] w-14 sm:w-18 md:w-24 truncate text-center leading-tight px-1">
                    {player.username}
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-[#6b607f]">
                    {player.totalScore} pts
                  </span>
                </div>

                {/* Platform block */}
                <div
                  className={`w-14 sm:w-18 md:w-24 rounded-t-lg border ${style.platform} ${RANK_HEIGHT[rank]} flex items-center justify-center`}
                >
                  <span className={`text-base sm:text-lg md:text-xl font-bold font-syne ${style.label}`}>
                    {rank}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Rest of players */}
        {rest.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.4 }}
            className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-5 sm:mb-6 md:mb-8 max-w-[280px] sm:max-w-sm md:max-w-md"
          >
            {rest.map((player) => (
              <div key={player.clerkId} className="flex flex-col items-center gap-0.5">
                <Avatar className="w-7 h-7 sm:w-8 sm:h-8">
                  <AvatarImage src={player.avatarUrl ?? undefined} />
                  <AvatarFallback className="bg-[#7B4FBF] text-white text-xs">
                    {player.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[9px] sm:text-[10px] text-[#6b607f] w-12 sm:w-14 truncate text-center">
                  {player.username}
                </span>
              </div>
            ))}
          </motion.div>
        )}

        {/* Progress + skip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="flex flex-col items-center gap-2"
        >
          <div className="w-36 sm:w-44 md:w-48 h-1 bg-[#211c38] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#7B4FBF] rounded-full"
              style={{ width: `${progress * 100}%`, transition: "width 30ms linear" }}
            />
          </div>
          <button
            onClick={onComplete}
            className="text-[10px] sm:text-xs text-[#6b607f] hover:text-[#9a8fc0] transition-colors mt-1"
          >
            {t.skribbl.viewResults}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
