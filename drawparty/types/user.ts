export type SkribblStatsDTO = {
  gamesPlayed: number;
  victories: number;
  avgScore: number;
};

export type GarticStatsDTO = {
  gamesPlayed: number;
  victories: number;
};

export type UserStatsDTO = {
  skribbl: SkribblStatsDTO;
  gartic: GarticStatsDTO;
};

export type UserProfileDTO = {
  id: string;
  clerkId: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  createdAt: string;
};

// Flat shape returned by GET /users/me (Prisma User + included relations)
export type MeResponseDTO = UserProfileDTO & {
  updatedAt: string;
  skribblStats: (SkribblStatsDTO & { id: string; userId: string; updatedAt: string }) | null;
  garticStats: (GarticStatsDTO & { id: string; userId: string; chainsShared: number; updatedAt: string }) | null;
};

export type LeaderboardEntry = {
  rank: number;
  clerkId: string;
  username: string;
  avatarUrl: string | null;
  victories: number;
  avgScore: number;
};

export type LeaderboardPage = {
  entries: LeaderboardEntry[];
  total: number;
};

// ── Friend / Social types ─────────────────────────────────────────────────────

export type UserStatus = "online" | "away" | "in-game" | "offline";

export type FriendDTO = {
  id: string;
  clerkId: string;
  username: string;
  avatarUrl: string | null;
  status: UserStatus;
};

export type PendingRequestDTO = {
  requestId: string;
  sender: {
    id: string;
    clerkId: string;
    username: string;
    avatarUrl: string | null;
  };
  createdAt: string;
};

export type SearchResultDTO = {
  id: string;
  clerkId: string;
  username: string;
  avatarUrl: string | null;
  alreadyFriend: boolean;
  pendingRequest: boolean;
};
