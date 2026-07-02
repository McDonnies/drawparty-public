// DrawParty — roomService Unit Tests
// Tests all exported functions of src/services/roomService.ts.
// Prisma is mocked via vitest-mock-extended.

import { describe, it, vi, beforeEach } from "vitest";
import { mockDeep, mockReset } from "vitest-mock-extended";
import { PrismaClient } from "../../generated/prisma";

const prismaMock = mockDeep<PrismaClient>();
vi.mock("../../config/prisma", () => ({ prisma: prismaMock }));

beforeEach(() => mockReset(prismaMock));

// ── createRoom ────────────────────────────────────────────────────────────────
describe("createRoom", () => {
  // TODO: creates a Room row with status WAITING and correct gameMode
  // TODO: generates a unique 6-character room code
  // TODO: creates the host as a RoomPlayer with isHost=true
  // TODO: throws if the user is already in an active room
  it.todo("creates a WAITING room with the given gameMode");
  it.todo("generates a 6-char uppercase room code");
  it.todo("sets the creator as host");
  it.todo("throws ALREADY_IN_ROOM when user is in active room");
});

// ── joinRoom ──────────────────────────────────────────────────────────────────
describe("joinRoom", () => {
  // TODO: adds a new RoomPlayer row for the joining user
  // TODO: throws ROOM_NOT_FOUND when the code is invalid
  // TODO: throws ROOM_FULL when maxPlayers is reached
  // TODO: throws ROOM_ALREADY_STARTED when room status is PLAYING
  // TODO: returns existing player row if user already is in the room (rejoin)
  it.todo("adds player to room on valid join");
  it.todo("throws ROOM_NOT_FOUND for unknown code");
  it.todo("throws ROOM_FULL when at capacity");
  it.todo("throws ROOM_ALREADY_STARTED for in-progress games");
  it.todo("returns existing player on rejoin (idempotent)");
});

// ── leaveRoom ─────────────────────────────────────────────────────────────────
describe("leaveRoom", () => {
  // TODO: sets RoomPlayer status to DISCONNECTED
  // TODO: assigns new host if the leaving player was the host
  // TODO: marks room as FINISHED if last player leaves
  it.todo("sets player status to DISCONNECTED");
  it.todo("reassigns host when host leaves");
  it.todo("marks room FINISHED when last player leaves");
});

// ── kickPlayer ────────────────────────────────────────────────────────────────
describe("kickPlayer", () => {
  // TODO: throws FORBIDDEN if requester is not the host
  // TODO: sets the target player's status to KICKED
  // TODO: cannot kick the host themselves
  it.todo("throws FORBIDDEN for non-host kicker");
  it.todo("sets target status to KICKED");
  it.todo("cannot kick the host");
});

// ── updateSettings ────────────────────────────────────────────────────────────
describe("updateSettings", () => {
  // TODO: throws FORBIDDEN if requester is not the host
  // TODO: persists the updated settings to the Room row
  // TODO: ignores unknown setting keys
  it.todo("persists settings when called by host");
  it.todo("throws FORBIDDEN for non-host");
});
