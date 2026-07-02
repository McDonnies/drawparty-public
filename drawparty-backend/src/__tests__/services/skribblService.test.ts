// DrawParty — skribblService Unit Tests
// Tests all exported functions of src/services/skribblService.ts.
// Prisma is mocked via vitest-mock-extended; Socket.io server is a mock object.
// Spec ref: specification/En-jeu---Skribblio.md

import { describe, it, vi, beforeEach } from "vitest";
import { mockDeep, mockReset } from "vitest-mock-extended";
import { PrismaClient } from "../../generated/prisma";

const prismaMock = mockDeep<PrismaClient>();
vi.mock("../../config/prisma", () => ({ prisma: prismaMock }));
vi.mock("../../services/aiService", () => ({
  guessDrawing: vi.fn(),
}));

beforeEach(() => mockReset(prismaMock));

// ── startGame ──────────────────────────────────────────────────────────────────
describe("startGame", () => {
  // TODO: verify it emits skribbl:phase with PICKING_WORD phase to the room
  // TODO: verify it creates a SkribblGame row in the DB
  // TODO: verify it picks the first drawer by lowest joinedAt
  // TODO: verify it selects 3 word choices and emits them only to the drawer
  // TODO: verify PICKING_WORD timer fires advancePhase after 30s
  // TODO: verify withAI=true adds a DrawBot player DTO to the emitted player list
  it.todo("emits PICKING_WORD phase on game start");
  it.todo("creates SkribblGame in DB");
  it.todo("emits word choices only to the drawer socket");
  it.todo("applies DrawBot when withAI is true");
});

// ── advancePhase ──────────────────────────────────────────────────────────────
describe("advancePhase", () => {
  // TODO: PICKING_WORD → DRAWING when drawer selects a word
  // TODO: DRAWING → ROUND_END when time expires
  // TODO: ROUND_END → PICKING_WORD for next drawer when rounds remain
  // TODO: ROUND_END → FINISHED when all rounds exhausted
  // TODO: verify hint letters are revealed at 25%, 50%, 75% of draw time
  it.todo("transitions PICKING_WORD → DRAWING after word selection");
  it.todo("transitions DRAWING → ROUND_END on timer expiry");
  it.todo("transitions ROUND_END → PICKING_WORD (next drawer)");
  it.todo("transitions ROUND_END → FINISHED when all rounds done");
  it.todo("reveals hint letter at 25% draw time threshold");
});

// ── handleGuess ───────────────────────────────────────────────────────────────
describe("handleGuess", () => {
  // TODO: correct guess awards points (faster = more points)
  // TODO: correct guess sets isCorrect on the SkribblGuess row
  // TODO: case-insensitive match is treated as correct
  // TODO: close guess emits a "close!" hint to the guesser
  // TODO: guessing after having already guessed correctly is ignored
  // TODO: drawer cannot guess their own word
  it.todo("awards points on correct guess");
  it.todo("handles case-insensitive match");
  it.todo("emits close-guess hint");
  it.todo("ignores a second guess from a player who already guessed correctly");
  it.todo("ignores a guess from the active drawer");
});

// ── handleWordPick ────────────────────────────────────────────────────────────
describe("handleWordPick", () => {
  // TODO: valid pick starts DRAWING phase and starts hint timers
  // TODO: pick from non-drawer is ignored
  // TODO: pick after PICKING_WORD phase ended is ignored (idempotent)
  it.todo("starts DRAWING phase on valid pick");
  it.todo("ignores pick from non-drawer");
});

// ── AI DrawBot integration ────────────────────────────────────────────────────
describe("AI DrawBot", () => {
  // TODO: DrawBot submits a guess when DRAWING phase starts (after brief delay)
  // TODO: DrawBot guess calls aiService.guessDrawing with the canvas snapshot
  // TODO: DrawBot does not guess when it is the drawer
  it.todo("DrawBot guesses during DRAWING phase");
  it.todo("DrawBot skips guessing when it is the drawer");
});
