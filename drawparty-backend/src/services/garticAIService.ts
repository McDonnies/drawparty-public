import { prisma } from "../config/prisma";
import type { AppServer } from "../socket/index";
import * as aiService from "./aiService";
import type { Socket } from "socket.io";

// ── Constants ─────────────────────────────────────────────────────────────────

const REVEAL_MS = 3000;
const RESULT_PAUSE_S = 4;
const SUBMIT_WINDOW_MS = 3000;
const DEFAULT_DRAW_TIME_S = 20;
const DEFAULT_DRAW_TIME_PER_TURN_S = 20;
const DEFAULT_LIVES = 3;

const BLANK_CANVAS =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

// ── In-memory room state ──────────────────────────────────────────────────────

type GarticAIRoomState = {
  gameId: string;
  roundId: string;
  word: string;
  letterHint: string;            // e.g. "_ P _ _ E" — revealed positions for AI
  roundIndex: number;
  lives: number;
  score: number;
  drawTimeS: number;
  wordCategory?: string;
  hintLetterCount: number;       // 0-3; from room setting
  usedWordIds: string[];
  roundResults: Array<{ word: string; success: boolean; aiGuess: string; canvas?: string }>;
  phase: "REVEALING" | "DRAWING" | "JUDGING" | "RESULT";
  canvasSubmitted: boolean;
  drawStartTime?: number;
  timer?: ReturnType<typeof setTimeout>;

  // Turn-based
  drawMode: "turn" | "shared";
  drawTimePerTurnS: number;
  playerOrder: string[];         // clerkIds in join order
  currentTurnIndex: number;
  turnStartTime?: number;
  turnTimer?: ReturnType<typeof setTimeout>;
};

const roomStates = new Map<string, GarticAIRoomState>();

function clearTimer(state: GarticAIRoomState): void {
  if (state.timer) { clearTimeout(state.timer); state.timer = undefined; }
  if (state.turnTimer) { clearTimeout(state.turnTimer); state.turnTimer = undefined; }
}

// ── Word selection ────────────────────────────────────────────────────────────

async function pickWord(usedWordIds: string[], category?: string, minWordLength = 0): Promise<{ id: string; text: string }> {
  const where: Record<string, unknown> = { language: "en" };
  if (usedWordIds.length > 0) where.id = { notIn: usedWordIds };
  if (category) where.category = category;

  if (minWordLength > 1) {
    // Prisma has no text-length filter — fetch candidates and filter in memory
    const candidates = await prisma.word.findMany({ where: where as any });
    const filtered = candidates.filter((w) => w.text.length >= minWordLength);
    const pool = filtered.length > 0 ? filtered : candidates; // fall back to unfiltered if too restrictive
    if (pool.length === 0) return { id: "fallback", text: "cloud" };
    return pool[Math.floor(Math.random() * pool.length)];
  }

  const count = await prisma.word.count({ where: where as any });
  if (count === 0) {
    const fallback = await prisma.word.findFirst({ where: { language: "en" }, orderBy: { id: "asc" } });
    return fallback ?? { id: "fallback", text: "cloud" };
  }
  const skip = Math.floor(Math.random() * count);
  const words = await prisma.word.findMany({ where: where as any, skip, take: 1 });
  return words[0] ?? { id: "fallback", text: "cloud" };
}

// ── Letter hint generation ────────────────────────────────────────────────────

function generateLetterHint(word: string, count: number): string {
  if (count <= 0) return "";
  const letters = word.toLowerCase().split("");
  const indices = letters.map((_, i) => i);
  // Fisher-Yates shuffle to pick random positions
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const revealed = new Set(indices.slice(0, Math.min(count, indices.length)));
  return letters.map((l, i) => (revealed.has(i) ? l.toUpperCase() : "_")).join(" ");
}

// ── Game lifecycle ────────────────────────────────────────────────────────────

