// DrawParty — userController Unit Tests
// Tests HTTP handler functions in src/controllers/userController.ts.

import { describe, it, vi, beforeEach } from "vitest";

vi.mock("../../services/userService", () => ({
  ensureUser: vi.fn(),
  getMe: vi.fn(),
  searchUsers: vi.fn(),
  updateProfile: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

// ── GET /users/me ─────────────────────────────────────────────────────────────
describe("GET /users/me", () => {
  // TODO: calls ensureUser (upsert) then getMe, returns 200
  // TODO: returns 401 when unauthenticated
  it.todo("returns 200 with user DTO after upsert");
  it.todo("returns 401 when unauthenticated");
});

// ── GET /users/search ─────────────────────────────────────────────────────────
describe("GET /users/search", () => {
  // TODO: calls searchUsers with ?q param
  // TODO: returns 400 when q is missing or too short
  it.todo("returns matching users");
  it.todo("returns 400 for missing/short query");
});

// ── PATCH /users/me ───────────────────────────────────────────────────────────
describe("PATCH /users/me", () => {
  // TODO: updates allowed fields and returns 200
  // TODO: returns 400 for empty/invalid body
  it.todo("updates profile and returns 200");
  it.todo("returns 400 for invalid body");
});
