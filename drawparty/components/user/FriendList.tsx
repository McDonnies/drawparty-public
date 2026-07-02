"use client";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FriendInvite } from "@/components/user/FriendInvite";
import type { FriendDTO, UserStatus } from "@/hooks/useFriends";
import { useLanguage } from "@/context/LanguageContext";

type FriendListProps = {
  friends: FriendDTO[];
  currentRoomId?: string;
  roomPlayerIds?: Set<string>;
  roomIsFull?: boolean;
  onRemove: (clerkId: string) => void;
  onInvite: (clerkId: string) => void;
};

function statusDotClass(status: UserStatus): string {
  if (status === "online") return "bg-emerald-400";
  if (status === "in-game") return "bg-orange-400";
  return "bg-[#3a3a55]";
}

type SectionProps = {
  label: string;
  friends: FriendDTO[];
  currentRoomId?: string;
  roomPlayerIds?: Set<string>;
  roomIsFull?: boolean;
  onRemove: (clerkId: string) => void;
  onInvite: (clerkId: string) => void;
};

function FriendSection({ label, friends, currentRoomId, roomPlayerIds, roomIsFull, onRemove, onInvite }: SectionProps) {
  const { t } = useLanguage();
  if (friends.length === 0) return null;
  return (
    <div>
      <p className="text-[10px] font-semibold text-[#6b6b8a] uppercase tracking-widest px-3 py-2">
        {label} — {friends.length}
      </p>
      {friends.map((f) => {
        const alreadyIn = roomPlayerIds?.has(f.clerkId) ?? false;
        const inviteDisabled = alreadyIn || (roomIsFull ?? false) || f.status === "offline";
        return (
          <div
            key={f.clerkId}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#1a1a2a] transition-colors group"
          >
            <div className="relative flex-shrink-0">
              <Avatar className="w-9 h-9">
                <AvatarImage src={f.avatarUrl ?? undefined} alt={f.username} />
                <AvatarFallback className="bg-[#2e2e45] text-white text-xs">
                  {f.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0d0d14] ${statusDotClass(f.status)}`}
              />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{f.username}</p>
              <p className="text-xs text-[#6b6b8a]">
                {f.status === "online" ? t.social.onlineStatus : f.status === "in-game" ? t.social.inGameStatus : f.status === "away" ? t.social.awayStatus : t.social.offlineStatus}
              </p>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
              {currentRoomId && (
                <FriendInvite
                  targetClerkId={f.clerkId}
                  roomId={currentRoomId}
                  disabled={inviteDisabled}
                  onInvite={() => onInvite(f.clerkId)}
                />
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onRemove(f.clerkId)}
                className="h-7 px-2 text-xs text-[#6b6b8a] hover:text-[#ff5f40] hover:bg-[#ff5f40]/10"
              >
                {t.social.remove}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function FriendList({
  friends,
  currentRoomId,
  roomPlayerIds,
  roomIsFull,
  onRemove,
  onInvite,
}: FriendListProps) {
  const { t } = useLanguage();
  const online = friends.filter((f) => f.status === "online");
  const inGame = friends.filter((f) => f.status === "in-game");
  const offline = friends.filter((f) => f.status === "offline" || f.status === "away");

  if (friends.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-[#13131e] flex items-center justify-center mb-3 text-2xl">
          👥
        </div>
        <p className="text-sm text-[#6b6b8a]">{t.social.noFriendsYet}</p>
        <p className="text-xs text-[#3a3a55] mt-1">{t.social.searchToAdd}</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 pb-4">
      <FriendSection
        label={t.social.onlineStatus}
        friends={online}
        currentRoomId={currentRoomId}
        roomPlayerIds={roomPlayerIds}
        roomIsFull={roomIsFull}
        onRemove={onRemove}
        onInvite={onInvite}
      />
      <FriendSection
        label={t.social.inGameStatus}
        friends={inGame}
        currentRoomId={currentRoomId}
        roomPlayerIds={roomPlayerIds}
        roomIsFull={roomIsFull}
        onRemove={onRemove}
        onInvite={onInvite}
      />
      <FriendSection
        label={t.social.offlineStatus}
        friends={offline}
        currentRoomId={currentRoomId}
        roomPlayerIds={roomPlayerIds}
        roomIsFull={roomIsFull}
        onRemove={onRemove}
        onInvite={onInvite}
      />
    </div>
  );
}
