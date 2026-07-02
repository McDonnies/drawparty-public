// Business logic for Gartic Phone game flow: phase management, chain construction, game end.
// Called from socket handlers (garticHandlers.ts and roomHandlers.ts).
//
// Game state machine:
//   PROMPT → (all prompts in) → DRAW (round 1)
//   DRAW → (all drawings in) → DESCRIBE (round 2)
//   DESCRIBE → (all descriptions in) → DRAW (round 3) OR REWIND (if all rounds done)
//   REWIND → host triggers vote (saboteur) or finish (standard)

import { prisma } from "../config/prisma";
import type { AppServer } from "../socket/index";
import type { GarticChainDTO, GarticResultDTO, GarticChainStepDTO, GarticStepType, StepRating } from "../types/game";

// ── Phase timer tracking ───────────────────────────────────────────────────────
// Each running timer is tracked with its start time + total delay so we can
// pause it mid-flight (for emergency meetings) and resume with remaining time.

type TimerInfo = {
  startedAt: number;
  delayMs: number;
  callback: () => Promise<void>;
};

const phaseTimers = new Map<string, ReturnType<typeof setTimeout>>();
const phaseTimerInfo = new Map<string, TimerInfo>();

function clearPhaseTimer(gameId: string): void {
  const timer = phaseTimers.get(gameId);
  if (timer) { clearTimeout(timer); phaseTimers.delete(gameId); }
  phaseTimerInfo.delete(gameId);
}

function setPhaseTimer(gameId: string, delay: number, callback: () => Promise<void>): void {
  clearPhaseTimer(gameId);
  phaseTimerInfo.set(gameId, { startedAt: Date.now(), delayMs: delay, callback });
  const timer = setTimeout(async () => {
    phaseTimers.delete(gameId);
    phaseTimerInfo.delete(gameId);
    await callback();
  }, delay);
  phaseTimers.set(gameId, timer);
}

// ── Phase time limits (seconds) ───────────────────────────────────────────────
const PROMPT_TIME_LIMIT_S  = 45;
const DRAW_TIME_LIMIT_S    = 60;
const DESCRIBE_TIME_LIMIT_S = 45;

/**
 * Starts the PROMPT phase for all players in a room.
 */
export async function startPromptPhase(io: AppServer, roomId: string): Promise<void> {
  // 1. Fetch room + connected players
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      players: {
        where: { statusId: "CONNECTED" },
        include: { user: true },
        orderBy: { joinedAt: "asc" },
      },
      garticGame: true,
    },
  });
  if (!room) throw new Error("ROOM_NOT_FOUND");

  const players = room.players;
  const totalSteps = players.length;
  let gameId: string;

  // 2. Create or reuse GarticGame
  if (room.garticGame) {
    gameId = room.garticGame.id;
    await prisma.garticGame.update({ where: { id: gameId }, data: { phaseId: "PROMPT", currentStep: 0 } });
  } else {
    const game = await prisma.garticGame.create({
      data: { roomId, totalSteps, phaseId: "PROMPT", currentStep: 0 },
    });
    gameId = game.id;

    // 3. Create one chain per player (ordered by join order)
    for (let i = 0; i < players.length; i++) {
      await prisma.garticChain.create({
        data: { garticGameId: gameId, ownerId: players[i].user.clerkId, orderIndex: i },
      });
    }
  }

  // 4. Broadcast PROMPT phase
  io.to(roomId).emit("gartic:phase_changed", {
    phase:     "PROMPT" as const,
    timeLimit: PROMPT_TIME_LIMIT_S,
  });

  // 5. Fallback timer
  setPhaseTimer(gameId, PROMPT_TIME_LIMIT_S * 1000 + 2000, async () => {
    await autoFillMissingPrompts(io, roomId, gameId, players);
  });
}

/**
 * Auto-fills "???" for players who haven't submitted a PROMPT before the timer expires.
 */
async function autoFillMissingPrompts(
  io: AppServer,
  roomId: string,
  gameId: string,
  players: Array<{ user: { clerkId: string } }>
): Promise<void> {
  const chains = await prisma.garticChain.findMany({
    where: { garticGameId: gameId },
    include: { steps: { where: { stepIndex: 0 } } },
  });

  for (const chain of chains) {
    if (chain.steps.length === 0) {
      await prisma.garticChainStep.create({
        data: {
          chainId: chain.id, authorId: chain.ownerId,
          stepIndex: 0, typeId: "PROMPT", content: "???",
        },
      });
      io.to(roomId).emit("gartic:player_done", { playerId: chain.ownerId });
    }
  }

  await advanceToNextPhase(io, roomId, gameId);
}

/**
 * Checks if all players have submitted for the current step, and if so advances the phase.
 * Ejected player is excluded from the required count.
 */
