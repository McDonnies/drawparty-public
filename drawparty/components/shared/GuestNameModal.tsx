"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setGuestName } from "@/lib/guestId";

interface Props {
  onConfirm: (name: string) => void;
}

export function GuestNameModal({ onConfirm }: Props) {
  const [name, setName] = useState("");
  const trimmed = name.trim();

  function handleSubmit(): void {
    if (!trimmed) return;
    setGuestName(trimmed);
    onConfirm(trimmed);
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#0e0b1a] flex items-center justify-center p-4">
      <div className="bg-[#161228] border border-[#211c38] rounded-2xl p-8 w-full max-w-sm flex flex-col gap-6">
        <div>
          <h2 className="font-syne font-bold text-white text-2xl mb-1">Pick a name</h2>
          <p className="text-[#7a6f99] text-sm">
            You're joining as a guest. Choose how you'll appear to others.
          </p>
        </div>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 20))}
          placeholder="Enter your name…"
          className="bg-[#0e0b1a] border-[#211c38] text-white placeholder:text-[#7a6f99]"
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          autoFocus
          maxLength={20}
        />
        <Button
          onClick={handleSubmit}
          disabled={!trimmed}
          className="bg-gradient-to-r from-[#7B4FBF] to-[#3AAFD4] text-white font-syne font-bold hover:opacity-90 w-full disabled:opacity-40"
        >
          Play as Guest
        </Button>
      </div>
    </div>
  );
}
