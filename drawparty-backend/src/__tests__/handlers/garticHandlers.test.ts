// DrawParty — garticHandlers Unit Tests
// Tests all socket event handlers registered by registerGarticHandlers().
//
// Key pattern — handler extraction via socket.on capture:
//   registerGarticHandlers() calls socket.on("event", asyncHandler) for each event.
//   Instead of a real Socket.io server, we intercept socket.on() in a plain mock
//   object and store each handler by name. Tests then call handlers directly:
//
//     registerGarticHandlers(mockIo, mockSocket);
//     await handlers["gartic:submit_prompt"]({ roomId: "r1", prompt: "A cat" });
//
//   This lets us test async handler logic without a network layer.
//
// Spec ref: specification/En-jeu---Gartic-Phone.md

import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDeep, mockReset } from "vitest-mock-extended";
import { PrismaClient } from "../../generated/prisma";

// ── Prisma mock setup ──────────────────────────────────────────────────────────
//
// vi.mock() is hoisted to the top of the file by Vitest, so we use vi.hoisted()
// to create the prismaMock reference before the mock factory runs.

const mocks = vi.hoisted(() => ({ prismaMock: null as any }));

vi.mock("../../config/prisma", () => ({
  get prisma() {
    return mocks.prismaMock;
  },
}));

mocks.prismaMock = mockDeep<PrismaClient>();
const prismaMock = mocks.prismaMock;

// ── garticService mock ─────────────────────────────────────────────────────────
//
// The handlers import garticService as a namespace:
//   import * as garticService from "../../services/garticPhoneService"
// We mock the whole module so vi.spyOn() works on individual functions.

vi.mock("../../services/garticPhoneService", () => ({
  allPlayersSubmitted: vi.fn(),
  advanceToNextPhase: vi.fn(),
  finishGame: vi.fn(),
}));

import * as garticService from "../../services/garticPhoneService";

// ── Handlers under test ────────────────────────────────────────────────────────

import { registerGarticHandlers } from "../../socket/handlers/garticHandlers";
import type { AppServer } from "../../socket/index";
import type { Socket } from "socket.io";

// ── Shared mock builders ───────────────────────────────────────────────────────

/** Map populated by mockSocket.on — lets tests trigger handlers directly. */
let handlers: Record<string, (...args: unknown[]) => Promise<void>>;

/** Minimal AppServer mock covering io.to().emit() and io.in().fetchSockets() */
let mockIo: AppServer;

/** Minimal Socket mock with on() capture, to().emit(), emit(), and data.userId */
let mockSocket: Socket;

beforeEach(() => {
  mockReset(prismaMock);
  vi.clearAllMocks();

  handlers = {};

  mockIo = {
    to: vi.fn().mockReturnValue({ emit: vi.fn() }),
    in: vi.fn().mockReturnValue({ fetchSockets: vi.fn().mockResolvedValue([]) }),
  } as unknown as AppServer;

  mockSocket = {
    data: { userId: "user-host" },
    to: vi.fn().mockReturnValue({ emit: vi.fn() }),
    emit: vi.fn(),
    on: (event: string, handler: unknown) => {
      handlers[event] = handler as (...args: unknown[]) => Promise<void>;
    },
  } as unknown as Socket;

  // Register all gartic handlers — populates the `handlers` map
  registerGarticHandlers(mockIo, mockSocket);
});

// ── Helper fixtures ────────────────────────────────────────────────────────────

/** A minimal active GarticGame returned by fetchActiveGame */
function makeActiveGame(overrides: Record<string, unknown> = {}) {
  return {
    id: "game-1",
    roomId: "room-1",
    currentStep: 0,
    totalSteps: 3,
    phaseId: "PROMPT",
    chains: [
      { id: "c0", ownerId: "user-host", orderIndex: 0 },
      { id: "c1", ownerId: "user-2", orderIndex: 1 },
      { id: "c2", ownerId: "user-3", orderIndex: 2 },
    ],
    ...overrides,
  };
}

/** A minimal GarticChain for the current player */
function makeChain(id = "c0", ownerId = "user-host") {
  return { id, ownerId };
}

// ══════════════════════════════════════════════════════════════════════════════
// gartic:submit_prompt
// ══════════════════════════════════════════════════════════════════════════════

