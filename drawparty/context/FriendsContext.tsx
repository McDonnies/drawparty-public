"use client";

// Single source of truth for friend state.
// Rendered ONCE in ClientProviders so socket listeners register exactly once,
// regardless of how many UserPanel instances are mounted (Navbar + BottomNav).

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { useAuth } from "@clerk/nextjs";
import { socket } from "@/lib/socket";
import { useNotifications } from "@/context/NotificationContext";
import {
  getFriends,
  getPendingRequests,
  searchUsers as apiSearchUsers,
  sendFriendRequest as apiSendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend as apiRemoveFriend,
} from "@/lib/api";
import type { UserStatus, FriendDTO, PendingRequestDTO, SearchResultDTO } from "@/types/user";

// ── Context value type ─────────────────────────────────────────────────────────

type FriendsContextValue = {
  friends: FriendDTO[];
  pendingRequests: PendingRequestDTO[];
  isLoading: boolean;
  error: string | null;
  sendFriendRequest: (targetClerkId: string) => Promise<void>;
  acceptRequest: (requestId: string) => Promise<void>;
  declineRequest: (requestId: string) => Promise<void>;
  removeFriend: (targetClerkId: string) => Promise<void>;
  searchUsers: (username: string) => Promise<SearchResultDTO[]>;
};

const FriendsContext = createContext<FriendsContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────────────────────

