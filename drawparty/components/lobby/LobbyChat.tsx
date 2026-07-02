"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send } from "lucide-react";
import type { ChatMessageDTO } from "@/types/game";
import { useLanguage } from "@/context/LanguageContext";

// ── Props ──────────────────────────────────────────────────────────────────

type LobbyChatProps = {
  messages: ChatMessageDTO[];
  currentUserId: string;
  onSendMessage: (message: string) => void;
  isRateLimited: boolean;
};

// ── Component ──────────────────────────────────────────────────────────────

export function LobbyChat({
  messages,
  currentUserId,
  onSendMessage,
  isRateLimited,
}: LobbyChatProps): React.ReactElement {
  const { t } = useLanguage();
  const [inputValue, setInputValue] = useState<string>("");

  // bottomRef — used to scroll the message list to the bottom when new messages arrive
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect((): void => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function handleSend(): void {
    const trimmed = inputValue.trim();
    if (trimmed === "" || isRateLimited) return;
    onSendMessage(trimmed);
    setInputValue("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-full gap-2">
      {/* Header */}
      <span className="text-xs uppercase tracking-widest text-[#7a6f99]">
        {t.lobby.lobbyChat}
      </span>

      {/* Message list */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-2 p-2">
          {messages.length === 0 && (
            <p className="text-xs text-[#7a6f99] italic text-center py-8">
              {t.lobby.noMessages}
            </p>
          )}
          {messages.map((msg) => {
            const isOwn = msg.senderId === currentUserId;
            return (
              <div key={msg.id} className="flex items-start gap-1.5 text-sm">
                <span className="font-semibold text-[#9B6FDF] shrink-0 whitespace-nowrap">
                  {isOwn ? t.lobby.youChat : msg.senderUsername}:
                </span>
                <span className="text-white break-words">{msg.message}</span>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Compose row */}
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e): void => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t.lobby.saySomething}
          className="bg-[#1e1836] border-[#211c38] text-white placeholder:text-[#7a6f99] flex-1"
        />
        <Button
          onClick={handleSend}
          disabled={isRateLimited || inputValue.trim() === ""}
          className="bg-[#7B4FBF] hover:bg-[#9B6FDF] text-white shrink-0"
        >
          {isRateLimited ? (
            t.lobby.slowDown
          ) : (
            <Send size={16} />
          )}
        </Button>
      </div>
    </div>
  );
}
