"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/context/LanguageContext";

type Props = { word: string };

export function WordReveal({ word }: Props) {
  const { t } = useLanguage();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="absolute inset-0 z-30 flex items-center justify-center backdrop-blur-md bg-[#0e0b1a]/85 rounded-xl"
    >
      <div className="text-center px-8">
        <motion.p
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="text-[#7a6f99] text-xs uppercase tracking-widest mb-4"
        >
          {t.garticAI.drawThisWord}
        </motion.p>

        <motion.p
          initial={{ scale: 0.55, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 22, delay: 0.15 }}
          className="text-white font-syne font-bold text-5xl sm:text-6xl uppercase tracking-widest drop-shadow-lg"
        >
          {word}
        </motion.p>

        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 2.6, delay: 0.3, ease: "linear" }}
          style={{ originX: 0 }}
          className="h-0.5 bg-gradient-to-r from-[#7B4FBF] to-[#3AAFD4] mt-5 rounded-full mx-auto max-w-[180px]"
        />

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-[#7a6f99] text-sm mt-4"
        >
          {t.garticAI.getReady}
        </motion.p>
      </div>
    </motion.div>
  );
}
