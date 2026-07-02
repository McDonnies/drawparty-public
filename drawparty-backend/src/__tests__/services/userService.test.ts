// DrawParty — userService Unit Tests
// Tests all exported functions of src/services/userService.ts.
// Prisma is mocked via vitest-mock-extended.

import { describe, it, vi, beforeEach } from "vitest";
import { mockDeep, mockReset } from "vitest-mock-extended";
import { PrismaClient } from "../../generated/prisma";

const prismaMock = mockDeep<PrismaClient>();
vi.mock("../../config/prisma", () => ({ prisma: prismaMock }));

beforeEach(() => mockReset(prismaMock));

// ── ensureUser ────────────────────────────────────────────────────────────────
describe("ensureUser", () => {
  // TODO: creates a User row if none exists for the given clerkId
  // TODO: returns the existing User row if one already exists (upsert)
  // TODO: updates username when it has changed
  it.todo("creates user row on first call");
  it.todo("upserts (no duplicate) on subsequent calls");
  it.todo("updates username when changed");
});

// ── getMe ─────────────────────────────────────────────────────────────────────
describe("getMe", () => {
  // TODO: returns full user DTO including stats
  // TODO: throws USER_NOT_FOUND if clerkId unknown
  it.todo("returns user DTO with stats");
  it.todo("throws USER_NOT_FOUND for unknown clerkId");
});

// ── searchUsers ───────────────────────────────────────────────────────────────
describe("searchUsers", () => {
  // TODO: returns users whose username matches the query (case-insensitive)
  // TODO: excludes the calling user from results
  // TODO: limits results to MAX_RESULTS
  // TODO: returns empty array when no match
  it.todo("returns matching users case-insensitively");
  it.todo("excludes caller from results");
  it.todo("limits result count");
});

// ── updateProfile ─────────────────────────────────────────────────────────────
describe("updateProfile", () => {
  // TODO: updates allowed profile fields (displayName)
  // TODO: throws FORBIDDEN if userId does not match authenticated user
  // TODO: sanitizes/trims display name
  it.todo("updates allowed fields");
  it.todo("throws FORBIDDEN for wrong user");
});

// ── getLeaderboard ────────────────────────────────────────────────────────────
describe("getLeaderboard", () => {
  // TODO: returns users ordered by combined score descending
  // TODO: supports pagination (page / limit)
  // TODO: returns correct total count for pagination metadata
  it.todo("returns users sorted by score descending");
  it.todo("paginates correctly");
});
