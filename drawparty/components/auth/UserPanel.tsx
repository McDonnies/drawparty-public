"use client";

import { useState, useEffect } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  X, LayoutDashboard, LogOut,
  Bell, Users, Gamepad2, Check, XCircle,
  Circle, ChevronRight, Search, UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useNotifications, type Notification } from "@/context/NotificationContext";
import { useFriends } from "@/hooks/useFriends";
import type { FriendDTO } from "@/types/user";
import { FriendList } from "@/components/user/FriendList";
import { FriendSearch } from "@/components/user/FriendSearch";
import { socket } from "@/lib/socket";
import { useLanguage } from "@/context/LanguageContext";

// ---- Notification item ----
function NotificationItem({
  notif,
  onAccept,
  onDecline,
  onJoinGame,
}: {
  notif: Notification;
  onAccept: (requestId: string) => Promise<void>;
  onDecline: (requestId: string) => Promise<void>;
  onJoinGame: (notif: Notification) => void;
}) {
  const { t } = useLanguage();
  const icons = {
    "friend-request": <UserPlus size={14} className="text-[#7c5cfc]" />,
    "game-invite": <Gamepad2 size={14} className="text-[#c8ff00]" />,
    announcement: <Bell size={14} className="text-[#ff5f40]" />,
  };

  return (
    <div className="px-3 py-3 rounded-xl hover:bg-[#1a1a2a] transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-[#1e1e30] flex items-center justify-center flex-shrink-0 mt-0.5">
          {icons[notif.type]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white/90 leading-snug">{notif.message}</p>
          <p className="text-xs text-[#6b6b8a] mt-1">{notif.time}</p>
        </div>
      </div>
      {notif.type === "friend-request" && notif.requestId && (
        <div className="flex gap-2 mt-2.5 ml-11">
          <Button
            size="sm"
            className="h-7 px-3 text-xs bg-[#c8ff00] text-[#0d0d14] font-bold hover:bg-[#b8ef00] rounded-lg"
            onClick={() => void onAccept(notif.requestId!)}
          >
            <Check size={12} className="mr-1" />
            {t.social.accept}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-3 text-xs text-[#6b6b8a] hover:text-white rounded-lg"
            onClick={() => void onDecline(notif.requestId!)}
          >
            <XCircle size={12} className="mr-1" />
            {t.social.decline}
          </Button>
        </div>
      )}
      {notif.type === "game-invite" && notif.roomId && (
        <div className="flex gap-2 mt-2.5 ml-11">
          <Button
            size="sm"
            className="h-7 px-3 text-xs bg-[#7c5cfc] text-white font-bold hover:bg-[#6a4ce0] rounded-lg"
            onClick={() => onJoinGame(notif)}
          >
            {t.social.joinGame}
          </Button>
        </div>
      )}
    </div>
  );
}

// ---- Main Panel ----
interface UserPanelProps {
  open: boolean;
  onClose: () => void;
}

export function UserPanel({ open, onClose }: UserPanelProps) {
  const { t } = useLanguage();
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const pathname = usePathname();
  const [addingFriend, setAddingFriend] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const [pendingJoin, setPendingJoin] = useState<Notification | null>(null);
  const { notifications, unreadCount, markAllRead, removeNotification } = useNotifications();
  const {
    friends,
    sendFriendRequest,
    acceptRequest,
    declineRequest,
    removeFriend,
    searchUsers,
  } = useFriends();

  // Extract roomId from URL if currently in a lobby or game page
  const currentRoomIdMatch = pathname.match(
    /^\/(?:gartic-phone|skribbl)\/(?:lobby|play)\/([^/]+)$/
  );
  const currentRoomId = currentRoomIdMatch?.[1] ?? undefined;

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      markAllRead();
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open, markAllRead]);

  async function handleAccept(requestId: string) {
    try {
      await acceptRequest(requestId);
      toast.success("Friend request accepted!");
      const notif = notifications.find((n) => n.requestId === requestId);
      if (notif) removeNotification(notif.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to accept request");
    }
  }

  async function handleDecline(requestId: string) {
    try {
      await declineRequest(requestId);
      const notif = notifications.find((n) => n.requestId === requestId);
      if (notif) removeNotification(notif.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to decline request");
    }
  }

  async function handleRemove(clerkId: string) {
    try {
      await removeFriend(clerkId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove friend");
    }
  }

  function handleInvite(clerkId: string) {
    if (!currentRoomId) return;
    socket.emit("room:invite_friend", { roomId: currentRoomId, targetId: clerkId });
    toast.success("Invite sent!");
  }

  function handleJoinGame(notif: Notification) {
    if (!notif.roomCode) return;
    if (currentRoomId) {
      setPendingJoin(notif);
    } else {
      removeNotification(notif.id);
      router.push(`/join/${notif.roomCode}`);
      onClose();
    }
  }

  function confirmJoin() {
    if (!pendingJoin?.roomCode) return;
    if (currentRoomId) {
      socket.emit("room:leave", { roomId: currentRoomId });
    }
    removeNotification(pendingJoin.id);
    setPendingJoin(null);
    router.push(`/join/${pendingJoin.roomCode}`);
    onClose();
  }

  const filteredFriends: FriendDTO[] = filterQuery
    ? friends.filter((f) => f.username.toLowerCase().includes(filterQuery.toLowerCase()))
    : friends;

  if (!user) return null;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 right-0 z-[70] h-full w-80 max-w-[calc(100vw-2rem)] bg-[#0d0d14] border-l border-[#1e1e30] flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-[#1e1e30] hover:bg-[#2e2e45] text-[#6b6b8a] hover:text-white transition-all z-10"
        >
          <X size={16} />
        </button>

        {/* Profile header */}
        <div className="p-6 pb-4 border-b border-[#1e1e30]">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={user.imageUrl}
                alt={user.username ?? "You"}
                className="w-14 h-14 rounded-2xl object-cover ring-2 ring-[#1e1e30]"
              />
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-[#0d0d14]" />
            </div>
            <div>
              <h2 className="font-syne font-bold text-base leading-tight">
                {user.username ?? user.firstName ?? "Player"}
              </h2>
              <div className="flex items-center gap-1.5 mt-1">
                <Circle size={8} className="fill-emerald-400 text-emerald-400" />
                <span className="text-xs text-emerald-400">Online</span>
              </div>
            </div>
          </div>

          <Link href="/dashboard" onClick={onClose}>
            <Button
              variant="ghost"
              className="w-full mt-4 h-9 justify-between text-sm text-[#6b6b8a] hover:text-white hover:bg-[#1a1a2a] rounded-xl"
            >
              <div className="flex items-center gap-2">
                <LayoutDashboard size={15} />
                {t.social.dashboard}
              </div>
              <ChevronRight size={14} />
            </Button>
          </Link>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="friends" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-4 mt-3 flex w-[calc(100%-2rem)] bg-[#13131e] border border-[#1e1e30] rounded-xl h-9">
            <TabsTrigger
              value="friends"
              className="flex-1 text-xs rounded-lg data-[state=active]:bg-[#1e1e30] data-[state=active]:text-white"
            >
              <Users size={13} className="mr-1.5" />
              {t.social.friendsTab}
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="flex-1 text-xs rounded-lg data-[state=active]:bg-[#1e1e30] data-[state=active]:text-white relative"
            >
              <Bell size={13} className="mr-1.5" />
              {t.social.alertsTab}
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#ff5f40] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Friends tab */}
          <TabsContent value="friends" className="flex-1 flex flex-col min-h-0 mt-0">
            <div className="px-4 py-3 space-y-2">
              {!addingFriend && (
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b6b8a]" />
                  <Input
                    placeholder={t.social.searchFriends}
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    className="pl-8 h-8 text-sm bg-[#13131e] border-[#1e1e30] focus:border-[#7c5cfc] rounded-xl placeholder:text-[#6b6b8a]"
                  />
                </div>
              )}
              {!addingFriend ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full h-8 text-xs text-[#6b6b8a] hover:text-[#9B6FDF] hover:bg-[#7B4FBF]/5 border border-dashed border-[#211c38] hover:border-[#7B4FBF]/30 rounded-xl transition-all"
                  onClick={() => setAddingFriend(true)}
                >
                  <UserPlus size={13} className="mr-1.5" />
                  {t.social.addFriendBtn}
                </Button>
              ) : (
                <div className="rounded-xl border border-[#7B4FBF]/30 bg-[#161228] p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-[#9B6FDF] font-syne">{t.social.addFriendTitle}</p>
                    <button
                      onClick={() => setAddingFriend(false)}
                      className="text-[#6b6b8a] hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  </div>
                  <FriendSearch
                    searchUsers={searchUsers}
                    onSendRequest={async (clerkId) => {
                      await sendFriendRequest(clerkId);
                      toast.success("Friend request sent!");
                    }}
                  />
                </div>
              )}
            </div>

            <ScrollArea className="flex-1 px-2">
              <FriendList
                friends={filteredFriends}
                currentRoomId={currentRoomId}
                onRemove={handleRemove}
                onInvite={handleInvite}
              />
            </ScrollArea>
          </TabsContent>

          {/* Notifications tab */}
          <TabsContent value="notifications" className="flex-1 min-h-0 mt-0">
            <ScrollArea className="h-full px-2 py-2">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <div className="w-16 h-16 rounded-2xl bg-[#13131e] flex items-center justify-center mb-3 text-2xl">
                    🔔
                  </div>
                  <p className="text-sm text-[#6b6b8a]">{t.social.noNotifications}</p>
                </div>
              ) : (
                <div className="space-y-1 pb-4">
                  {notifications.map((n) => (
                    <NotificationItem
                      key={n.id}
                      notif={n}
                      onAccept={handleAccept}
                      onDecline={handleDecline}
                      onJoinGame={handleJoinGame}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Logout */}
        <div className="p-4 border-t border-[#1e1e30]">
          <Button
            variant="ghost"
            className="w-full h-9 text-sm text-[#6b6b8a] hover:text-[#ff5f40] hover:bg-[#ff5f40]/10 rounded-xl transition-all"
            onClick={() => signOut()}
          >
            <LogOut size={15} className="mr-2" />
            {t.social.logOut}
          </Button>
        </div>
      </aside>

      <Dialog open={!!pendingJoin} onOpenChange={(open) => { if (!open) setPendingJoin(null); }}>
        <DialogContent className="bg-[#0d0d14] border-[#1e1e30] text-white">
          <DialogHeader>
            <DialogTitle>{t.social.leaveRoom}</DialogTitle>
            <DialogDescription className="text-[#6b6b8a]">
              You&apos;re currently in a room. Leave and join{" "}
              <span className="text-white font-semibold">{pendingJoin?.from}</span>&apos;s game?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              className="text-[#6b6b8a] hover:text-white"
              onClick={() => setPendingJoin(null)}
            >
              {t.social.stay}
            </Button>
            <Button
              className="bg-[#7c5cfc] hover:bg-[#6a4ce0] text-white"
              onClick={confirmJoin}
            >
              {t.social.leaveAndJoin}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