export async function advanceToNextPhase(io: AppServer, roomId: string, gameId: string): Promise<void> {
  const game = await prisma.garticGame.findUnique({
    where: { id: gameId },
    include: { chains: true },
  });
  if (!game) return;

  const totalPlayers = game.chains.length;
  const currentStep = game.currentStep;

  const submissionCount = await prisma.garticChainStep.count({
    where: { chain: { garticGameId: gameId }, stepIndex: currentStep },
  });

  if (submissionCount < totalPlayers) return;

  clearPhaseTimer(gameId);

  const nextStep = currentStep + 1;

  if (nextStep >= game.totalSteps) {
    await prisma.garticGame.update({
      where: { id: gameId },
      data: { currentStep: nextStep, phaseId: "REWIND" },
    });
    await endGame(io, roomId, gameId);
    return;
  }

  const isDrawStep = nextStep % 2 === 1;
  const nextPhase = isDrawStep ? "DRAW" : "DESCRIBE";
  const timeLimit = isDrawStep ? DRAW_TIME_LIMIT_S : DESCRIBE_TIME_LIMIT_S;

  await prisma.garticGame.update({
    where: { id: gameId },
    data: { currentStep: nextStep, phaseId: nextPhase },
  });

  const chains = await prisma.garticChain.findMany({
    where: { garticGameId: gameId },
    include: { steps: { orderBy: { stepIndex: "asc" } } },
    orderBy: { orderIndex: "asc" },
  });

  const sockets = await io.in(roomId).fetchSockets();

  for (const socket of sockets) {
    const userId = socket.data.userId as string;
    const playerIndex = chains.findIndex((c) => c.ownerId === userId);
    if (playerIndex === -1) continue;

    const receivedChainIndex = (playerIndex + nextStep) % totalPlayers;
    const receivedChain = chains[receivedChainIndex];
    const prevStep = receivedChain.steps.find((s) => s.stepIndex === currentStep);

    if (nextPhase === "DRAW") {
      socket.emit("gartic:phase_changed", {
        phase: "DRAW", prompt: prevStep?.content ?? "???", timeLimit,
      });
    } else {
      socket.emit("gartic:phase_changed", {
        phase: "DESCRIBE", imageBase64: prevStep?.content ?? undefined, timeLimit,
      });
    }
  }

  io.to(roomId).emit("gartic:player_done", { playerId: "" });

  const fallback = () => autoFillMissingSubmissions(io, roomId, gameId, nextStep, nextPhase);
  setPhaseTimer(gameId, timeLimit * 1000 + 2000, fallback);
}

/**
 * Auto-fills missing submissions for the current step (timer expiry fallback).
 */
async function autoFillMissingSubmissions(
  io: AppServer,
  roomId: string,
  gameId: string,
  stepIndex: number,
  phase: "DRAW" | "DESCRIBE"
): Promise<void> {
  const chains = await prisma.garticChain.findMany({
    where: { garticGameId: gameId },
    include: { steps: { where: { stepIndex } } },
  });
  const allChains = await prisma.garticChain.findMany({
    where: { garticGameId: gameId }, orderBy: { orderIndex: "asc" },
  });
  const totalPlayers = chains.length;

  for (let i = 0; i < chains.length; i++) {
    const chain = chains[i];
    if (chain.steps.length === 0) {
      const authorIndex = (i - stepIndex + totalPlayers) % totalPlayers;
      const authorId = allChains[authorIndex]?.ownerId ?? chain.ownerId;
      await prisma.garticChainStep.create({
        data: {
          chainId: chain.id, authorId, stepIndex,
          typeId: phase === "DRAW" ? "DRAW" : "DESCRIBE",
          content: phase === "DRAW" ? "" : "???",
        },
      });
      io.to(roomId).emit("gartic:player_done", { playerId: authorId });
    }
  }

  await advanceToNextPhase(io, roomId, gameId);
}

/**
 * Re-emits the current active game phase to a single reconnecting socket.
 */
export async function emitCurrentPhaseToSocket(
  socket: { emit: (event: string, data: unknown) => void; data: { userId: string } },
  roomId: string
): Promise<void> {
  const userId = socket.data.userId;

  const game = await prisma.garticGame.findFirst({
    where: { roomId, phaseId: { in: ["PROMPT", "DRAW", "DESCRIBE"] } },
    include: {
      chains: {
        include: { steps: { orderBy: { stepIndex: "asc" } } },
        orderBy: { orderIndex: "asc" },
      },
    },
  });
  if (!game) return;

  const phase = game.phaseId as "PROMPT" | "DRAW" | "DESCRIBE";
  const currentStep = game.currentStep;
  const chains = game.chains;

  if (phase === "PROMPT") {
    socket.emit("gartic:phase_changed", { phase: "PROMPT", timeLimit: PROMPT_TIME_LIMIT_S });
    return;
  }

  const playerIndex = chains.findIndex((c) => c.ownerId === userId);
  if (playerIndex === -1) return;

  const receivedChainIndex = (playerIndex + currentStep) % chains.length;
  const receivedChain = chains[receivedChainIndex];
  const prevStep = receivedChain.steps.find((s) => s.stepIndex === currentStep - 1);

  if (phase === "DRAW") {
    socket.emit("gartic:phase_changed", {
      phase: "DRAW", prompt: prevStep?.content ?? "???", timeLimit: DRAW_TIME_LIMIT_S,
    });
  } else {
    socket.emit("gartic:phase_changed", {
      phase: "DESCRIBE", imageBase64: prevStep?.content ?? undefined, timeLimit: DESCRIBE_TIME_LIMIT_S,
    });
  }
}