describe("gartic:submit_prompt", () => {
  // ── Case 1 ────────────────────────────────────────────────────────────────
  it("does nothing when fetchActiveGame returns null (no active game)", async () => {
    // 1. Mock: prismaMock.garticGame.findFirst.mockResolvedValue(null)
    // 2. Call: await handlers["gartic:submit_prompt"]({ roomId: "room-1", prompt: "hello" })
    // 3. Assert: prismaMock.garticChain.findFirst was NOT called
    // 4. Assert: prismaMock.garticChainStep.create was NOT called
    // TODO: implement
  });

  // ── Case 2 ────────────────────────────────────────────────────────────────
  it("does nothing when the player's chain is not found", async () => {
    // 1. Mock: garticGame.findFirst returns makeActiveGame()
    // 2. Mock: garticChain.findFirst.mockResolvedValue(null)
    // 3. Call: await handlers["gartic:submit_prompt"]({ roomId: "room-1", prompt: "hello" })
    // 4. Assert: garticChainStep.create was NOT called
    // TODO: implement
  });

  // ── Case 3 ────────────────────────────────────────────────────────────────
  it("does nothing when the player already submitted (idempotency)", async () => {
    // 1. Mock: garticGame.findFirst returns makeActiveGame()
    // 2. Mock: garticChain.findFirst returns makeChain()
    // 3. Mock: garticChainStep.findUnique returns an existing step (not null)
    // 4. Call: await handlers["gartic:submit_prompt"]({ roomId: "room-1", prompt: "hello" })
    // 5. Assert: garticChainStep.create was NOT called
    // TODO: implement
  });

  // ── Case 4 ────────────────────────────────────────────────────────────────
  it("strips HTML tags and dangerous characters from the prompt", async () => {
    // 1. Mock: full happy path (game found, chain found, no existing step, create resolves)
    // 2. Call: await handlers["gartic:submit_prompt"]({ roomId: "room-1", prompt: '<script>alert(1)</script>hello <b>world</b>' })
    // 3. Assert: garticChainStep.create called with { content: "hello world" }
    //    (HTML stripped, remaining chars cleaned, trimmed)
    // TODO: implement
  });

  // ── Case 5 ────────────────────────────────────────────────────────────────
  it("falls back to '???' when the prompt is blank or whitespace-only after sanitization", async () => {
    // 1. Mock: full happy path
    // 2. Call: await handlers["gartic:submit_prompt"]({ roomId: "room-1", prompt: "   " })
    // 3. Assert: garticChainStep.create called with { content: "???" }
    // TODO: implement
  });

  // ── Case 6 ────────────────────────────────────────────────────────────────
  it("saves the step with typeId PROMPT and emits gartic:player_done to the room", async () => {
    // 1. Mock: full happy path — game, chain, no existing step, create resolves
    // 2. Mock: garticService.allPlayersSubmitted.mockResolvedValue(false) — not all done yet
    // 3. Call: await handlers["gartic:submit_prompt"]({ roomId: "room-1", prompt: "A cat" })
    // 4. Assert: garticChainStep.create called with { typeId: "PROMPT", content: "A cat" }
    // 5. Assert: mockSocket.to("room-1").emit called with ("gartic:player_done", { playerId: "user-host" })
    // TODO: implement
  });

  // ── Case 7 ────────────────────────────────────────────────────────────────
  it("calls advanceToNextPhase when all players have submitted", async () => {
    // 1. Mock: full happy path
    // 2. Mock: garticService.allPlayersSubmitted.mockResolvedValue(true)
    // 3. Mock: garticService.advanceToNextPhase.mockResolvedValue(undefined)
    // 4. Call: await handlers["gartic:submit_prompt"]({ roomId: "room-1", prompt: "A cat" })
    // 5. Assert: garticService.advanceToNextPhase called with (mockIo, "room-1", "game-1")
    // TODO: implement
  });

  // ── Case 8 ────────────────────────────────────────────────────────────────
  it("does NOT call advanceToNextPhase when not all players have submitted yet", async () => {
    // 1. Mock: full happy path
    // 2. Mock: garticService.allPlayersSubmitted.mockResolvedValue(false)
    // 3. Call: await handlers["gartic:submit_prompt"]({ roomId: "room-1", prompt: "A cat" })
    // 4. Assert: garticService.advanceToNextPhase was NOT called
    // TODO: implement
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// gartic:submit_drawing
// ══════════════════════════════════════════════════════════════════════════════

describe("gartic:submit_drawing", () => {
  // ── Case 1 ────────────────────────────────────────────────────────────────
  it("returns early when imageBase64 is an empty string", async () => {
    // 1. Call: await handlers["gartic:submit_drawing"]({ roomId: "room-1", imageBase64: "" })
    // 2. Assert: garticGame.findFirst was NOT called
    // TODO: implement
  });

  // ── Case 2 ────────────────────────────────────────────────────────────────
  it("returns early when imageBase64 is not a string (null, undefined, number)", async () => {
    // 1. Call: await handlers["gartic:submit_drawing"]({ roomId: "room-1", imageBase64: null })
    // 2. Assert: garticGame.findFirst was NOT called
    // TODO: implement
  });

  // ── Case 3 ────────────────────────────────────────────────────────────────
  it("targets the correct chain using rotation: (playerIndex + currentStep) % totalPlayers", async () => {
    // Setup: game at currentStep 1, 3 chains (owners: user-host, user-2, user-3)
    // socket.data.userId = "user-2" → playerIndex = 1
    // targetChainIndex = (1 + 1) % 3 = 2 → targetChain = chains[2] (id: "c2")
    //
    // 1. Mock: garticGame.findFirst returns makeActiveGame({ currentStep: 1 })
    // 2. Mock: garticChain.findMany returns the 3 chains in order
    // 3. Mock: garticChainStep.findUnique returns null (not yet submitted)
    // 4. Set mockSocket.data.userId = "user-2" before calling registerGarticHandlers
    //    (or update the data on the existing mockSocket before this test)
    // 5. Call: await handlers["gartic:submit_drawing"]({ roomId: "room-1", imageBase64: "data:..." })
    // 6. Assert: garticChainStep.create called with { chainId: "c2" }
    // TODO: implement
  });

  // ── Case 4 ────────────────────────────────────────────────────────────────
  it("saves the step with strokeData when strokeData is provided", async () => {
    // 1. Full happy path mock (game, chains, no existing step)
    // 2. Call with strokeData: '{"type":"path","path":"M 0 0"}'
    // 3. Assert: garticChainStep.create called with { strokeData: '{"type":"path","path":"M 0 0"}', typeId: "DRAW" }
    // TODO: implement
  });

  // ── Case 5 ────────────────────────────────────────────────────────────────
  it("saves null for strokeData when strokeData is not provided", async () => {
    // 1. Full happy path mock
    // 2. Call without strokeData property
    // 3. Assert: garticChainStep.create called with { strokeData: null }
    // TODO: implement
  });

  // ── Case 6 ────────────────────────────────────────────────────────────────
  it("does nothing when the player is not found in any chain (playerIndex === -1)", async () => {
    // 1. Mock: game found, chains found — but none have ownerId matching socket.data.userId
    // 2. Call: await handlers["gartic:submit_drawing"]({ roomId: "room-1", imageBase64: "data:..." })
    // 3. Assert: garticChainStep.create was NOT called
    // TODO: implement
  });

  // ── Case 7 ────────────────────────────────────────────────────────────────
  it("does nothing when the player already submitted (idempotency)", async () => {
    // 1. Mock: game, chains, garticChainStep.findUnique returns an existing step
    // 2. Call with valid imageBase64
    // 3. Assert: garticChainStep.create was NOT called
    // TODO: implement
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// gartic:submit_description
// ══════════════════════════════════════════════════════════════════════════════

describe("gartic:submit_description", () => {
  // ── Case 1 ────────────────────────────────────────────────────────────────
  it("saves a sanitized description with typeId DESCRIBE", async () => {
    // 1. Full happy path mock (game at currentStep 2, chains, no existing step)
    // 2. Call: await handlers["gartic:submit_description"]({ roomId: "room-1", description: "A fluffy cat" })
    // 3. Assert: garticChainStep.create called with { typeId: "DESCRIBE", content: "A fluffy cat" }
    // TODO: implement
  });

  // ── Case 2 ────────────────────────────────────────────────────────────────
  it("falls back to '???' when description is blank after sanitization", async () => {
    // 1. Full happy path mock
    // 2. Call with description: ""
    // 3. Assert: garticChainStep.create called with { content: "???" }
    // TODO: implement
  });

  // ── Case 3 ────────────────────────────────────────────────────────────────
  it("uses the same chain rotation formula as submit_drawing", async () => {
    // Same rotation test as gartic:submit_drawing Case 3, but for DESCRIBE step.
    // See that test for the rotation formula details.
    // TODO: implement
  });

  // ── Case 4 ────────────────────────────────────────────────────────────────
  it("calls advanceToNextPhase when all players have submitted", async () => {
    // 1. Full happy path mock
    // 2. Mock: garticService.allPlayersSubmitted.mockResolvedValue(true)
    // 3. Mock: garticService.advanceToNextPhase.mockResolvedValue(undefined)
    // 4. Call: await handlers["gartic:submit_description"]({ roomId: "room-1", description: "A cat" })
    // 5. Assert: garticService.advanceToNextPhase was called
    // TODO: implement
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// gartic:rewind_next
// ══════════════════════════════════════════════════════════════════════════════

describe("gartic:rewind_next", () => {
  // ── Case 1 ────────────────────────────────────────────────────────────────
  it("broadcasts gartic:rewind_next to the room when the caller is the host", async () => {
    // 1. Mock: room.findUnique returns { hostId: "user-host" }
    //    (socket.data.userId is "user-host" by default in beforeEach)
    // 2. Call: await handlers["gartic:rewind_next"]({ roomId: "room-1" })
    // 3. Assert: io.to("room-1").emit called with "gartic:rewind_next"
    // TODO: implement
  });

  // ── Case 2 ────────────────────────────────────────────────────────────────
  it("does nothing when the caller is NOT the host", async () => {
    // 1. Mock: room.findUnique returns { hostId: "someone-else" }
    //    (socket.data.userId is "user-host" — mismatch)
    // 2. Call: await handlers["gartic:rewind_next"]({ roomId: "room-1" })
    // 3. Assert: io.to was NOT called
    // TODO: implement
  });

  // ── Case 3 ────────────────────────────────────────────────────────────────
  it("does nothing when the room is not found", async () => {
    // 1. Mock: room.findUnique.mockResolvedValue(null)
    // 2. Call: await handlers["gartic:rewind_next"]({ roomId: "room-1" })
    // 3. Assert: io.to was NOT called
    // TODO: implement
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// gartic:end_rewind
// ══════════════════════════════════════════════════════════════════════════════

describe("gartic:end_rewind", () => {
  // ── Case 1 ────────────────────────────────────────────────────────────────
  it("calls finishGame when the caller is the host and a REWIND game exists", async () => {
    // 1. Mock: room.findUnique returns { hostId: "user-host" }
    // 2. Mock: garticGame.findFirst returns { id: "g1", phaseId: "REWIND" }
    // 3. Mock: garticService.finishGame.mockResolvedValue(undefined)
    // 4. Call: await handlers["gartic:end_rewind"]({ roomId: "room-1" })
    // 5. Assert: garticService.finishGame called with (mockIo, "room-1", "g1")
    // TODO: implement
  });

  // ── Case 2 ────────────────────────────────────────────────────────────────
  it("does nothing when the caller is not the host", async () => {
    // 1. Mock: room.findUnique returns { hostId: "someone-else" }
    // 2. Call: await handlers["gartic:end_rewind"]({ roomId: "room-1" })
    // 3. Assert: garticService.finishGame was NOT called
    // TODO: implement
  });

  // ── Case 3 ────────────────────────────────────────────────────────────────
  it("does nothing when no REWIND game is found for the room", async () => {
    // 1. Mock: room.findUnique returns { hostId: "user-host" }
    // 2. Mock: garticGame.findFirst.mockResolvedValue(null)  — no REWIND game
    // 3. Call: await handlers["gartic:end_rewind"]({ roomId: "room-1" })
    // 4. Assert: garticService.finishGame was NOT called
    // TODO: implement
  });
});
