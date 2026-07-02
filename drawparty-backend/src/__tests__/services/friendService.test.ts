// DrawParty — friendService Unit Tests
// Tests all exported functions of src/services/friendService.ts.
// Prisma is mocked via vitest-mock-extended.

import { describe, it, vi, beforeEach } from "vitest";
import { mockDeep, mockReset } from "vitest-mock-extended";
import { PrismaClient } from "../../generated/prisma";

const prismaMock = mockDeep<PrismaClient>();
vi.mock("../../config/prisma", () => ({ prisma: prismaMock }));

beforeEach(() => mockReset(prismaMock));

// ── sendFriendRequest ─────────────────────────────────────────────────────────
describe("sendFriendRequest", () => {
  // TODO: creates a Friendship row with status PENDING
  // TODO: throws ALREADY_FRIENDS if friendship already exists in any status
  // TODO: throws SELF_REQUEST if senderId === receiverId
  // TODO: throws USER_NOT_FOUND if target user does not exist
  it.todo("creates PENDING friendship");
  it.todo("throws ALREADY_FRIENDS when friendship exists");
  it.todo("throws SELF_REQUEST for self-request");
  it.todo("throws USER_NOT_FOUND for unknown target");
});

// ── acceptFriendRequest ───────────────────────────────────────────────────────
describe("acceptFriendRequest", () => {
  // TODO: updates FriendshipStatus to ACCEPTED
  // TODO: throws NOT_FOUND if no pending request exists for this pair
  // TODO: throws FORBIDDEN if acceptor is not the receiver
  it.todo("sets friendship status to ACCEPTED");
  it.todo("throws NOT_FOUND for missing request");
  it.todo("throws FORBIDDEN when acceptor is not the receiver");
});

// ── rejectFriendRequest ───────────────────────────────────────────────────────
describe("rejectFriendRequest", () => {
  // TODO: deletes the Friendship row
  // TODO: throws FORBIDDEN if rejector is not the receiver
  it.todo("deletes the friendship row on rejection");
  it.todo("throws FORBIDDEN for wrong user");
});

// ── removeFriend ──────────────────────────────────────────────────────────────
describe("removeFriend", () => {
  // TODO: deletes the ACCEPTED Friendship row
  // TODO: throws NOT_FOUND if no friendship exists
  it.todo("removes accepted friendship");
  it.todo("throws NOT_FOUND when not friends");
});

// ── listFriends ───────────────────────────────────────────────────────────────
describe("listFriends", () => {
  // TODO: returns only ACCEPTED friendships for the given user
  // TODO: returns friends in both directions (senderId or receiverId)
  // TODO: returns empty array when user has no friends
  it.todo("returns accepted friends in both directions");
  it.todo("returns empty array when friendless");
});

// ── listPendingRequests ───────────────────────────────────────────────────────
describe("listPendingRequests", () => {
  // TODO: returns PENDING requests where user is the receiver
  // TODO: does not include requests where user is the sender
  it.todo("returns pending incoming requests only");
});
