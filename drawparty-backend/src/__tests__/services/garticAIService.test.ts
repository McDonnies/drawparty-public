// DrawParty — garticAIService Unit Tests  [NEW — added for gartic-ai game mode]
// Tests src/services/garticAIService.ts.
// Prisma mocked; Socket.io io object is a plain mock; aiService mocked.
// Spec ref: specification/En-jeu---Gartic-AI.md

import { describe, it, vi, beforeEach } from "vitest";
import { mockDeep, mockReset } from "vitest-mock-extended";
import { PrismaClient } from "../../generated/prisma";

const prismaMock = mockDeep<PrismaClient>();
vi.mock("../../config/prisma", () => ({ prisma: prismaMock }));
vi.mock("../../services/aiService", () => ({ guessDrawing: vi.fn() }));

beforeEach(() => mockReset(prismaMock));

// ── startGame ─────────────────────────────────────────────────────────────────
describe("startGame", () => {
  // TODO: creates GarticAIGame + first GarticAIRound in DB
  // TODO: emits gartic_ai:round_start to the room with correct payload
  // TODO: uses aiDrawMode="turn" by default
  // TODO: uses aiDrawMode="shared" when room setting is shared
  // TODO: sets up player turn order from room.players sorted by joinedAt
  // TODO: generates letterHint when hintLetterCount > 0
  // TODO: throws ROOM_NOT_FOUND for unknown roomId
  it.todo("creates game and first round in DB");
  it.todo("emits gartic_ai:round_start with correct payload");
  it.todo("defaults to turn-based draw mode");
  it.todo("uses shared mode when configured");
  it.todo("generates letterHint when hintLetterCount > 0");
  it.todo("throws ROOM_NOT_FOUND for unknown room");
});

// ── handleCanvasSubmit ────────────────────────────────────────────────────────
describe("handleCanvasSubmit", () => {
  // TODO: calls aiService.guessDrawing with the submitted canvas
  // TODO: emits gartic_ai:judging while AI evaluates
  // TODO: emits gartic_ai:round_result with success=true on correct guess
  // TODO: decrements lives on incorrect guess
  // TODO: idempotent — second call in same round is ignored
  // TODO: triggers endGame when lives reach 0
  // TODO: triggers startNextRound when lives remain
  it.todo("calls aiService.guessDrawing with canvas data");
  it.todo("emits judging then round_result");
  it.todo("emits success=true when AI guesses correctly");
  it.todo("decrements lives on wrong guess");
  it.todo("is idempotent (second submit ignored)");
  it.todo("ends game when lives === 0");
  it.todo("starts next round when lives > 0");
});

// ── turn-based mode ───────────────────────────────────────────────────────────
describe("turn-based draw mode", () => {
  // TODO: emits gartic_ai:turn_start with correct playerId and duration
  // TODO: advances to next player's turn after timer expiry
  // TODO: calls onAllTurnsDone after last player's turn
  // TODO: skips disconnected player's turn via handlePlayerDisconnect
  it.todo("emits turn_start for first player");
  it.todo("advances to next turn after timer");
  it.todo("calls onAllTurnsDone after last turn");
  it.todo("skips disconnected player turn");
});

// ── emitCurrentStateToSocket ──────────────────────────────────────────────────
describe("emitCurrentStateToSocket (reconnect)", () => {
  // TODO: emits round_start when phase is REVEALING
  // TODO: emits drawing_start with remaining time when phase is DRAWING (shared)
  // TODO: emits turn_start with remaining time when phase is DRAWING (turn mode)
  // TODO: emits judging when phase is JUDGING or RESULT
  // TODO: does nothing when no state exists for roomId
  it.todo("emits round_start on reconnect during REVEALING");
  it.todo("emits drawing_start with remaining time (shared mode)");
  it.todo("emits turn_start with remaining time (turn mode)");
  it.todo("emits judging when phase is JUDGING/RESULT");
  it.todo("does nothing for unknown roomId");
});

// ── generateLetterHint ────────────────────────────────────────────────────────
describe("generateLetterHint (internal helper)", () => {
  // TODO: returns empty string for count=0
  // TODO: returns string with exactly count revealed letters
  // TODO: unrevealed positions are represented as "_"
  // TODO: total tokens = word.length (each letter OR underscore)
  it.todo("returns empty string when count=0");
  it.todo("reveals exactly count letters");
  it.todo("uses _ for unrevealed positions");
});
