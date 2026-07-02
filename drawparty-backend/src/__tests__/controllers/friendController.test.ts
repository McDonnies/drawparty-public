// DrawParty — friendController Unit Tests
// Tests HTTP handler functions in src/controllers/friendController.ts.
// Uses supertest-style mocks: mock req/res objects + friendService mocked.

import { describe, it, vi, beforeEach } from "vitest";

vi.mock("../../services/friendService", () => ({
  sendFriendRequest: vi.fn(),
  acceptFriendRequest: vi.fn(),
  rejectFriendRequest: vi.fn(),
  removeFriend: vi.fn(),
  listFriends: vi.fn(),
  listPendingRequests: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

// ── GET /friends ──────────────────────────────────────────────────────────────
describe("GET /friends", () => {
  // TODO: calls listFriends with req.auth.userId and returns 200 + friends array
  // TODO: returns 401 when not authenticated
  it.todo("returns 200 with friends list");
  it.todo("returns 401 when unauthenticated");
});

// ── POST /friends/request ─────────────────────────────────────────────────────
describe("POST /friends/request", () => {
  // TODO: calls sendFriendRequest and returns 201
  // TODO: returns 400 when targetUserId is missing from body
  // TODO: returns 409 when ALREADY_FRIENDS error thrown
  // TODO: returns 400 when SELF_REQUEST error thrown
  it.todo("returns 201 on successful request");
  it.todo("returns 400 for missing targetUserId");
  it.todo("returns 409 on ALREADY_FRIENDS");
});

// ── PATCH /friends/:requestId/accept ─────────────────────────────────────────
describe("PATCH /friends/:requestId/accept", () => {
  // TODO: calls acceptFriendRequest and returns 200
  // TODO: returns 404 when request not found
  // TODO: returns 403 when caller is not the receiver
  it.todo("returns 200 on accept");
  it.todo("returns 404 when request missing");
  it.todo("returns 403 when caller is not receiver");
});

// ── DELETE /friends/:friendId ─────────────────────────────────────────────────
describe("DELETE /friends/:friendId", () => {
  // TODO: calls removeFriend and returns 204
  // TODO: returns 404 when friendship not found
  it.todo("returns 204 on removal");
  it.todo("returns 404 when not friends");
});
