"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/context/LanguageContext";

export function AIJudgingScreen() {
  const { t } = useLanguage();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0e0b1a]/90 backdrop-blur-sm rounded-xl"
    >
      <motion.div
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        className="w-20 h-20 rounded-full bg-gradient-to-br from-[#7B4FBF] to-[#3AAFD4] flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(123,79,191,0.5)]"
      >
        <span className="text-3xl">🤖</span>
      </motion.div>

      <p className="text-white font-syne text-xl font-bold mb-2">{t.garticAI.aiAnalyzing}</p>

      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-[#7B4FBF]"
            animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>

      <p className="text-[#7a6f99] text-sm mt-4">{t.garticAI.groqJudging}</p>
    </motion.div>
  );
}
