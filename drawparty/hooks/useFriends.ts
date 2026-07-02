"use client";

// Thin re-export so existing import paths stay unchanged.
// All state lives in FriendsContext (singleton in ClientProviders).

export type { UserStatus, FriendDTO, PendingRequestDTO, SearchResultDTO } from "@/types/user";
export { useFriendsContext as useFriends } from "@/context/FriendsContext";
