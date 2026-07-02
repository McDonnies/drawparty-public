import type { RoomDTO, GameMode, LobbySettings } from "@/types/game";
import type {
  MeResponseDTO,
  UserStatsDTO,
  LeaderboardPage,
  FriendDTO,
  PendingRequestDTO,
  SearchResultDTO,
} from "@/types/user";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

export async function apiFetch<T>(
  path: string,
  getToken: () => Promise<string | null>,
  init?: RequestInit
): Promise<T> {
  const token = await getToken();

  let guestId: string | null = null;
  let guestName: string | null = null;
  if (!token && typeof window !== "undefined") {
    const { getOrCreateGuestId, getGuestName } = await import("@/lib/guestId");
    guestId = getOrCreateGuestId();
    guestName = getGuestName();
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token
      ? { Authorization: `Bearer ${token}` }
      : guestId
      ? {
          "X-Guest-Id": guestId,
          ...(guestName ? { "X-Guest-Name": guestName } : {}),
        }
      : {}),
    ...(init?.headers as Record<string, string> | undefined),
  };

  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers,
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body: unknown = await res.json();
      if (
        typeof body === "object" &&
        body !== null &&
        "message" in body &&
        typeof (body as { message: unknown }).message === "string"
      ) {
        message = (body as { message: string }).message;
      }
    } catch {
      // response body wasn't JSON — use statusText
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

export async function createRoom(
  getToken: () => Promise<string | null>,
  gameMode: GameMode,
  settings?: Partial<LobbySettings>
): Promise<RoomDTO> {
  return apiFetch<RoomDTO>("/rooms", getToken, {
    method: "POST",
    body: JSON.stringify({ gameMode, ...settings }),
  });
}

export async function getRoomByCode(
  getToken: () => Promise<string | null>,
  code: string
): Promise<RoomDTO> {
  return apiFetch<RoomDTO>(`/rooms/${encodeURIComponent(code)}`, getToken);
}

export async function joinRoom(
  getToken: () => Promise<string | null>,
  code: string
): Promise<RoomDTO> {
  return apiFetch<RoomDTO>(`/rooms/${encodeURIComponent(code)}/join`, getToken, {
    method: "POST",
  });
}

export async function fetchMe(
  getToken: () => Promise<string | null>
): Promise<MeResponseDTO> {
  return apiFetch<MeResponseDTO>("/users/me", getToken);
}

export async function patchMe(
  getToken: () => Promise<string | null>,
  body: { username?: string; avatarUrl?: string }
): Promise<void> {
  await apiFetch<unknown>("/users/me", getToken, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function fetchMyStats(
  getToken: () => Promise<string | null>
): Promise<UserStatsDTO> {
  return apiFetch<UserStatsDTO>("/users/me/stats", getToken);
}

export async function fetchMyRank(
  getToken: () => Promise<string | null>
): Promise<{ rank: number | null }> {
  return apiFetch<{ rank: number | null }>("/users/me/rank", getToken);
}

export async function fetchLeaderboard(
  getToken: () => Promise<string | null>,
  page: number,
  pageSize = 10
): Promise<LeaderboardPage> {
  return apiFetch<LeaderboardPage>(
    `/users/leaderboard?page=${page}&pageSize=${pageSize}`,
    getToken
  );
}

export async function getFriends(
  getToken: () => Promise<string | null>
): Promise<FriendDTO[]> {
  return apiFetch<FriendDTO[]>("/friends", getToken);
}

export async function getPendingRequests(
  getToken: () => Promise<string | null>
): Promise<PendingRequestDTO[]> {
  return apiFetch<PendingRequestDTO[]>("/friends/requests", getToken);
}

export async function searchUsers(
  getToken: () => Promise<string | null>,
  username: string
): Promise<SearchResultDTO[]> {
  return apiFetch<SearchResultDTO[]>(
    `/friends/search?username=${encodeURIComponent(username)}`,
    getToken
  );
}

export async function sendFriendRequest(
  getToken: () => Promise<string | null>,
  targetClerkId: string
): Promise<void> {
  await apiFetch<unknown>("/friends/request", getToken, {
    method: "POST",
    body: JSON.stringify({ targetClerkId }),
  });
}

export async function acceptFriendRequest(
  getToken: () => Promise<string | null>,
  requestId: string
): Promise<void> {
  await apiFetch<unknown>(`/friends/request/${requestId}/accept`, getToken, {
    method: "PATCH",
  });
}

export async function declineFriendRequest(
  getToken: () => Promise<string | null>,
  requestId: string
): Promise<void> {
  await apiFetch<unknown>(`/friends/request/${requestId}/decline`, getToken, {
    method: "PATCH",
  });
}

export async function removeFriend(
  getToken: () => Promise<string | null>,
  targetClerkId: string
): Promise<void> {
  await apiFetch<unknown>(`/friends/${encodeURIComponent(targetClerkId)}`, getToken, {
    method: "DELETE",
  });
}
