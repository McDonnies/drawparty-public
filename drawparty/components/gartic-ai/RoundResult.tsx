"use client";

import { motion } from "framer-motion";
import { LivesDisplay } from "./LivesDisplay";
import { useLanguage } from "@/context/LanguageContext";

type RoundResultProps = {
  success: boolean;
  aiGuess: string;
  word: string;
  lives: number;
  score: number;
};

export function RoundResult({ success, aiGuess, word, lives, score }: RoundResultProps) {
  const { t } = useLanguage();
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0e0b1a]/92 backdrop-blur-sm rounded-xl p-6"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 18, delay: 0.1 }}
        className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl mb-5 shadow-lg ${
          success
            ? "bg-emerald-500/20 shadow-emerald-500/30"
            : "bg-[#FF6B6B]/20 shadow-[#FF6B6B]/30"
        }`}
      >
        {success ? "✅" : "❌"}
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={`font-syne text-2xl font-bold mb-1 ${success ? "text-emerald-400" : "text-[#FF6B6B]"}`}
      >
        {success ? t.garticAI.aiGotIt : t.garticAI.aiMissed}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-center mb-5"
      >
        <p className="text-[#7a6f99] text-sm mb-1">{t.garticAI.theWordWas}</p>
        <p className="text-white font-bold text-lg uppercase tracking-widest">{word}</p>
        <p className="text-[#7a6f99] text-sm mt-2">
          {t.garticAI.aiGuessed} <span className="text-[#9B6FDF] font-medium">&ldquo;{aiGuess || "…"}&rdquo;</span>
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex items-center gap-6"
      >
        <div className="text-center">
          <p className="text-[#7a6f99] text-xs uppercase tracking-wider mb-1">{t.garticAI.score}</p>
          <p className="text-white font-syne font-bold text-2xl">{score}</p>
        </div>
        <div className="w-px h-10 bg-[#211c38]" />
        <div className="text-center">
          <p className="text-[#7a6f99] text-xs uppercase tracking-wider mb-2">{t.garticAI.lives}</p>
          <LivesDisplay lives={lives} />
        </div>
      </motion.div>

      {lives > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-[#7a6f99] text-xs mt-5"
        >
          {t.garticAI.nextWordSoon}
        </motion.p>
      )}
    </motion.div>
  );
}
