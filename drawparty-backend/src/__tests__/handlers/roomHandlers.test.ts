// DrawParty — roomHandlers Unit Tests
// Tests all socket event handlers registered by registerRoomHandlers().
// Handler extraction pattern: mock socket.on() calls, store by event name.

import { describe, it, vi, beforeEach } from "vitest";
import { mockDeep, mockReset } from "vitest-mock-extended";
import { PrismaClient } from "../../generated/prisma";

const prismaMock = mockDeep<PrismaClient>();
vi.mock("../../config/prisma", () => ({ prisma: prismaMock }));
vi.mock("../../services/roomService", () => ({
  createRoom: vi.fn(),
  joinRoom: vi.fn(),
  leaveRoom: vi.fn(),
  kickPlayer: vi.fn(),
  updateSettings: vi.fn(),
}));
vi.mock("../../services/garticPhoneService", () => ({ startGame: vi.fn() }));
vi.mock("../../services/skribblService", () => ({ startGame: vi.fn() }));
vi.mock("../../services/garticAIService", () => ({ startGame: vi.fn() }));

import type { AppServer } from "../../socket/index";
import type { Socket } from "socket.io";

beforeEach(() => mockReset(prismaMock));

// ── room:join ─────────────────────────────────────────────────────────────────
describe("room:join handler", () => {
  // TODO: calls roomService.joinRoom and emits room:state to the socket
  // TODO: joins the Socket.io room channel
  // TODO: emits room:player_joined to the rest of the room
  // TODO: emits error event on service throw
  it.todo("joins socket to room channel and emits room:state");
  it.todo("broadcasts player_joined to existing members");
  it.todo("emits error on service failure");
});

// ── room:leave ────────────────────────────────────────────────────────────────
describe("room:leave handler", () => {
  // TODO: calls roomService.leaveRoom
  // TODO: leaves the Socket.io room channel
  // TODO: emits room:player_left to remaining members
  it.todo("leaves socket room and calls leaveRoom");
  it.todo("broadcasts player_left to remaining members");
});

// ── room:kick_player ──────────────────────────────────────────────────────────
describe("room:kick_player handler", () => {
  // TODO: calls roomService.kickPlayer
  // TODO: emits room:kicked to the target socket
  // TODO: emits error when caller is not host (FORBIDDEN)
  it.todo("kicks target and emits room:kicked to target");
  it.todo("emits error when caller is not host");
});

// ── room:update_settings ──────────────────────────────────────────────────────
describe("room:update_settings handler", () => {
  // TODO: calls roomService.updateSettings and broadcasts updated settings
  // TODO: emits error when caller is not host
  it.todo("updates settings and broadcasts to room");
  it.todo("emits error for non-host caller");
});

// ── room:start_game ───────────────────────────────────────────────────────────
describe("room:start_game handler", () => {
  // TODO: routes to garticPhoneService.startGame for GARTIC_PHONE rooms
  // TODO: routes to skribblService.startGame for SKRIBBL rooms
  // TODO: routes to garticAIService.startGame for GARTIC_PHONE+aiJudgeMode rooms
  // TODO: emits room:game_started before delegating to game service
  // TODO: emits error if fewer than 2 players
  it.todo("routes to garticPhoneService for GARTIC_PHONE mode");
  it.todo("routes to skribblService for SKRIBBL mode");
  it.todo("routes to garticAIService for AI Judge mode");
  it.todo("emits error when fewer than 2 players");
});

// ── disconnect ────────────────────────────────────────────────────────────────
describe("disconnect handler", () => {
  // TODO: calls leaveRoom for all rooms the socket is in
  // TODO: handles reconnect grace period (does not remove player immediately)
  it.todo("calls leaveRoom on disconnect");
});