export async function startGame(roomId: string, io: AppServer): Promise<void> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      players: {
        where: { statusId: "CONNECTED" },
        include: { user: { select: { clerkId: true, username: true } } },
        orderBy: { joinedAt: "asc" },
      },
      garticAIConfig: true,
    },
  });
  if (!room) throw new Error("ROOM_NOT_FOUND");

  const cfg = room.garticAIConfig;
  const drawMode: "turn" | "shared" = cfg?.aiDrawModeId === "shared" ? "shared" : "turn";
  const drawTimePerTurnS: number = cfg?.aiDrawTimePerTurn ?? DEFAULT_DRAW_TIME_PER_TURN_S;
  const drawTimeS: number = cfg?.aiDrawTime ?? DEFAULT_DRAW_TIME_S;
  const initialLives: number = cfg?.aiLives ?? DEFAULT_LIVES;
  const wordCategory: string | undefined = cfg?.aiWordCategory ? cfg.aiWordCategory : undefined;
  const hintLetterCount: number = cfg ? Math.min(3, Math.max(0, cfg.aiHintLetters)) : 0;

  // Shuffle join-order so first drawer is random each game (Fisher-Yates)
  const rawOrder = room.players.map((p) => p.user.clerkId);
  for (let i = rawOrder.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rawOrder[i], rawOrder[j]] = [rawOrder[j], rawOrder[i]];
  }
  const playerOrder = rawOrder;

  const minWordLength = hintLetterCount > 0 ? hintLetterCount + 2 : 0;
  const word = await pickWord([], wordCategory, minWordLength);
  const letterHint = generateLetterHint(word.text, hintLetterCount);

  const game = await prisma.garticAIGame.create({
    data: { roomId, lives: initialLives, score: 0, phaseId: "DRAWING" },
  });

  const round = await prisma.garticAIRound.create({
    data: { gameId: game.id, roundIndex: 0, word: word.text },
  });

  const state: GarticAIRoomState = {
    gameId: game.id,
    roundId: round.id,
    word: word.text,
    letterHint,
    roundIndex: 0,
    lives: initialLives,
    score: 0,
    drawTimeS,
    wordCategory,
    hintLetterCount,
    usedWordIds: [word.id],
    roundResults: [],
    phase: "REVEALING",
    canvasSubmitted: false,
    drawMode,
    drawTimePerTurnS,
    playerOrder,
    currentTurnIndex: 0,
  };
  roomStates.set(roomId, state);

  io.to(roomId).emit("gartic_ai:round_start", {
    word: word.text,
    wordLength: word.text.length,
    letterHint,
    roundIndex: 0,
    lives: initialLives,
    score: 0,
    revealDuration: REVEAL_MS,
  });

  state.timer = setTimeout(() => startDrawingPhase(roomId, io), REVEAL_MS);
}

function startDrawingPhase(roomId: string, io: AppServer): void {
  const state = roomStates.get(roomId);
  if (!state) return;

  state.phase = "DRAWING";
  state.canvasSubmitted = false;
  state.currentTurnIndex = 0;
  state.drawStartTime = Date.now();

  if (state.drawMode === "shared") {
    const drawMs = state.drawTimeS * 1000;
    io.to(roomId).emit("gartic_ai:drawing_start", { durationMs: drawMs });
    state.timer = setTimeout(() => {
      const s = roomStates.get(roomId);
      if (!s || s.phase !== "DRAWING") return;
      io.to(roomId).emit("gartic_ai:time_up");
      s.timer = setTimeout(() => {
        handleCanvasSubmit(roomId, BLANK_CANVAS, io).catch((err) =>
          console.error("[gartic_ai] fallback submit error:", err)
        );
      }, SUBMIT_WINDOW_MS);
    }, drawMs);
  } else {
    startTurnBasedPhase(roomId, io);
  }
}

function startTurnBasedPhase(roomId: string, io: AppServer): void {
  const state = roomStates.get(roomId);
  if (!state || state.playerOrder.length === 0) return;

  emitTurnStart(roomId, io);
}

