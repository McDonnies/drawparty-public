// DrawParty — statsController Unit Tests
// Tests HTTP handler functions in src/controllers/statsController.ts.

import { describe, it, vi, beforeEach } from "vitest";

vi.mock("../../services/userService", () => ({
  getMyStats: vi.fn(),
  getMyRank: vi.fn(),
  getLeaderboard: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

// ── GET /users/me/stats ───────────────────────────────────────────────────────
describe("GET /users/me/stats", () => {
  // TODO: returns 200 with SkribblStats + GarticStats for the authenticated user
  // TODO: returns 401 when unauthenticated
  // TODO: returns 404 when user has no stats yet (not played)
  it.todo("returns stats for authenticated user");
  it.todo("returns 401 when unauthenticated");
});

// ── GET /users/me/rank ────────────────────────────────────────────────────────
describe("GET /users/me/rank", () => {
  // TODO: returns 200 with { rank, totalPlayers }
  // TODO: returns 401 when unauthenticated
  it.todo("returns rank and totalPlayers");
  it.todo("returns 401 when unauthenticated");
});

// ── GET /leaderboard ──────────────────────────────────────────────────────────
describe("GET /leaderboard", () => {
  // TODO: returns paginated leaderboard with correct meta
  // TODO: respects ?page and ?limit query params
  // TODO: returns 400 for invalid page/limit values
  it.todo("returns paginated leaderboard");
  it.todo("respects page and limit params");
  it.todo("returns 400 for invalid query params");
});
