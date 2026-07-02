// DrawParty — garticPhoneService Unit Tests
// Tests all exported functions of src/services/garticPhoneService.ts.
// No real database or socket server is involved — everything is mocked.
//
// Game state machine reminder (for context):
//   PROMPT (step 0) → DRAW (step 1) → DESCRIBE (step 2) → DRAW (step 3) → ... → REWIND → FINISHED
//   Phase transitions are driven by advanceToNextPhase() after all players submit.
//
// Spec ref: specification/En-jeu---Gartic-Phone.md

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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

import { mockDeep, mockReset } from "vitest-mock-extended";
import { PrismaClient } from "../../generated/prisma";

// Initialize the mock object that the mocked prisma module will return
mocks.prismaMock = mockDeep<PrismaClient>();
const prismaMock = mocks.prismaMock;

// ── Service under test ────────────────────────────────────────────────────────

import {
  startPromptPhase,
  advanceToNextPhase,
  allPlayersSubmitted,
  emitCurrentPhaseToSocket,
  endGame,
  finishGame,
  buildChains,
  buildResults,
} from "../../services/garticPhoneService";

import type { AppServer } from "../../socket/index";
import type { Socket } from "socket.io";

// ── Shared mock builders ───────────────────────────────────────────────────────

/**
 * Creates a minimal AppServer mock that covers:
 *   io.to(roomId).emit(event, payload)   — used for broadcast
 *   io.in(roomId).fetchSockets()         — used to deliver per-player payloads
 *
 * Reset between tests with `vi.clearAllMocks()` in beforeEach.
 */
function makeMockIo(sockets: Array<{ data: { userId: string }; emit: ReturnType<typeof vi.fn> }> = []) {
  return {
    to: vi.fn().mockReturnValue({ emit: vi.fn() }),
    in: vi.fn().mockReturnValue({
      fetchSockets: vi.fn().mockResolvedValue(sockets),
    }),
  } as unknown as AppServer;
}

/**
 * Creates a minimal Socket mock for emitCurrentPhaseToSocket tests.
 * @param userId - The clerkId that socket.data.userId will return
 */
function makeMockSocket(userId: string) {
  return {
    data: { userId },
    emit: vi.fn(),
  } as unknown as Socket & { emit: ReturnType<typeof vi.fn> };
}

// ── Shared fixtures ────────────────────────────────────────────────────────────

/** A minimal connected player with a clerkId */
function makePlayer(clerkId: string, joinedAt = new Date()) {
  return {
    statusId: "CONNECTED",
    joinedAt,
    user: { clerkId },
  };
}

/** A minimal GarticChain */
function makeChain(id: string, ownerId: string, orderIndex: number, steps: unknown[] = []) {
  return { id, ownerId, orderIndex, steps };
}

// ── Helper to capture the emit spy from mockIo.to ──────────────────────────────

function getEmitSpy(mockIo: AppServer): ReturnType<typeof vi.fn> {
  const toMock = (mockIo as any).to as ReturnType<typeof vi.fn>;
  return toMock.mock.results[0]?.value?.emit as ReturnType<typeof vi.fn>;
}

// ── Reset mocks before each test ───────────────────────────────────────────────

beforeEach(() => {
  mockReset(prismaMock);
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers(); // restore real timers if a test used vi.useFakeTimers()
});

// ══════════════════════════════════════════════════════════════════════════════
// startPromptPhase
// ══════════════════════════════════════════════════════════════════════════════

