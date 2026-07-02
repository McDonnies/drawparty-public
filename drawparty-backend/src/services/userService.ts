import { prisma } from "../config/prisma";

// ── Types ──────────────────────────────────────────────────────────────────────

export type UserStatsDTO = {
  skribbl: {
    gamesPlayed: number;
    victories: number;
    avgScore: number;
  };
  gartic: {
    gamesPlayed: number;
    victories: number;
  };
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

// ── Stats ──────────────────────────────────────────────────────────────────────

export async function getUserStats(clerkId: string): Promise<UserStatsDTO> {
  const user = await prisma.user.findUnique({
    where: { clerkId },
    include: { skribblStats: true, garticStats: true },
  });

  if (!user) throw new Error("User not found");

  const sk = user.skribblStats;
  const ga = user.garticStats;

  return {
    skribbl: {
      gamesPlayed: sk?.gamesPlayed ?? 0,
      victories:   sk?.wins ?? 0,
      avgScore:    sk && sk.gamesPlayed > 0
        ? Math.round((sk.totalScore / sk.gamesPlayed) * 10) / 10
        : 0,
    },
    gartic: {
      gamesPlayed: ga?.gamesPlayed ?? 0,
      victories:   0,
    },
  };
}

// ── Leaderboard ────────────────────────────────────────────────────────────────

export async function getLeaderboard(
  page: number,
  pageSize: number
): Promise<LeaderboardPage> {
  page     = Math.max(1, page);
  pageSize = Math.min(50, Math.max(1, pageSize));

  const guestFilter = { NOT: { user: { clerkId: { startsWith: "guest_" } } } };

  const [total, rows] = await Promise.all([
    prisma.skribblStats.count({ where: { gamesPlayed: { gt: 0 }, ...guestFilter } }),
    prisma.skribblStats.findMany({
      where:   { gamesPlayed: { gt: 0 }, ...guestFilter },
      orderBy: [{ wins: "desc" }, { totalScore: "desc" }],
      skip:    (page - 1) * pageSize,
      take:    pageSize,
      include: { user: { select: { clerkId: true, username: true, avatarUrl: true } } },
    }),
  ]);

  const entries: LeaderboardEntry[] = rows.map((row, idx) => ({
    rank:      (page - 1) * pageSize + idx + 1,
    clerkId:   row.user.clerkId,
    username:  row.user.username,
    avatarUrl: row.user.avatarUrl,
    victories: row.wins,
    avgScore:  row.gamesPlayed > 0
      ? Math.round((row.totalScore / row.gamesPlayed) * 10) / 10
      : 0,
  }));

  return { entries, total };
}

export async function getUserRank(clerkId: string): Promise<number | null> {
  const user = await prisma.user.findUnique({
    where: { clerkId },
    include: { skribblStats: true },
  });

  if (!user) throw new Error("User not found");

  const stats = user.skribblStats;
  if (!stats || stats.gamesPlayed === 0) return null;

  const above = await prisma.skribblStats.count({
    where: {
      wins: { gt: stats.wins },
      NOT: { user: { clerkId: { startsWith: "guest_" } } },
    },
  });

  return above + 1;
}
