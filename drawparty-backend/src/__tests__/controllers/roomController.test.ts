// DrawParty — roomController Unit Tests
// Tests HTTP handler functions in src/controllers/roomController.ts.

import { describe, it, vi, beforeEach } from "vitest";

vi.mock("../../services/roomService", () => ({
  createRoom: vi.fn(),
  joinRoom: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

// ── POST /rooms ───────────────────────────────────────────────────────────────
describe("POST /rooms", () => {
  // TODO: calls roomService.createRoom with gameMode from body
  // TODO: returns 201 with RoomDTO
  // TODO: returns 400 when gameMode is invalid/missing
  // TODO: returns 401 when unauthenticated
  it.todo("returns 201 with created room");
  it.todo("returns 400 for invalid gameMode");
  it.todo("returns 401 when unauthenticated");
});

// ── POST /rooms/join ──────────────────────────────────────────────────────────
describe("POST /rooms/join", () => {
  // TODO: calls roomService.joinRoom with code from body
  // TODO: returns 200 with RoomDTO
  // TODO: returns 404 on ROOM_NOT_FOUND
  // TODO: returns 409 on ROOM_FULL
  // TODO: returns 400 on ROOM_ALREADY_STARTED
  it.todo("returns 200 on successful join");
  it.todo("returns 404 for unknown code");
  it.todo("returns 409 when full");
  it.todo("returns 400 when already started");
});
