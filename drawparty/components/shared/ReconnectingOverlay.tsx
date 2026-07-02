"use client";

import { Loader2 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface Props {
  isVisible: boolean;
}

export function ReconnectingOverlay({ isVisible }: Props) {
  const { t } = useLanguage();
  if (!isVisible) return null;
  return (
    <div className="fixed inset-0 z-50 bg-[#0e0b1a]/90 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-[#9B6FDF]" size={48} />
      <p className="font-syne font-bold text-white text-xl">{t.common.reconnecting}</p>
      <p className="text-[#7a6f99] text-sm">{t.common.reconnectingHold}</p>
    </div>
  );
}