function emitTurnStart(roomId: string, io: AppServer): void {
  const state = roomStates.get(roomId);
  if (!state) return;

  const idx = state.currentTurnIndex;
  const playerId = state.playerOrder[idx];
  if (!playerId) {
    // All turns done
    onAllTurnsDone(roomId, io);
    return;
  }

  const durationMs = state.drawTimePerTurnS * 1000;
  state.turnStartTime = Date.now();

  io.to(roomId).emit("gartic_ai:turn_start", {
    playerId,
    turnIndex: idx,
    totalTurns: state.playerOrder.length,
    durationMs,
  });

  state.turnTimer = setTimeout(() => {
    const s = roomStates.get(roomId);
    if (!s || s.phase !== "DRAWING") return;

    io.to(roomId).emit("gartic_ai:turn_end", { playerId, turnIndex: idx });
    s.currentTurnIndex += 1;

    if (s.currentTurnIndex >= s.playerOrder.length) {
      onAllTurnsDone(roomId, io);
    } else {
      emitTurnStart(roomId, io);
    }
  }, durationMs);
}

function onAllTurnsDone(roomId: string, io: AppServer): void {
  const state = roomStates.get(roomId);
  if (!state) return;

  io.to(roomId).emit("gartic_ai:time_up");

  state.timer = setTimeout(() => {
    handleCanvasSubmit(roomId, BLANK_CANVAS, io).catch((err) =>
      console.error("[gartic_ai] fallback submit error:", err)
    );
  }, SUBMIT_WINDOW_MS);
}

export async function handleCanvasSubmit(
  roomId: string,
  canvasBase64: string,
  io: AppServer
): Promise<void> {
  const state = roomStates.get(roomId);
  if (!state || state.canvasSubmitted || state.phase !== "DRAWING") return;
  state.canvasSubmitted = true;
  clearTimer(state);
  state.phase = "JUDGING";
  await judgeDrawing(roomId, canvasBase64, io);
}

async function judgeDrawing(roomId: string, canvasBase64: string, io: AppServer): Promise<void> {
  const state = roomStates.get(roomId);
  if (!state) return;

  io.to(roomId).emit("gartic_ai:judging");

  let aiGuess = "";
  let success = false;

  try {
    aiGuess = await aiService.guessDrawing(canvasBase64, undefined, state.word.length, state.letterHint || undefined);
    success = aiGuess.toLowerCase().trim() === state.word.toLowerCase().trim();
  } catch (err) {
    console.error("[gartic_ai] AI guess error:", err);
  }

  if (success) state.score += 1;
  else state.lives -= 1;

  await prisma.garticAIRound.update({
    where: { id: state.roundId },
    data: { success, aiGuess },
  });

  await prisma.garticAIGame.update({
    where: { id: state.gameId },
    data: { lives: state.lives, score: state.score },
  });

  state.roundResults.push({ word: state.word, success, aiGuess, canvas: canvasBase64 });
  state.phase = "RESULT";

  io.to(roomId).emit("gartic_ai:round_result", {
    success,
    aiGuess,
    word: state.word,
    lives: state.lives,
    score: state.score,
  });

  state.timer = setTimeout(async () => {
    if (state.lives <= 0) await endGame(roomId, io);
    else await startNextRound(roomId, io);
  }, RESULT_PAUSE_S * 1000);
}

async function startNextRound(roomId: string, io: AppServer): Promise<void> {
  const state = roomStates.get(roomId);
  if (!state) return;

  // Rotate player order so each round a different player draws first
  if (state.playerOrder.length > 1) {
    state.playerOrder = [...state.playerOrder.slice(1), state.playerOrder[0]];
  }

  const minWordLength = state.hintLetterCount > 0 ? state.hintLetterCount + 2 : 0;
  const word = await pickWord(state.usedWordIds, state.wordCategory, minWordLength);
  state.usedWordIds.push(word.id);
  state.roundIndex += 1;

  const round = await prisma.garticAIRound.create({
    data: { gameId: state.gameId, roundIndex: state.roundIndex, word: word.text },
  });

  const letterHint = generateLetterHint(word.text, state.hintLetterCount);
  state.roundId = round.id;
  state.word = word.text;
  state.letterHint = letterHint;
  state.phase = "REVEALING";
  state.canvasSubmitted = false;
  state.currentTurnIndex = 0;

  await prisma.garticAIGame.update({
    where: { id: state.gameId },
    data: { phaseId: "DRAWING" },
  });

  io.to(roomId).emit("gartic_ai:round_start", {
    word: word.text,
    wordLength: word.text.length,
    letterHint,
    roundIndex: state.roundIndex,
    lives: state.lives,
    score: state.score,
    revealDuration: REVEAL_MS,
  });

  state.timer = setTimeout(() => startDrawingPhase(roomId, io), REVEAL_MS);
}

