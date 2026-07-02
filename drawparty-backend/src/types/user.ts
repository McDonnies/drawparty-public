// Shapes for user-related API responses.

// ============================================================
// USER PROFILE
// ============================================================

export interface UserProfileDTO {
  id: string;
  clerkId: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  createdAt: string;  // ISO date string
}

// ============================================================
// STATS
// Returned by GET /users/me alongside the profile
// ============================================================

export interface SkribblStatsDTO {
  gamesPlayed: number;
  victories: number;
  avgScore: number;   // average score per game (rounded to 1 decimal)
}

export interface GarticStatsDTO {
  gamesPlayed: number;
  victories: number;
  chainsShared: number;
}

// Full response shape of GET /users/me
export interface MeResponseDTO {
  profile: UserProfileDTO;
  skribblStats: SkribblStatsDTO;
  garticStats: GarticStatsDTO;
}

// ============================================================
// LEADERBOARD
// ============================================================

export interface LeaderboardEntryDTO {
  rank: number;
  clerkId: string;
  username: string;
  avatarUrl: string | null;
  victories: number;
  avgScore: number;
}

// Response shape of GET /stats/leaderboard?page=N
export interface LeaderboardResponseDTO {
  entries: LeaderboardEntryDTO[];
  totalPages: number;
  currentPage: number;
  myRank: number | null;  // null if the requesting user has 0 Skribbl games
}