describe("startPromptPhase", () => {
  // ── Case 1 ────────────────────────────────────────────────────────────────
  it("throws ROOM_NOT_FOUND when room does not exist", async () => {
    prismaMock.room.findUnique.mockResolvedValue(null);
    const mockIo = makeMockIo();

    await expect(startPromptPhase(mockIo, "nonexistent-room")).rejects.toThrow("ROOM_NOT_FOUND");
  });

  // ── Case 2 ────────────────────────────────────────────────────────────────
  it("creates a new GarticGame and one chain per player when no existing game", async () => {
    const players = [makePlayer("u1"), makePlayer("u2"), makePlayer("u3")];
    prismaMock.room.findUnique.mockResolvedValue({
      id: "room-1",
      garticGame: null,
      players,
    } as any);
    prismaMock.garticGame.create.mockResolvedValue({ id: "g1" } as any);
    prismaMock.garticChain.create.mockResolvedValue({ id: "chain-x" } as any);

    const mockIo = makeMockIo();
    await startPromptPhase(mockIo, "room-1");

    expect(prismaMock.garticGame.create).toHaveBeenCalledWith({
      data: { roomId: "room-1", totalSteps: 3, phaseId: "PROMPT", currentStep: 0 },
    });
    expect(prismaMock.garticChain.create).toHaveBeenCalledTimes(3);

    const emitSpy = getEmitSpy(mockIo);
    expect(emitSpy).toHaveBeenCalledWith("gartic:phase_changed", { phase: "PROMPT", timeLimit: 45 });
  });

  // ── Case 3 ────────────────────────────────────────────────────────────────
  it("reuses an existing GarticGame (calls update, not create)", async () => {
    prismaMock.room.findUnique.mockResolvedValue({
      id: "room-1",
      garticGame: { id: "g-existing" },
      players: [makePlayer("u1")],
    } as any);
    prismaMock.garticGame.update.mockResolvedValue({ id: "g-existing" } as any);

    const mockIo = makeMockIo();
    await startPromptPhase(mockIo, "room-1");

    expect(prismaMock.garticGame.update).toHaveBeenCalledWith({
      where: { id: "g-existing" },
      data: { phaseId: "PROMPT", currentStep: 0 },
    });
    expect(prismaMock.garticGame.create).not.toHaveBeenCalled();
    expect(prismaMock.garticChain.create).not.toHaveBeenCalled();
  });

  // ── Case 4 ────────────────────────────────────────────────────────────────
  it("broadcasts gartic:phase_changed { phase: PROMPT, timeLimit: 45 } to the room", async () => {
    const players = [makePlayer("u1"), makePlayer("u2")];
    prismaMock.room.findUnique.mockResolvedValue({
      id: "room-1",
      garticGame: null,
      players,
    } as any);
    prismaMock.garticGame.create.mockResolvedValue({ id: "g1" } as any);
    prismaMock.garticChain.create.mockResolvedValue({ id: "chain-x" } as any);

    const mockIo = makeMockIo();
    await startPromptPhase(mockIo, "room-1");

    expect(mockIo.to).toHaveBeenCalledWith("room-1");
    const emitSpy = getEmitSpy(mockIo);
    expect(emitSpy).toHaveBeenCalledWith("gartic:phase_changed", { phase: "PROMPT", timeLimit: 45 });
  });

  // ── Case 5 ────────────────────────────────────────────────────────────────
  it("sets a fallback timer that auto-fills missing prompts after 47 seconds", async () => {
    vi.useFakeTimers();

    const players = [makePlayer("u1"), makePlayer("u2")];
    prismaMock.room.findUnique.mockResolvedValue({
      id: "room-1",
      garticGame: null,
      players,
    } as any);
    prismaMock.garticGame.create.mockResolvedValue({ id: "g1" } as any);
    prismaMock.garticChain.create.mockResolvedValue({ id: "chain-x" } as any);
    prismaMock.garticChain.findMany.mockResolvedValue([
      { id: "c1", ownerId: "u1", steps: [] },
      { id: "c2", ownerId: "u2", steps: [] },
    ] as any);
    prismaMock.garticChainStep.create.mockResolvedValue({} as any);
    prismaMock.garticChainStep.count.mockResolvedValue(2);
    prismaMock.garticGame.findUnique.mockResolvedValue(null);

    const mockIo = makeMockIo();
    await startPromptPhase(mockIo, "room-1");
    await vi.advanceTimersByTimeAsync(47_000);

    expect(prismaMock.garticChain.findMany).toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// allPlayersSubmitted
// ══════════════════════════════════════════════════════════════════════════════

describe("allPlayersSubmitted", () => {
  // ── Case 1 ────────────────────────────────────────────────────────────────
  it("returns true when submission count equals playerCount", async () => {
    prismaMock.garticChainStep.count.mockResolvedValue(4);

    const result = await allPlayersSubmitted("game-1", 0, 4);

    expect(result).toBe(true);
  });

  // ── Case 2 ────────────────────────────────────────────────────────────────
  it("returns false when submission count is less than playerCount", async () => {
    prismaMock.garticChainStep.count.mockResolvedValue(2);

    const result = await allPlayersSubmitted("game-1", 0, 4);

    expect(result).toBe(false);
  });

  // ── Case 3 ────────────────────────────────────────────────────────────────
  it("queries with the correct gameId and stepIndex", async () => {
    prismaMock.garticChainStep.count.mockResolvedValue(3);

    await allPlayersSubmitted("game-xyz", 3, 3);

    expect(prismaMock.garticChainStep.count).toHaveBeenCalledWith({
      where: { chain: { garticGameId: "game-xyz" }, stepIndex: 3 },
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// advanceToNextPhase
// ══════════════════════════════════════════════════════════════════════════════

describe("advanceToNextPhase", () => {
  // ── Case 1 ────────────────────────────────────────────────────────────────
  it("returns early without emitting when game is not found", async () => {
    prismaMock.garticGame.findUnique.mockResolvedValue(null);
    const mockIo = makeMockIo();

    await advanceToNextPhase(mockIo, "room-1", "game-1");

    expect(mockIo.to).not.toHaveBeenCalled();
  });

  // ── Case 2 ────────────────────────────────────────────────────────────────
  it("returns early when submission count is less than totalPlayers", async () => {
    prismaMock.garticGame.findUnique.mockResolvedValue({
      id: "g1",
      chains: [makeChain("c0", "u0", 0), makeChain("c1", "u1", 1), makeChain("c2", "u2", 2)],
      currentStep: 0,
      totalSteps: 3,
    } as any);
    prismaMock.garticChainStep.count.mockResolvedValue(2);

    const mockIo = makeMockIo();
    await advanceToNextPhase(mockIo, "room-1", "g1");

    expect(prismaMock.garticGame.update).not.toHaveBeenCalled();
  });

  // ── Case 3 ────────────────────────────────────────────────────────────────
  it("transitions to REWIND when nextStep >= totalSteps (end of game)", async () => {
    prismaMock.garticGame.findUnique.mockResolvedValue({
      id: "g1",
      chains: [makeChain("c0", "u0", 0), makeChain("c1", "u1", 1), makeChain("c2", "u2", 2)],
      currentStep: 2,
      totalSteps: 3,
    } as any);
    prismaMock.garticChainStep.count.mockResolvedValue(3);
    prismaMock.garticGame.update.mockResolvedValue({} as any);
    // endGame → buildChains
    prismaMock.garticChain.findMany.mockResolvedValue([] as any);
    prismaMock.user.findMany.mockResolvedValue([] as any);

    const mockIo = makeMockIo();
    await advanceToNextPhase(mockIo, "room-1", "g1");

    expect(prismaMock.garticGame.update).toHaveBeenCalledWith({
      where: { id: "g1" },
      data: { currentStep: 3, phaseId: "REWIND" },
    });

    const emitSpy = getEmitSpy(mockIo);
    const rewindCall = emitSpy.mock.calls.find(([ev]: [string]) => ev === "gartic:rewind_data");
    expect(rewindCall).toBeDefined();
  });

  // ── Case 4 ────────────────────────────────────────────────────────────────
  it("transitions to DRAW phase when nextStep is odd (step 1)", async () => {
    const chains = [
      makeChain("c0", "u0", 0, [{ stepIndex: 0, content: "prompt-0" }]),
      makeChain("c1", "u1", 1, [{ stepIndex: 0, content: "prompt-1" }]),
      makeChain("c2", "u2", 2, [{ stepIndex: 0, content: "prompt-2" }]),
      makeChain("c3", "u3", 3, [{ stepIndex: 0, content: "prompt-3" }]),
    ];
    prismaMock.garticGame.findUnique.mockResolvedValue({
      id: "g1",
      chains,
      currentStep: 0,
      totalSteps: 4,
    } as any);
    prismaMock.garticChainStep.count.mockResolvedValue(4);
    prismaMock.garticGame.update.mockResolvedValue({} as any);
    prismaMock.garticChain.findMany.mockResolvedValue(chains as any);

    const sockets = [
      { data: { userId: "u0" }, emit: vi.fn() },
      { data: { userId: "u1" }, emit: vi.fn() },
      { data: { userId: "u2" }, emit: vi.fn() },
      { data: { userId: "u3" }, emit: vi.fn() },
    ];
    const mockIo = makeMockIo(sockets);

    await advanceToNextPhase(mockIo, "room-1", "g1");

    expect(prismaMock.garticGame.update).toHaveBeenCalledWith({
      where: { id: "g1" },
      data: { currentStep: 1, phaseId: "DRAW" },
    });

    for (const sock of sockets) {
      expect(sock.emit).toHaveBeenCalledWith(
        "gartic:phase_changed",
        expect.objectContaining({ phase: "DRAW", timeLimit: 60 })
      );
    }
  });

  // ── Case 5 ────────────────────────────────────────────────────────────────
  it("transitions to DESCRIBE phase when nextStep is even and >= 2 (step 2)", async () => {
    const chains = [
      makeChain("c0", "u0", 0, [{ stepIndex: 1, content: "img-base64-0" }]),
      makeChain("c1", "u1", 1, [{ stepIndex: 1, content: "img-base64-1" }]),
    ];
    prismaMock.garticGame.findUnique.mockResolvedValue({
      id: "g1",
      chains,
      currentStep: 1,
      totalSteps: 4,
    } as any);
    prismaMock.garticChainStep.count.mockResolvedValue(2);
    prismaMock.garticGame.update.mockResolvedValue({} as any);
    prismaMock.garticChain.findMany.mockResolvedValue(chains as any);

    const sockets = [
      { data: { userId: "u0" }, emit: vi.fn() },
      { data: { userId: "u1" }, emit: vi.fn() },
    ];
    const mockIo = makeMockIo(sockets);

    await advanceToNextPhase(mockIo, "room-1", "g1");

    expect(prismaMock.garticGame.update).toHaveBeenCalledWith({
      where: { id: "g1" },
      data: { currentStep: 2, phaseId: "DESCRIBE" },
    });

    for (const sock of sockets) {
      expect(sock.emit).toHaveBeenCalledWith(
        "gartic:phase_changed",
        expect.objectContaining({ phase: "DESCRIBE", timeLimit: 45 })
      );
    }
  });

  // ── Case 6 ────────────────────────────────────────────────────────────────
  it("delivers the correct previous step to each player via chain rotation", async () => {
    const chains = [
      makeChain("c0", "u0", 0, [{ stepIndex: 0, content: "prompt-0" }]),
      makeChain("c1", "u1", 1, [{ stepIndex: 0, content: "prompt-1" }]),
      makeChain("c2", "u2", 2, [{ stepIndex: 0, content: "prompt-2" }]),
    ];
    prismaMock.garticGame.findUnique.mockResolvedValue({
      id: "g1",
      chains,
      currentStep: 0,
      totalSteps: 3,
    } as any);
    prismaMock.garticChainStep.count.mockResolvedValue(3);
    prismaMock.garticGame.update.mockResolvedValue({} as any);
    prismaMock.garticChain.findMany.mockResolvedValue(chains as any);

    const sockets = [
      { data: { userId: "u0" }, emit: vi.fn() },
      { data: { userId: "u1" }, emit: vi.fn() },
      { data: { userId: "u2" }, emit: vi.fn() },
    ];
    const mockIo = makeMockIo(sockets);

    await advanceToNextPhase(mockIo, "room-1", "g1");

    expect(sockets[0].emit).toHaveBeenCalledWith(
      "gartic:phase_changed",
      expect.objectContaining({ prompt: "prompt-1" })
    );
    expect(sockets[1].emit).toHaveBeenCalledWith(
      "gartic:phase_changed",
      expect.objectContaining({ prompt: "prompt-2" })
    );
    expect(sockets[2].emit).toHaveBeenCalledWith(
      "gartic:phase_changed",
      expect.objectContaining({ prompt: "prompt-0" })
    );
  });

  // ── Case 7 ────────────────────────────────────────────────────────────────
  it("emits gartic:player_done { playerId: '' } to clear done indicators after phase change", async () => {
    const chains = [
      makeChain("c0", "u0", 0, [{ stepIndex: 0, content: "prompt-0" }]),
      makeChain("c1", "u1", 1, [{ stepIndex: 0, content: "prompt-1" }]),
    ];
    prismaMock.garticGame.findUnique.mockResolvedValue({
      id: "g1",
      chains,
      currentStep: 0,
      totalSteps: 4,
    } as any);
    prismaMock.garticChainStep.count.mockResolvedValue(2);
    prismaMock.garticGame.update.mockResolvedValue({} as any);
    prismaMock.garticChain.findMany.mockResolvedValue(chains as any);

    const sockets = [
      { data: { userId: "u0" }, emit: vi.fn() },
      { data: { userId: "u1" }, emit: vi.fn() },
    ];
    const mockIo = makeMockIo(sockets);

    await advanceToNextPhase(mockIo, "room-1", "g1");

    const emitSpy = getEmitSpy(mockIo);
    expect(emitSpy).toHaveBeenCalledWith("gartic:player_done", { playerId: "" });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// endGame
// ══════════════════════════════════════════════════════════════════════════════

describe("endGame", () => {
  // ── Case 1 ────────────────────────────────────────────────────────────────
  it("emits gartic:rewind_data with assembled chains to the room", async () => {
    prismaMock.garticChain.findMany.mockResolvedValue([
      {
        id: "c1",
        ownerId: "u1",
        orderIndex: 0,
        steps: [
          {
            stepIndex: 0,
            typeId: "PROMPT",
            content: "A cat",
            authorId: "u2",
            author: { username: "alice" },
            strokeData: null,
          },
        ],
      },
      {
        id: "c2",
        ownerId: "u2",
        orderIndex: 1,
        steps: [],
      },
    ] as any);
    prismaMock.user.findMany.mockResolvedValue([
      { clerkId: "u1", username: "bob" },
      { clerkId: "u2", username: "carol" },
    ] as any);

    const mockIo = makeMockIo();
    await endGame(mockIo, "room-1", "g1");

    expect(mockIo.to).toHaveBeenCalledWith("room-1");
    const emitSpy = getEmitSpy(mockIo);
    const rewindCall = emitSpy.mock.calls.find(([ev]: [string]) => ev === "gartic:rewind_data");
    expect(rewindCall).toBeDefined();
    expect(rewindCall[1].chains).toHaveLength(2);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// finishGame
// ══════════════════════════════════════════════════════════════════════════════

describe("finishGame", () => {
  // Reusable mock setup helper
  function setupFinishGameMocks(ownerIds: string[]) {
    // Call 1: buildChains → garticChain.findMany (with steps+author)
    prismaMock.garticChain.findMany.mockResolvedValueOnce([
      {
        id: "c1",
        ownerId: "u1",
        orderIndex: 0,
        steps: [
          {
            stepIndex: 0,
            typeId: "PROMPT",
            content: "X",
            authorId: "u1",
            author: { username: "alice" },
            strokeData: null,
          },
        ],
      },
    ] as any);
    // Call 2: stats query → garticChain.findMany (select ownerId only)
    prismaMock.garticChain.findMany.mockResolvedValueOnce(
      ownerIds.map((id, i) => ({ ownerId: id }))
    );

    // buildChains → user.findMany for owners
    prismaMock.user.findMany.mockResolvedValueOnce(
      ownerIds.map((id, i) => ({ clerkId: id, username: `user${i + 1}` }))
    );
    // buildResults → user.findMany for authors
    prismaMock.user.findMany.mockResolvedValueOnce(
      ownerIds.map((id, i) => ({ clerkId: id, username: `user${i + 1}`, avatarUrl: null }))
    );

    prismaMock.garticGame.update.mockResolvedValue({} as any);
    prismaMock.room.update.mockResolvedValue({} as any);
    prismaMock.garticStats.updateMany.mockResolvedValue({} as any);
  }

  // ── Case 1 ────────────────────────────────────────────────────────────────
  it("marks the GarticGame as FINISHED with an endedAt timestamp", async () => {
    setupFinishGameMocks(["u1"]);
    const mockIo = makeMockIo();

    await finishGame(mockIo, "room-1", "g1");

    expect(prismaMock.garticGame.update).toHaveBeenCalledWith({
      where: { id: "g1" },
      data: { phaseId: "FINISHED", endedAt: expect.any(Date) },
    });
  });

  // ── Case 2 ────────────────────────────────────────────────────────────────
  it("marks the Room as FINISHED with an endedAt timestamp", async () => {
    setupFinishGameMocks(["u1"]);
    const mockIo = makeMockIo();

    await finishGame(mockIo, "room-1", "g1");

    expect(prismaMock.room.update).toHaveBeenCalledWith({
      where: { id: "room-1" },
      data: { statusId: "FINISHED", endedAt: expect.any(Date) },
    });
  });

  // ── Case 3 ────────────────────────────────────────────────────────────────
  it("increments gamesPlayed and chainsShared for each chain owner", async () => {
    setupFinishGameMocks(["u1", "u2", "u3"]);
    const mockIo = makeMockIo();

    await finishGame(mockIo, "room-1", "g1");

    expect(prismaMock.garticStats.updateMany).toHaveBeenCalledTimes(3);
    expect(prismaMock.garticStats.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { gamesPlayed: { increment: 1 }, chainsShared: { increment: 1 } },
      })
    );
  });

  // ── Case 4 ────────────────────────────────────────────────────────────────
  it("broadcasts gartic:game_ended with roomId and results to all players", async () => {
    setupFinishGameMocks(["u1"]);
    const mockIo = makeMockIo();

    await finishGame(mockIo, "room-1", "g1");

    expect(mockIo.to).toHaveBeenCalledWith("room-1");
    const emitSpy = getEmitSpy(mockIo);
    const gameEndedCall = emitSpy.mock.calls.find(([ev]: [string]) => ev === "gartic:game_ended");
    expect(gameEndedCall).toBeDefined();
    expect(gameEndedCall[1]).toEqual({
      roomId: "room-1",
      results: expect.any(Object),
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// buildChains
// ══════════════════════════════════════════════════════════════════════════════

describe("buildChains", () => {
  // ── Case 1 ────────────────────────────────────────────────────────────────
  it("returns a correctly shaped GarticChainDTO array with ownerUsername populated", async () => {
    prismaMock.garticChain.findMany.mockResolvedValue([
      {
        id: "c1",
        ownerId: "u1",
        orderIndex: 0,
        steps: [
          {
            stepIndex: 0,
            typeId: "PROMPT",
            content: "A cat",
            authorId: "u2",
            author: { username: "alice" },
            strokeData: null,
          },
        ],
      },
    ] as any);
    prismaMock.user.findMany.mockResolvedValue([{ clerkId: "u1", username: "bob" }] as any);

    const chains = await buildChains("g1");

    expect(chains[0].ownerUsername).toBe("bob");
    expect(chains[0].steps[0].type).toBe("PROMPT");
    expect(chains[0].steps[0].authorUsername).toBe("alice");
  });

  // ── Case 2 ────────────────────────────────────────────────────────────────
  it("returns an empty array when no chains exist", async () => {
    prismaMock.garticChain.findMany.mockResolvedValue([] as any);
    prismaMock.user.findMany.mockResolvedValue([] as any);

    const chains = await buildChains("g1");

    expect(chains).toEqual([]);
  });

  // ── Case 3 ────────────────────────────────────────────────────────────────
  it("falls back to 'Unknown' when owner is not found in user lookup", async () => {
    prismaMock.garticChain.findMany.mockResolvedValue([
      { id: "c1", ownerId: "ghost-user", orderIndex: 0, steps: [] },
    ] as any);
    prismaMock.user.findMany.mockResolvedValue([] as any);

    const chains = await buildChains("g1");

    expect(chains[0].ownerUsername).toBe("Unknown");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// buildResults
// ══════════════════════════════════════════════════════════════════════════════

describe("buildResults", () => {
  // ── Case 1 ────────────────────────────────────────────────────────────────
  it("tallies promptsWritten, drawingsSubmitted, descriptionsWritten correctly per player", async () => {
    prismaMock.garticChain.findMany.mockResolvedValue([
      {
        id: "c1",
        ownerId: "u1",
        orderIndex: 0,
        steps: [
          { stepIndex: 0, typeId: "PROMPT", content: "x", authorId: "A", author: { username: "alice" }, strokeData: null },
          { stepIndex: 1, typeId: "DRAW", content: "img", authorId: "B", author: { username: "bob" }, strokeData: null },
        ],
      },
      {
        id: "c2",
        ownerId: "u2",
        orderIndex: 1,
        steps: [
          { stepIndex: 0, typeId: "PROMPT", content: "y", authorId: "B", author: { username: "bob" }, strokeData: null },
          { stepIndex: 2, typeId: "DESCRIBE", content: "z", authorId: "A", author: { username: "alice" }, strokeData: null },
        ],
      },
    ] as any);
    prismaMock.user.findMany
      .mockResolvedValueOnce([{ clerkId: "u1", username: "p1" }, { clerkId: "u2", username: "p2" }])
      .mockResolvedValueOnce([
        { clerkId: "A", username: "alice", avatarUrl: null },
        { clerkId: "B", username: "bob", avatarUrl: null },
      ]);

    const results = await buildResults("g1");

    const playerA = results.playerResults.find((p) => p.clerkId === "A")!;
    expect(playerA.promptsWritten).toBe(1);
    expect(playerA.descriptionsWritten).toBe(1);
    expect(playerA.drawingsSubmitted).toBe(0);

    const playerB = results.playerResults.find((p) => p.clerkId === "B")!;
    expect(playerB.drawingsSubmitted).toBe(1);
    expect(playerB.promptsWritten).toBe(1);
  });

  // ── Case 2 ────────────────────────────────────────────────────────────────
  it("assigns rank 1 to every player (Gartic Phone is collaborative)", async () => {
    prismaMock.garticChain.findMany.mockResolvedValue([
      {
        id: "c1",
        ownerId: "u1",
        orderIndex: 0,
        steps: [
          { stepIndex: 0, typeId: "PROMPT", content: "x", authorId: "A", author: { username: "alice" }, strokeData: null },
        ],
      },
      {
        id: "c2",
        ownerId: "u2",
        orderIndex: 1,
        steps: [
          { stepIndex: 0, typeId: "DRAW", content: "img", authorId: "B", author: { username: "bob" }, strokeData: null },
        ],
      },
    ] as any);
    prismaMock.user.findMany
      .mockResolvedValueOnce([{ clerkId: "u1", username: "p1" }, { clerkId: "u2", username: "p2" }])
      .mockResolvedValueOnce([
        { clerkId: "A", username: "alice", avatarUrl: null },
        { clerkId: "B", username: "bob", avatarUrl: null },
      ]);

    const results = await buildResults("g1");

    expect(results.playerResults.every((p) => p.rank === 1)).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// emitCurrentPhaseToSocket
// ══════════════════════════════════════════════════════════════════════════════

describe("emitCurrentPhaseToSocket", () => {
  // ── Case 1 ────────────────────────────────────────────────────────────────
  it("emits nothing when no active game is found for the room", async () => {
    prismaMock.garticGame.findFirst.mockResolvedValue(null);
    const socket = makeMockSocket("u1");

    await emitCurrentPhaseToSocket(socket, "room-1");

    expect(socket.emit).not.toHaveBeenCalled();
  });

  // ── Case 2 ────────────────────────────────────────────────────────────────
  it("emits PROMPT phase with timeLimit 45 when phase is PROMPT", async () => {
    prismaMock.garticGame.findFirst.mockResolvedValue({
      phaseId: "PROMPT",
      currentStep: 0,
      chains: [makeChain("c1", "u1", 0)],
    } as any);
    const socket = makeMockSocket("u1");

    await emitCurrentPhaseToSocket(socket, "room-1");

    expect(socket.emit).toHaveBeenCalledWith("gartic:phase_changed", {
      phase: "PROMPT",
      timeLimit: 45,
    });
  });

  // ── Case 3 ────────────────────────────────────────────────────────────────
  it("emits DRAW phase with correct prompt content for a reconnecting player", async () => {
    prismaMock.garticGame.findFirst.mockResolvedValue({
      phaseId: "DRAW",
      currentStep: 1,
      chains: [
        makeChain("c0", "u0", 0, [{ stepIndex: 0, content: "A cat" }]),
        makeChain("c1", "u1", 1, [{ stepIndex: 0, content: "A dog" }]),
        makeChain("c2", "u2", 2, [{ stepIndex: 0, content: "A dragon" }]),
      ],
    } as any);
    const socket = makeMockSocket("u1");

    await emitCurrentPhaseToSocket(socket, "room-1");

    expect(socket.emit).toHaveBeenCalledWith("gartic:phase_changed", {
      phase: "DRAW",
      prompt: "A dragon",
      timeLimit: 60,
    });
  });

  // ── Case 4 ────────────────────────────────────────────────────────────────
  it("emits DESCRIBE phase with imageBase64 for a reconnecting player", async () => {
    prismaMock.garticGame.findFirst.mockResolvedValue({
      phaseId: "DESCRIBE",
      currentStep: 2,
      chains: [
        makeChain("c0", "u0", 0, [{ stepIndex: 1, content: "img-a" }]),
        makeChain("c1", "u1", 1, [{ stepIndex: 1, content: "img-b" }]),
        makeChain("c2", "u2", 2, [{ stepIndex: 1, content: "<base64>" }]),
      ],
    } as any);
    // u1: playerIndex=1, receivedChainIndex=(1+2)%3=0 → chain c0 → prevStep stepIndex=1 → "img-a"
    const socket = makeMockSocket("u1");

    await emitCurrentPhaseToSocket(socket, "room-1");

    expect(socket.emit).toHaveBeenCalledWith("gartic:phase_changed", {
      phase: "DESCRIBE",
      imageBase64: "img-a",
      timeLimit: 45,
    });
  });

  // ── Case 5 ────────────────────────────────────────────────────────────────
  it("emits nothing when the reconnecting player is not found in any chain", async () => {
    prismaMock.garticGame.findFirst.mockResolvedValue({
      phaseId: "DRAW",
      currentStep: 1,
      chains: [
        makeChain("c0", "u0", 0, []),
        makeChain("c1", "u1", 1, []),
      ],
    } as any);
    const socket = makeMockSocket("ghost");

    await emitCurrentPhaseToSocket(socket, "room-1");

    expect(socket.emit).not.toHaveBeenCalled();
  });
});