export function FriendsProvider({ children }: { children: ReactNode }) {
  const { getToken, isSignedIn } = useAuth();
  const { addNotification } = useNotifications();

  const [friends, setFriends] = useState<FriendDTO[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequestDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stable refs — socket listeners read latest values without re-registering
  const addNotificationRef = useRef(addNotification);
  const friendsRef = useRef(friends);
  const seenRequestIds = useRef(new Set<string>());
  useEffect(() => { addNotificationRef.current = addNotification; }, [addNotification]);
  useEffect(() => { friendsRef.current = friends; }, [friends]);

  // Initial fetch
  useEffect(() => {
    if (!isSignedIn) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [f, r] = await Promise.all([getFriends(getToken), getPendingRequests(getToken)]);
        if (!cancelled) { setFriends(f); setPendingRequests(r); }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load friends");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [getToken, isSignedIn]);

  // Socket subscriptions — registered exactly once for the lifetime of the provider
  useEffect(() => {
    function onStatusChanged(payload: { clerkId: string; status: UserStatus }) {
      setFriends((prev) =>
        prev.map((f) => f.clerkId === payload.clerkId ? { ...f, status: payload.status } : f)
      );
    }

    function onRequestReceived(payload: {
      requestId: string;
      from: { clerkId: string; username: string; avatarUrl: string | null };
    }) {
      if (seenRequestIds.current.has(payload.requestId)) return;
      seenRequestIds.current.add(payload.requestId);

      const newRequest: PendingRequestDTO = {
        requestId: payload.requestId,
        sender: {
          id: payload.from.clerkId,
          clerkId: payload.from.clerkId,
          username: payload.from.username,
          avatarUrl: payload.from.avatarUrl,
        },
        createdAt: new Date().toISOString(),
      };
      setPendingRequests((prev) => {
        if (prev.some((r) => r.requestId === payload.requestId)) return prev;
        return [newRequest, ...prev];
      });
      addNotificationRef.current({
        type: "friend-request",
        message: `${payload.from.username} sent you a friend request`,
        from: payload.from.username,
        avatarUrl: payload.from.avatarUrl ?? undefined,
        time: "Just now",
        requestId: payload.requestId,
      });
    }

    function onInviteReceived(payload: {
      roomId: string;
      roomCode: string;
      fromId: string;
      fromUsername: string;
      gameMode: "GARTIC_PHONE" | "SKRIBBL";
    }) {
      const friend = friendsRef.current.find((f) => f.clerkId === payload.fromId);
      addNotificationRef.current({
        type: "game-invite",
        message: `${payload.fromUsername} invited you to play`,
        from: payload.fromUsername,
        avatarUrl: friend?.avatarUrl ?? undefined,
        time: "Just now",
        roomId: payload.roomId,
        roomCode: payload.roomCode,
        gameMode: payload.gameMode,
      });
    }

    function onFriendRemoved(payload: { removedBy: string }) {
      setFriends((prev) => prev.filter((f) => f.clerkId !== payload.removedBy));
    }

    function onRequestAccepted(payload: {
      friend: { id: string; clerkId: string; username: string; avatarUrl: string | null };
    }) {
      setFriends((prev) => {
        if (prev.some((f) => f.clerkId === payload.friend.clerkId)) return prev;
        return [...prev, { ...payload.friend, status: "online" as UserStatus }];
      });
    }

    socket.on("friend:status_changed", onStatusChanged);
    socket.on("friend:request_received", onRequestReceived);
    socket.on("room:invite_received", onInviteReceived);
    socket.on("friend:removed", onFriendRemoved);
    socket.on("friend:request_accepted", onRequestAccepted);
    return () => {
      socket.off("friend:status_changed", onStatusChanged);
      socket.off("friend:request_received", onRequestReceived);
      socket.off("room:invite_received", onInviteReceived);
      socket.off("friend:removed", onFriendRemoved);
      socket.off("friend:request_accepted", onRequestAccepted);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const sendFriendRequest = useCallback(async (targetClerkId: string): Promise<void> => {
    await apiSendFriendRequest(getToken, targetClerkId);
  }, [getToken]);

  const acceptRequest = useCallback(async (requestId: string): Promise<void> => {
    const request = pendingRequests.find((r) => r.requestId === requestId);
    setPendingRequests((prev) => prev.filter((r) => r.requestId !== requestId));
    if (request) {
      setFriends((prev) => [...prev, {
        id: request.sender.id,
        clerkId: request.sender.clerkId,
        username: request.sender.username,
        avatarUrl: request.sender.avatarUrl,
        status: "offline" as UserStatus,
      }]);
    }
    try {
      await acceptFriendRequest(getToken, requestId);
    } catch (e) {
      if (request) {
        setPendingRequests((prev) => [request, ...prev]);
        setFriends((prev) => prev.filter((f) => f.clerkId !== request.sender.clerkId));
      }
      throw e;
    }
  }, [getToken, pendingRequests]);

  const declineRequest = useCallback(async (requestId: string): Promise<void> => {
    const request = pendingRequests.find((r) => r.requestId === requestId);
    setPendingRequests((prev) => prev.filter((r) => r.requestId !== requestId));
    try {
      await declineFriendRequest(getToken, requestId);
    } catch (e) {
      if (request) setPendingRequests((prev) => [request, ...prev]);
      throw e;
    }
  }, [getToken, pendingRequests]);

  const removeFriend = useCallback(async (targetClerkId: string): Promise<void> => {
    const friend = friends.find((f) => f.clerkId === targetClerkId);
    setFriends((prev) => prev.filter((f) => f.clerkId !== targetClerkId));
    try {
      await apiRemoveFriend(getToken, targetClerkId);
    } catch (e) {
      if (friend) setFriends((prev) => [...prev, friend]);
      throw e;
    }
  }, [getToken, friends]);

  const searchUsers = useCallback(async (username: string): Promise<SearchResultDTO[]> => {
    if (username.length < 2) return [];
    return apiSearchUsers(getToken, username);
  }, [getToken]);

  return (
    <FriendsContext.Provider value={{
      friends, pendingRequests, isLoading, error,
      sendFriendRequest, acceptRequest, declineRequest, removeFriend, searchUsers,
    }}>
      {children}
    </FriendsContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useFriendsContext(): FriendsContextValue {
  const ctx = useContext(FriendsContext);
  if (!ctx) throw new Error("useFriendsContext must be used inside FriendsProvider");
  return ctx;
}
