// DrawParty — skribblHandlers Unit Tests
// Tests all socket event handlers registered by registerSkribblHandlers().
// Handler extraction pattern: intercept socket.on() calls in a mock object,
// store handlers by event name, then invoke them directly.
// Spec ref: specification/En-jeu---Skribblio.md

import { describe, it, vi, beforeEach } from "vitest";
import { mockDeep, mockReset } from "vitest-mock-extended";
import { PrismaClient } from "../../generated/prisma";

const prismaMock = mockDeep<PrismaClient>();
vi.mock("../../config/prisma", () => ({ prisma: prismaMock }));
vi.mock("../../services/skribblService", () => ({
  handleGuess: vi.fn(),
  handleWordPick: vi.fn(),
  advancePhase: vi.fn(),
}));

import type { AppServer } from "../../socket/index";
import type { Socket } from "socket.io";

beforeEach(() => mockReset(prismaMock));

// ── skribbl:guess ──────────────────────────────────────────────────────────────
describe("skribbl:guess handler", () => {
  // TODO: calls skribblService.handleGuess with correct params
  // TODO: wraps call in try/catch and logs errors
  // TODO: ignores event if roomId is missing
  it.todo("calls handleGuess with roomId and guess text");
  it.todo("handles errors without crashing");
});

// ── skribbl:pick_word ──────────────────────────────────────────────────────────
describe("skribbl:pick_word handler", () => {
  // TODO: calls skribblService.handleWordPick with roomId and word
  // TODO: ignores event if word not in the offered choices
  it.todo("calls handleWordPick with roomId and word");
  it.todo("ignores pick when word not in choices");
});

// ── skribbl:stroke ─────────────────────────────────────────────────────────────
describe("skribbl:stroke handler", () => {
  // TODO: relays strokeData to all other sockets in the room
  // TODO: only active drawer's strokes are relayed; others are silently dropped
  it.todo("relays stroke to room (except sender)");
  it.todo("drops strokes from non-drawer");
});

// ── skribbl:clear_canvas ──────────────────────────────────────────────────────
describe("skribbl:clear_canvas handler", () => {
  // TODO: emits skribbl:canvas_cleared to the room
  // TODO: only the active drawer can clear
  it.todo("emits canvas_cleared to room");
  it.todo("ignores clear from non-drawer");
});
