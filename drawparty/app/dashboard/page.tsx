"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser, useAuth, useClerk } from "@clerk/nextjs";
import { toast } from "sonner";

import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import type { SkribblStatsDTO, GarticStatsDTO, LeaderboardEntry, LeaderboardPage } from "@/types/user";
import { fetchMe, fetchMyStats, fetchMyRank, fetchLeaderboard, patchMe } from "@/lib/api";
import { useLanguage } from "@/context/LanguageContext";

function LeaderboardTable({
  currentUserId,
  getToken,
}: {
  currentUserId: string | undefined;
  getToken: () => Promise<string | null>;
}) {
  const { t } = useLanguage();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isPaging, setIsPaging] = useState(true);

  const loadPage = useCallback(
    async (page: number) => {
      setIsPaging(true);
      try {
        const data: LeaderboardPage = await fetchLeaderboard(getToken, page, 10);
        setLeaderboard(data.entries);
        setTotalPages(Math.max(1, Math.ceil(data.total / 10)));
        setCurrentPage(page);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t.dashboard.failedLeaderboard);
      } finally {
        setIsPaging(false);
      }
    },
    [getToken]
  );

  useEffect(() => {
    void loadPage(1);
  }, [loadPage]);

  return (
    <Card className="bg-bg-card border-dp-border">
      <CardContent className="p-0 overflow-x-auto">
        <table className="min-w-[360px] w-full text-sm table-fixed">
          <colgroup>
            <col className="w-16" />
            <col />
            <col className="w-28" />
            <col className="w-28" />
          </colgroup>
          <thead>
            <tr className="border-b border-dp-border">
              <th className="px-4 py-3 text-left text-xs text-text-muted uppercase tracking-widest">{t.dashboard.rankHeader}</th>
              <th className="px-4 py-3 text-left text-xs text-text-muted uppercase tracking-widest">{t.dashboard.playerHeader}</th>
              <th className="px-4 py-3 text-right text-xs text-text-muted uppercase tracking-widest">{t.dashboard.wins}</th>
              <th className="px-4 py-3 text-right text-xs text-text-muted uppercase tracking-widest">{t.dashboard.avgScoreHeader}</th>
            </tr>
          </thead>
          <tbody>
            {isPaging
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-t border-dp-border">
                    <td className="px-4 py-3"><Skeleton className="h-4 w-8" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-10 ml-auto" /></td>
                    <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-10 ml-auto" /></td>
                  </tr>
                ))
              : leaderboard.map((entry) => {
                  const isMe = entry.clerkId === currentUserId;
                  return (
                    <tr
                      key={entry.rank}
                      className={`border-t border-dp-border transition-colors hover:bg-bg-card-hover ${isMe ? "bg-accent-purple/10" : ""}`}
                    >
                      <td className="px-4 py-3 font-semibold" style={{ color: "#9B6FDF" }}>#{entry.rank}</td>
                      <td className="px-4 py-3 text-white">
                        <span className="flex items-center gap-2">
                          {entry.username}
                          {isMe && (
                            <Badge className="bg-accent-purple text-white text-xs px-2 py-0">{t.dashboard.youBadge}</Badge>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-white">{entry.victories}</td>
                      <td className="px-4 py-3 text-right font-semibold" style={{ color: "#F5C518" }}>{entry.avgScore}</td>
                    </tr>
                  );
                })}
          </tbody>
        </table>

        <div className="flex items-center justify-between border-t border-dp-border px-4 py-3">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1 || isPaging}
            className="border-dp-border text-white hover:bg-bg-card-hover disabled:opacity-30"
            onClick={() => void loadPage(currentPage - 1)}
          >
            {t.dashboard.previous}
          </Button>
          <span className="text-xs text-text-muted">{t.dashboard.pageOf.replace("{n}", String(currentPage)).replace("{m}", String(totalPages))}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === totalPages || isPaging}
            className="border-dp-border text-white hover:bg-bg-card-hover disabled:opacity-30"
            onClick={() => void loadPage(currentPage + 1)}
          >
            {t.dashboard.next}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { t } = useLanguage();
  const { user } = useUser();
  const { getToken } = useAuth();
  const { openUserProfile } = useClerk();

  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [savedUsername, setSavedUsername] = useState("");
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [stats, setStats] = useState<SkribblStatsDTO | null>(null);
  const [garticStats, setGarticStats] = useState<GarticStatsDTO | null>(null);
  const [myRank, setMyRank] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      try {
        const [meData, statsData, rankData] = await Promise.all([
          fetchMe(getToken),
          fetchMyStats(getToken),
          fetchMyRank(getToken),
        ]);
        if (!cancelled) {
          setStats(statsData.skribbl);
          setGarticStats(statsData.gartic);
          setMyRank(rankData.rank);
          setUsername(meData.username);
          setSavedUsername(meData.username);
        }
      } catch (e) {
        if (!cancelled) toast.error(e instanceof Error ? e.message : "Failed to load dashboard");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user, getToken]);

  async function handleSaveUsername(): Promise<void> {
    const trimmed = username.trim();
    if (trimmed.length < 3 || trimmed.length > 20) {
      toast.error(t.dashboard.usernameMin);
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      toast.error(t.dashboard.usernameChars);
      return;
    }
    try {
      await patchMe(getToken, { username: trimmed });
      try { await user!.update({ username: trimmed }); } catch { /* Clerk sync optional */ }
      toast.success(t.dashboard.usernameSaved);
      setSavedUsername(trimmed);
      setIsEditingUsername(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Update failed";
      if (msg.toLowerCase().includes("taken") || msg.toLowerCase().includes("unique")) {
        toast.error(t.dashboard.usernameTaken);
      } else {
        toast.error(msg);
      }
    }
  }

  function handleChangeAvatarClick(): void {
    openUserProfile();
  }

  function handleManageAccount(): void {
    openUserProfile();
  }

  const displayName = username || user?.username || t.dashboard.playerFallback;
  const fallback = displayName.charAt(0).toUpperCase();

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-bg-primary pt-0 md:pt-16 pb-20 md:pb-8">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row gap-6 items-start">

            {/* ── SIDEBAR ──────────────────────────────────────────────── */}
            <aside className="w-full md:w-64 shrink-0">
              <div className="rounded-xl bg-bg-card border border-dp-border p-5 flex flex-col gap-4 md:sticky md:top-20">

                <div className="flex flex-col items-center gap-2 text-center pt-1">
                  {isLoading ? (
                    <Skeleton className="w-16 h-16 rounded-full" />
                  ) : (
                    <Avatar className="w-16 h-16 ring-2 ring-accent-purple/40">
                      <AvatarImage src={user?.imageUrl} alt={displayName} />
                      <AvatarFallback className="bg-accent-purple text-white text-xl font-bold">
                        {fallback}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  {isLoading ? (
                    <Skeleton className="h-4 w-28 mt-1" />
                  ) : (
                    <p className="font-semibold text-white text-base leading-tight">{displayName}</p>
                  )}
                </div>

                <Separator className="bg-dp-border" />

                <div className="flex flex-col gap-2">
                  <label className="text-xs text-text-muted uppercase tracking-widest">
                    {t.dashboard.username}
                  </label>
                  <Input
                    value={username}
                    maxLength={20}
                    placeholder={t.dashboard.usernamePlaceholder}
                    className="bg-bg-card-hover border-dp-border text-white placeholder:text-text-muted h-8 text-sm"
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setIsEditingUsername(e.target.value !== savedUsername);
                    }}
                  />
                  {isEditingUsername && (
                    <Button
                      size="sm"
                      className="bg-accent-purple hover:bg-accent-purple-light text-white w-full h-8 text-xs"
                      onClick={() => void handleSaveUsername()}
                    >
                      {t.dashboard.saveUsername}
                    </Button>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-dp-border text-white hover:bg-bg-card-hover text-xs h-8"
                    onClick={handleChangeAvatarClick}
                  >
                    {t.dashboard.changeAvatar}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-text-muted hover:text-white hover:bg-bg-card-hover text-xs h-8"
                    onClick={handleManageAccount}
                  >
                    {t.dashboard.manageAccount}
                  </Button>
                </div>
              </div>
            </aside>

            {/* ── MAIN CONTENT ─────────────────────────────────────────── */}
            <main className="flex-1 min-w-0 flex flex-col gap-6">

              {/* STATISTICS */}
              <section>
                <p className="text-xs text-text-muted uppercase tracking-widest mb-3">
                  {t.dashboard.statistics}
                </p>
                <div className="grid grid-cols-2 gap-4">

                  <Card className="bg-bg-card border-dp-border">
                    <CardHeader className="pb-1 pt-4 px-4">
                      <CardTitle className="text-xs text-text-muted uppercase tracking-widest">{t.dashboard.victories}</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-6 flex flex-col items-center text-center">
                      {isLoading ? (
                        <Skeleton className="h-10 w-16 mt-2" />
                      ) : (
                        <>
                          <p className="text-3xl sm:text-4xl font-bold text-white leading-none mt-2">
                            {stats?.victories ?? 0}
                          </p>
                          <p className="text-xs text-text-muted mt-2">{t.dashboard.gamesWon}</p>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="bg-bg-card border-dp-border">
                    <CardHeader className="pb-1 pt-4 px-4">
                      <CardTitle className="text-xs text-text-muted uppercase tracking-widest">{t.dashboard.avgScore}</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-6 flex flex-col items-center text-center">
                      {isLoading ? (
                        <Skeleton className="h-10 w-16 mt-2" />
                      ) : (
                        <>
                          <p className="text-3xl sm:text-4xl font-bold leading-none mt-2" style={{ color: "#F5C518" }}>
                            {stats?.avgScore ?? 0}
                          </p>
                          <p className="text-xs text-text-muted mt-2">{t.dashboard.scorePerGame}</p>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="bg-bg-card border-dp-border">
                    <CardHeader className="pb-1 pt-4 px-4">
                      <CardTitle className="text-xs text-text-muted uppercase tracking-widest">Gartic Phone</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-6 flex flex-col items-center text-center">
                      {isLoading ? (
                        <Skeleton className="h-10 w-16 mt-2" />
                      ) : (
                        <>
                          <p className="text-3xl sm:text-4xl font-bold leading-none mt-2" style={{ color: "#9B6FDF" }}>
                            {garticStats?.gamesPlayed ?? 0}
                          </p>
                          <p className="text-xs text-text-muted mt-2">{t.dashboard.gamesPlayed}</p>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="bg-bg-card border-dp-border">
                    <CardHeader className="pb-1 pt-4 px-4">
                      <CardTitle className="text-xs text-text-muted uppercase tracking-widest">Skribbl.io</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-6 flex flex-col items-center text-center">
                      {isLoading ? (
                        <Skeleton className="h-10 w-16 mt-2" />
                      ) : (
                        <>
                          <p className="text-3xl sm:text-4xl font-bold leading-none mt-2" style={{ color: "#3AAFD4" }}>
                            {stats?.gamesPlayed ?? 0}
                          </p>
                          <p className="text-xs text-text-muted mt-2">{t.dashboard.gamesPlayed}</p>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </section>

              {/* MY RANK */}
              <section>
                <p className="text-xs text-text-muted uppercase tracking-widest mb-3">
                  {t.dashboard.myRank}
                </p>
                <Card className="bg-bg-card border-dp-border">
                  <CardContent className="p-4">
                    {isLoading ? (
                      <Skeleton className="h-12 w-full" />
                    ) : myRank === null ? (
                      <p className="text-sm text-text-muted italic py-2">
                        {t.dashboard.unranked}
                      </p>
                    ) : (
                      <div className="rounded-lg bg-bg-card-hover border border-dp-border overflow-hidden overflow-x-auto">
                        <table className="min-w-[320px] w-full text-sm table-fixed">
                          <colgroup>
                            <col className="w-16" />
                            <col />
                            <col className="w-24" />
                            <col className="w-24" />
                          </colgroup>
                          <tbody>
                            <tr>
                              <td className="px-4 py-3 font-bold text-white">#{myRank}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <Avatar className="w-7 h-7 shrink-0">
                                    <AvatarImage src={user?.imageUrl} />
                                    <AvatarFallback className="bg-accent-purple text-white text-xs">
                                      {fallback}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-white font-medium truncate">{displayName}</span>
                                  <Badge className="bg-accent-purple text-white text-xs shrink-0 px-2 py-0">{t.dashboard.youBadge}</Badge>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right text-white">{stats?.victories ?? 0}</td>
                              <td className="px-4 py-3 text-right font-semibold" style={{ color: "#F5C518" }}>
                                {stats?.avgScore ?? 0}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </section>

              {/* LEADERBOARD */}
              <section>
                <p className="text-xs text-text-muted uppercase tracking-widest mb-3">
                  {t.dashboard.globalLeaderboard}
                </p>
                <LeaderboardTable currentUserId={user?.id} getToken={getToken} />
              </section>

            </main>
          </div>
        </div>
      </div>
      <BottomNav />
    </>
  );
}