async function endGame(roomId: string, io: AppServer): Promise<void> {
  const state = roomStates.get(roomId);
  if (!state) return;

  clearTimer(state);

  await prisma.garticAIGame.update({
    where: { id: state.gameId },
    data: { phaseId: "GAME_OVER", endedAt: new Date() },
  });

  await prisma.room.update({
    where: { id: roomId },
    data: { statusId: "FINISHED" },
  });

  io.to(roomId).emit("gartic_ai:game_over", {
    finalScore: state.score,
    rounds: state.roundResults,
  });

  roomStates.delete(roomId);
}

// ── Reconnect support ─────────────────────────────────────────────────────────

export function emitCurrentStateToSocket(socket: Socket, roomId: string): void {
  const state = roomStates.get(roomId);
  if (!state) return;

  if (state.phase === "REVEALING") {
    socket.emit("gartic_ai:round_start", {
      word: state.word,
      wordLength: state.word.length,
      letterHint: state.letterHint,
      roundIndex: state.roundIndex,
      lives: state.lives,
      score: state.score,
      revealDuration: REVEAL_MS,
    });
  } else if (state.phase === "DRAWING") {
    socket.emit("gartic_ai:round_start", {
      word: state.word,
      wordLength: state.word.length,
      letterHint: state.letterHint,
      roundIndex: state.roundIndex,
      lives: state.lives,
      score: state.score,
      revealDuration: 0,
    });
    setTimeout(() => {
      const s = roomStates.get(roomId);
      if (!s || s.phase !== "DRAWING") return;

      if (s.drawMode === "shared") {
        const elapsed = s.drawStartTime ? Date.now() - s.drawStartTime : 0;
        const remaining = Math.max(1000, s.drawTimeS * 1000 - elapsed);
        socket.emit("gartic_ai:drawing_start", { durationMs: remaining });
      } else {
        // Turn-based — emit current turn state
        const idx = s.currentTurnIndex;
        const playerId = s.playerOrder[idx];
        if (playerId) {
          const elapsed = s.turnStartTime ? Date.now() - s.turnStartTime : 0;
          const remaining = Math.max(1000, s.drawTimePerTurnS * 1000 - elapsed);
          socket.emit("gartic_ai:turn_start", {
            playerId,
            turnIndex: idx,
            totalTurns: s.playerOrder.length,
            durationMs: remaining,
          });
        }
      }
    }, 50);
  } else if (state.phase === "JUDGING" || state.phase === "RESULT") {
    socket.emit("gartic_ai:judging");
  }
}

// ── Disconnect handling ───────────────────────────────────────────────────────

export function handlePlayerDisconnect(roomId: string, clerkId: string, io: AppServer): void {
  const state = roomStates.get(roomId);
  if (!state || state.phase !== "DRAWING" || state.drawMode !== "turn") return;

  const currentPlayerId = state.playerOrder[state.currentTurnIndex];
  if (currentPlayerId !== clerkId) return;

  // Skip the disconnected player's turn
  if (state.turnTimer) { clearTimeout(state.turnTimer); state.turnTimer = undefined; }

  io.to(roomId).emit("gartic_ai:turn_end", { playerId: clerkId, turnIndex: state.currentTurnIndex });
  state.currentTurnIndex += 1;

  if (state.currentTurnIndex >= state.playerOrder.length) {
    onAllTurnsDone(roomId, io);
  } else {
    emitTurnStart(roomId, io);
  }
}

// ── Cleanup ───────────────────────────────────────────────────────────────────

export function cleanupRoom(roomId: string): void {
  const state = roomStates.get(roomId);
  if (state) clearTimer(state);
  roomStates.delete(roomId);
}
