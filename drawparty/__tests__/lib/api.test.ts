// DrawParty — lib/api Tests
// Tests all 12 exported API helper functions in lib/api.ts.
// fetch is stubbed via vi.stubGlobal in beforeEach.
// Each helper is called with a mock getToken and the response is controlled per test.

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  apiFetch,
  createRoom,
  joinRoom,
  fetchMe,
  fetchMyStats,
  fetchMyRank,
  fetchLeaderboard,
  getFriends,
  getPendingRequests,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
} from "@/lib/api";

// Convenience: build a fake fetch that returns a successful JSON response
function mockFetch(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: vi.fn().mockResolvedValue(body),
  });
}

const getToken = vi.fn().mockResolvedValue("test-jwt-token");

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", mockFetch({}));
});

// ── apiFetch (core) ───────────────────────────────────────────────────────────

describe("apiFetch", () => {
  it("sets Authorization header when token is present", async () => {
    vi.stubGlobal("fetch", mockFetch({ ok: true }));
    await apiFetch("/test", getToken);
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer test-jwt-token");
  });

  it("throws on non-2xx response with server message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: vi.fn().mockResolvedValue({ message: "Room not found" }),
      })
    );
    await expect(apiFetch("/rooms/bad", getToken)).rejects.toThrow("Room not found");
  });
});

// ── createRoom ────────────────────────────────────────────────────────────────

describe("createRoom", () => {
  it("sends POST /rooms and returns RoomDTO", async () => {
    const fakeRoom = { id: "r1", code: "ABC123" };
    vi.stubGlobal("fetch", mockFetch(fakeRoom, 201));
    const result = await createRoom(getToken, "GARTIC_PHONE");
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/rooms");
    expect(init.method).toBe("POST");
    expect(result).toEqual(fakeRoom);
  });

  it("throws on non-2xx response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: vi.fn().mockResolvedValue({ message: "Server error" }),
      })
    );
    await expect(createRoom(getToken, "SKRIBBL")).rejects.toThrow("Server error");
  });
});

// ── joinRoom ──────────────────────────────────────────────────────────────────

describe("joinRoom", () => {
  it("sends POST /rooms/:code/join with code", async () => {
    const fakeRoom = { id: "r2", code: "XYZ" };
    vi.stubGlobal("fetch", mockFetch(fakeRoom, 200));
    const result = await joinRoom(getToken, "XYZ");
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/XYZ/join");
    expect(init.method).toBe("POST");
    expect(result).toEqual(fakeRoom);
  });
});

// ── fetchMe ───────────────────────────────────────────────────────────────────

describe("fetchMe", () => {
  it("GET /users/me triggers upsert and returns MeResponseDTO", async () => {
    const fakeMe = { id: "u1", username: "alice" };
    vi.stubGlobal("fetch", mockFetch(fakeMe));
    const result = await fetchMe(getToken);
    const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(url).toContain("/users/me");
    expect(result).toEqual(fakeMe);
  });
});

// ── fetchMyStats ──────────────────────────────────────────────────────────────

describe("fetchMyStats", () => {
  it("GET /users/me/stats returns StatsDTO", async () => {
    const fakeStats = { gamesPlayed: 10, wins: 3 };
    vi.stubGlobal("fetch", mockFetch(fakeStats));
    const result = await fetchMyStats(getToken);
    const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(url).toContain("/users/me/stats");
    expect(result).toEqual(fakeStats);
  });
});

// ── fetchMyRank ───────────────────────────────────────────────────────────────

describe("fetchMyRank", () => {
  it("GET /users/me/rank returns { rank }", async () => {
    const fakeRank = { rank: 42 };
    vi.stubGlobal("fetch", mockFetch(fakeRank));
    const result = await fetchMyRank(getToken);
    const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(url).toContain("/users/me/rank");
    expect(result).toEqual(fakeRank);
  });
});

// ── fetchLeaderboard ──────────────────────────────────────────────────────────

describe("fetchLeaderboard", () => {
  it("GET /leaderboard with pagination params", async () => {
    const fakePage = { items: [], total: 0 };
    vi.stubGlobal("fetch", mockFetch(fakePage));
    await fetchLeaderboard(getToken, 2, 5);
    const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(url).toContain("page=2");
    expect(url).toContain("pageSize=5");
  });
});

// ── getFriends ────────────────────────────────────────────────────────────────

describe("getFriends", () => {
  it("GET /friends returns FriendDTO array", async () => {
    const fakeFriends = [{ id: "f1", clerkId: "clerk1", username: "bob" }];
    vi.stubGlobal("fetch", mockFetch(fakeFriends));
    const result = await getFriends(getToken);
    const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(url).toContain("/friends");
    expect(result).toEqual(fakeFriends);
  });
});

// ── getPendingRequests ────────────────────────────────────────────────────────

describe("getPendingRequests", () => {
  it("GET /friends/requests returns PendingRequestDTO array", async () => {
    const fakeReqs = [{ requestId: "req1" }];
    vi.stubGlobal("fetch", mockFetch(fakeReqs));
    const result = await getPendingRequests(getToken);
    const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(url).toContain("/friends/requests");
    expect(result).toEqual(fakeReqs);
  });
});

// ── sendFriendRequest ─────────────────────────────────────────────────────────

describe("sendFriendRequest", () => {
  it("POST /friends/request with targetClerkId", async () => {
    vi.stubGlobal("fetch", mockFetch(null, 200));
    await sendFriendRequest(getToken, "clerk_bob");
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/friends/request");
    expect(init.method).toBe("POST");
    expect(init.body).toContain("clerk_bob");
  });
});

// ── acceptFriendRequest ───────────────────────────────────────────────────────

describe("acceptFriendRequest", () => {
  it("PATCH /friends/request/:id/accept", async () => {
    vi.stubGlobal("fetch", mockFetch(null, 200));
    await acceptFriendRequest(getToken, "req42");
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/req42/accept");
    expect(init.method).toBe("PATCH");
  });
});

// ── declineFriendRequest ──────────────────────────────────────────────────────

describe("declineFriendRequest", () => {
  it("PATCH /friends/request/:id/decline", async () => {
    vi.stubGlobal("fetch", mockFetch(null, 200));
    await declineFriendRequest(getToken, "req43");
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/req43/decline");
    expect(init.method).toBe("PATCH");
  });
});

// ── removeFriend ──────────────────────────────────────────────────────────────

describe("removeFriend", () => {
  it("DELETE /friends/:clerkId", async () => {
    vi.stubGlobal("fetch", mockFetch(null, 200));
    await removeFriend(getToken, "clerk_eve");
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/friends/");
    expect(url).toContain("clerk_eve");
    expect(init.method).toBe("DELETE");
  });
});
