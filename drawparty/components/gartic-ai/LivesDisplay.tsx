"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Heart } from "lucide-react";

type LivesDisplayProps = {
  lives: number;
  maxLives?: number;
};

export function LivesDisplay({ lives, maxLives = 3 }: LivesDisplayProps) {
  return (
    <div className="flex items-center gap-1.5">
      <AnimatePresence mode="popLayout">
        {Array.from({ length: maxLives }).map((_, i) => {
          const isAlive = i < lives;
          return (
            <motion.div
              key={i}
              layout
              initial={false}
              animate={isAlive ? { scale: 1, opacity: 1 } : { scale: 0.7, opacity: 0.3 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              <Heart
                size={22}
                className={isAlive ? "text-[#FF6B6B] fill-[#FF6B6B]" : "text-[#3a2e4e]"}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
