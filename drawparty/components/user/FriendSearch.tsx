"use client";

import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import type { SearchResultDTO } from "@/hooks/useFriends";

type FriendSearchProps = {
  searchUsers: (username: string) => Promise<SearchResultDTO[]>;
  onSendRequest: (targetClerkId: string) => Promise<void>;
};

export function FriendSearch({ searchUsers, onSendRequest }: FriendSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.length < 2) {
      setResults([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await searchUsers(query);
        setResults(data);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Search failed");
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, searchUsers]);

  async function handleAdd(clerkId: string) {
    try {
      await onSendRequest(clerkId);
      setPendingIds((prev) => new Set(prev).add(clerkId));
    } catch {
      // error surfaces via toast in parent
    }
  }

  return (
    <div className="space-y-2">
      <Input
        placeholder="Search by username..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="h-8 text-sm bg-[#0e0b1a] border-[#211c38] focus:border-[#7B4FBF] placeholder:text-[#7a6f99] rounded-lg"
        autoFocus
      />

      {isLoading && (
        <div className="space-y-2 pt-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 px-1">
              <Skeleton className="w-8 h-8 rounded-full" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="text-xs text-[#ff5f40] px-1">{error}</p>
      )}

      {!isLoading && results.length === 0 && query.length >= 2 && !error && (
        <p className="text-xs text-[#6b6b8a] px-1">No users found</p>
      )}

      {!isLoading && results.length > 0 && (
        <div className="space-y-1 pt-1">
          {results.map((r) => {
            const isPending = pendingIds.has(r.clerkId) || r.pendingRequest;
            return (
              <div key={r.clerkId} className="flex items-center gap-3 px-1 py-1.5 rounded-lg hover:bg-[#1a1a2a]">
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarImage src={r.avatarUrl ?? undefined} alt={r.username} />
                  <AvatarFallback className="bg-[#2e2e45] text-white text-xs">
                    {r.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <p className="text-sm flex-1 truncate">{r.username}</p>
                {r.alreadyFriend ? (
                  <Badge className="bg-emerald-600/30 text-emerald-400 text-[10px] px-2 py-0 border-0">
                    Friends
                  </Badge>
                ) : isPending ? (
                  <Badge className="bg-yellow-600/20 text-yellow-400 text-[10px] px-2 py-0 border-0">
                    Pending
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    className="h-6 px-2.5 text-[10px] bg-gradient-to-r from-[#7B4FBF] to-[#3AAFD4] text-white font-bold hover:opacity-90 rounded-md"
                    onClick={() => void handleAdd(r.clerkId)}
                  >
                    Add
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