/**
 * Checks if all players have submitted for the current step.
 */
export async function allPlayersSubmitted(
  gameId: string,
  stepIndex: number,
  totalPlayers: number
): Promise<boolean> {
  const count = await prisma.garticChainStep.count({
    where: { chain: { garticGameId: gameId }, stepIndex },
  });
  return count >= totalPlayers;
}

/**
 * Ends the game: builds chains, emits rewind data.
 */
export async function endGame(io: AppServer, roomId: string, gameId: string): Promise<void> {
  const chains = await buildChains(gameId);
  io.to(roomId).emit("gartic:rewind_data", { chains });
}

/**
 * Finalises the game: builds results, updates DB, updates stats, emits "gartic:game_ended".
 */
export async function finishGame(
  io: AppServer,
  roomId: string,
  gameId: string
): Promise<void> {
  const results = await buildResults(gameId);

  await prisma.garticGame.update({
    where: { id: gameId },
    data: { phaseId: "FINISHED", endedAt: new Date() },
  });
  await prisma.room.update({
    where: { id: roomId },
    data: { statusId: "FINISHED", endedAt: new Date() },
  });

  // Update GarticStats for each player
  const chains = await prisma.garticChain.findMany({
    where: { garticGameId: gameId },
    select: { ownerId: true },
  });
  for (const chain of chains) {
    if (chain.ownerId.startsWith("guest_")) continue;
    await prisma.garticStats.updateMany({
      where: { user: { clerkId: chain.ownerId } },
      data: {
        gamesPlayed: { increment: 1 },
        chainsShared: { increment: 1 },
      },
    });
  }

  io.to(roomId).emit("gartic:game_ended", { roomId, results });
}

/**
 * Assembles all chains from the DB into GarticChainDTO[] for the REWIND.
 */
export async function buildChains(gameId: string): Promise<GarticChainDTO[]> {
  const chains = await prisma.garticChain.findMany({
    where: { garticGameId: gameId },
    include: {
      steps: {
        include: { author: true },
        orderBy: { stepIndex: "asc" },
      },
    },
    orderBy: { orderIndex: "asc" },
  });

  const ownerIds = chains.map((c) => c.ownerId);
  const owners = await prisma.user.findMany({
    where: { clerkId: { in: ownerIds } },
    select: { clerkId: true, username: true },
  });
  const ownerMap = new Map(owners.map((u) => [u.clerkId, u.username]));

  return chains.map((chain) => ({
    chainId: chain.id,
    ownerId: chain.ownerId,
    ownerUsername: ownerMap.get(chain.ownerId) ?? "Unknown",
    orderIndex: chain.orderIndex,
    steps: chain.steps.map(
      (step): GarticChainStepDTO => ({
        stepIndex: step.stepIndex,
        type: step.typeId as GarticStepType,
        authorId: step.authorId,
        authorUsername: step.author.username,
        content: step.content,
        imageBase64: step.content,
        strokeData: step.strokeData ?? null,
        rating: (step.ratingId as StepRating | null) ?? null,
      })
    ),
  }));
}

/**
 * Builds the final GarticResultDTO.
 */
export async function buildResults(gameId: string): Promise<GarticResultDTO> {
  const chains = await buildChains(gameId);

  const playerStats = new Map<
    string,
    { clerkId: string; username: string; avatarUrl: string | null; prompts: number; draws: number; describes: number }
  >();

  const authorIds = new Set<string>();
  for (const chain of chains) {
    for (const step of chain.steps) {
      authorIds.add(step.authorId);
    }
  }

  const authors = await prisma.user.findMany({
    where: { clerkId: { in: Array.from(authorIds) } },
    select: { clerkId: true, username: true, avatarUrl: true },
  });

  for (const author of authors) {
    playerStats.set(author.clerkId, {
      clerkId: author.clerkId,
      username: author.username,
      avatarUrl: author.avatarUrl,
      prompts: 0,
      draws: 0,
      describes: 0,
    });
  }

  for (const chain of chains) {
    for (const step of chain.steps) {
      const stats = playerStats.get(step.authorId);
      if (!stats) continue;
      if (step.type === "PROMPT") stats.prompts++;
      else if (step.type === "DRAW") stats.draws++;
      else if (step.type === "DESCRIBE") stats.describes++;
    }
  }

  return {
    chains,
    playerResults: Array.from(playerStats.values()).map((s) => ({
      clerkId: s.clerkId,
      username: s.username,
      avatarUrl: s.avatarUrl,
      rank: 1,
      promptsWritten: s.prompts,
      drawingsSubmitted: s.draws,
      descriptionsWritten: s.describes,
    })),
  };
}