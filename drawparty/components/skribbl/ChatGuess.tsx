"use client";

import { useEffect, useRef } from "react";
import type { SkribblGuessDTO, SkribblChatDTO } from "@/types/game";
import type React from "react";

type ChatGuessProps = {
  guesses: SkribblGuessDTO[];
  currentUserId: string;
  chatMessages?: SkribblChatDTO[];
};

type MergedItem =
  | { kind: "guess"; data: SkribblGuessDTO; ts: number }
  | { kind: "chat"; data: SkribblChatDTO; ts: number };

function truncate(text: string, max = 40): string {
  return text.length > max ? text.slice(0, max) + "…" : text;
}

export default function ChatGuess({
  guesses,
  currentUserId,
  chatMessages = [],
}: ChatGuessProps): React.ReactElement {
  const scrollRef = useRef<HTMLDivElement>(null);

  const merged: MergedItem[] = [
    ...guesses.map((g) => ({ kind: "guess" as const, data: g, ts: new Date(g.guessedAt).getTime() })),
    ...chatMessages.map((c) => ({ kind: "chat" as const, data: c, ts: new Date(c.sentAt).getTime() })),
  ].sort((a, b) => a.ts - b.ts);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [merged.length]);

  return (
    <>
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(8px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
      <div className="flex flex-col h-full border border-[#211c38] rounded-xl bg-[#0e0b1a] overflow-hidden">

        <div className="px-4 py-3 border-b border-[#211c38] flex-shrink-0">
          <h3 className="text-sm font-semibold text-white">Chat</h3>
        </div>

        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-2 py-2">
          <div className="flex flex-col gap-1">
            {merged.length === 0 && (
              <p className="text-xs text-[#7a6f99] italic text-center pt-4">No messages yet...</p>
            )}

            {merged.map((item, i) => {
              if (item.kind === "chat") {
                const c = item.data;
                const isMe = c.clerkId === currentUserId;
                return (
                  <div
                    key={`chat-${c.sentAt}-${c.clerkId}`}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm bg-[#161228] border-l-2 border-[#3AAFD4]"
                    style={{ animation: i >= merged.length - 3 ? "slideIn 0.2s ease-out" : undefined }}
                  >
                    <div className="w-6 h-6 rounded-full flex-shrink-0 bg-[#211c38] overflow-hidden">
                      {c.avatarUrl
                        ? <img src={c.avatarUrl} alt={c.username} className="w-full h-full object-cover" />
                        : <span className="text-xs text-white flex items-center justify-center h-full">{c.username[0]?.toUpperCase()}</span>
                      }
                    </div>
                    <span className={`text-[#3AAFD4] flex-shrink-0 ${isMe ? "font-semibold" : ""}`}>
                      {isMe ? "You" : c.username}:
                    </span>
                    <span className="text-white text-xs truncate max-w-[120px]" title={c.message}>
                      {truncate(c.message)}
                    </span>
                  </div>
                );
              }

              const g = item.data;
              const isMe = g.clerkId === currentUserId;
              return (
                <div
                  key={`guess-${g.clerkId}-${g.guessedAt}`}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm
                    ${g.isAI
                      ? "bg-violet-500/10 border-l-2 border-violet-400"
                      : g.isCorrect
                        ? "bg-emerald-500/10 border-l-2 border-emerald-400"
                        : g.isClose
                          ? "bg-amber-500/10 border-l-2 border-amber-400"
                          : "border-l-2 border-transparent"
                    }
                    ${isMe ? "font-semibold" : ""}`}
                  style={{ animation: i >= merged.length - 3 ? "slideIn 0.2s ease-out" : undefined }}
                >
                  <div className="w-6 h-6 rounded-full flex-shrink-0 bg-[#211c38] overflow-hidden">
                    {g.isAI
                      ? <span className="text-xs flex items-center justify-center h-full">🤖</span>
                      : g.avatarUrl
                        ? <img src={g.avatarUrl} alt={g.username} className="w-full h-full object-cover" />
                        : <span className="text-xs text-white flex items-center justify-center h-full">{g.username[0]?.toUpperCase()}</span>
                    }
                  </div>
                  <span className={`flex-shrink-0 ${g.isAI ? "text-violet-400" : g.isCorrect ? "text-emerald-400" : g.isClose ? "text-amber-400" : "text-[#7a6f99]"}`}>
                    {!g.isAI && isMe ? "You" : g.username}:
                  </span>
                  <span className={`text-xs truncate max-w-[100px] ${g.isAI ? "text-violet-200" : g.isCorrect ? "text-white" : g.isClose ? "text-amber-200" : "text-[#7a6f99]"}`}
                    title={g.guess ?? undefined}
                  >
                    {g.guess === null
                      ? <em className="opacity-70">guessed it!</em>
                      : truncate(g.guess)
                    }
                  </span>
                  {g.isCorrect && (
                    <span className={`ml-auto text-xs font-bold flex-shrink-0 ${g.isAI ? "text-violet-400" : "text-emerald-400"}`}>
                      ✓ +{g.pointsAwarded}
                    </span>
                  )}
                  {g.isClose && !g.isCorrect && (
                    <span className="ml-auto text-xs text-amber-400 flex-shrink-0">↗</span>
                  )}
                </div>
              );
            })}

          </div>
        </div>

      </div>
    </>
  );
}
