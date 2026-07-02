"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

// ── Props ──────────────────────────────────────────────────────────────────

type RoomCodeDisplayProps = {
  code: string; // 6-char alphanumeric e.g. "A8X2KL"
};

// ── Component ──────────────────────────────────────────────────────────────

export function RoomCodeDisplay({ code }: RoomCodeDisplayProps): React.ReactElement {
  const { t } = useLanguage();
  const [justCopied, setJustCopied] = useState<boolean>(false);

  async function handleCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(t.lobby.copiedToClipboard);
      setJustCopied(true);
      setTimeout((): void => setJustCopied(false), 2000);
    } catch {
      toast.error(t.lobby.couldNotCopy);
    }
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2 sm:px-4 sm:py-3 rounded-xl bg-[#161228] border border-[#211c38]">
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <span className="text-xs text-[#7a6f99] uppercase tracking-widest">
          {t.lobby.roomCode}
        </span>
        <span className="font-mono text-xl sm:text-2xl font-bold tracking-[0.3em] text-white select-all">
          {code}
        </span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={(): void => void handleCopy()}
        className="border-[#211c38] text-white hover:bg-[#1e1836] shrink-0"
      >
        {justCopied ? (
          <>
            <Check size={14} className="text-emerald-400 mr-1" />
            {t.lobby.copied}
          </>
        ) : (
          <>
            <Copy size={14} className="mr-1" />
            {t.lobby.copy}
          </>
        )}
      </Button>
    </div>
  );
}
