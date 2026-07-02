// Business logic for the Skribbl game flow: phase management, word selection,
// guess validation, hint reveals, scoring, and stats persistence.
// Called from skribblHandlers.ts (on socket events) and roomHandlers.ts (on room:start_game).
//
// Game state machine:
//   WAITING → PICKING_WORD (30s drawer picks) → DRAWING (timePerRound seconds)
//           → ROUND_END (3s) → PICKING_WORD (next drawer) → ... → FINISHED
//
// Total rounds = room.roundCount × number of players
// (each player draws once per "round" in the settings)

import { prisma } from "../config/prisma";
import type { AppServer } from "../socket/index";
import type {
  SkribblResultDTO,
  SkribblPlayerResultDTO,
  SkribblPhasePayload,
  SkribblRoundDTO,
  RoomPlayerDTO,
} from "../types/game";
import * as aiService from "./aiService";

// ── Phase time limits ─────────────────────────────────────────────────────────

const PICKING_WORD_TIME_LIMIT_S = 30;
const ROUND_END_PAUSE_S = 8;

// Hint reveal schedule: reveal one letter at each fraction of elapsed time.
// e.g. for 60s: reveal at 15s elapsed (25%), 30s (50%), 45s (75%)
const HINT_REVEAL_THRESHOLDS = [0.25, 0.5, 0.75];

const WORD_CHOICE_COUNT = 3;

// ── Phase timers ──────────────────────────────────────────────────────────────
const phaseTimers = new Map<string, ReturnType<typeof setTimeout>>();
const hintTimers = new Map<string, ReturnType<typeof setTimeout>[]>();

// ── AI game state ─────────────────────────────────────────────────────────────
// In-memory score tracking for the DrawBot per active game.
const aiGameScores = new Map<string, { score: number; correctGuesses: number }>();

function buildAiPlayerDTO(score: number): RoomPlayerDTO {
  return {
    id: "__ai_bot__",
    userId: "__ai_bot__",
    clerkId: "__ai_bot__",
    username: "DrawBot",
    avatarUrl: null,
    isHost: false,
    isBot: true,
    score,
    status: "CONNECTED",
  };
}

function buildPlayerDTOsWithAI(
  players: Parameters<typeof buildPlayerDTOs>[0],
  roomId: string,
  withAI: boolean
): RoomPlayerDTO[] {
  const dtos = buildPlayerDTOs(players);
  if (withAI) {
    const ai = aiGameScores.get(roomId) ?? { score: 0, correctGuesses: 0 };
    dtos.push(buildAiPlayerDTO(ai.score));
  }
  return dtos;
}

function clearPhaseTimer(gameId: string): void {
  const timer = phaseTimers.get(gameId);
  if (timer) {
    clearTimeout(timer);
    phaseTimers.delete(gameId);
  }
}

function setPhaseTimer(gameId: string, delaySecs: number, callback: () => Promise<void>): void {
  clearPhaseTimer(gameId);
  const timer = setTimeout(async () => {
    phaseTimers.delete(gameId);
    await callback();
  }, delaySecs * 1000);
  phaseTimers.set(gameId, timer);
}

function clearHintTimers(roundId: string): void {
  const timers = hintTimers.get(roundId);
  if (timers) {
    timers.forEach(clearTimeout);
    hintTimers.delete(roundId);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sanitizeText(input: string, maxChars = 50): string {
  return input.replace(/<[^>]*>/g, "").trim().slice(0, maxChars);
}

function buildBlankHint(word: string): string {
  // Use "|" as a word-break marker so split(" ") always yields one token per char.
  // "ICE CREAM" → "_ _ _ | _ _ _ _ _" (9 tokens for 9 chars, no empty-string tokens)
  return word.split("").map((c) => (c === " " ? "|" : "_")).join(" ");
}

/**
 * Resolve the display text for a stored word ID.
 * Handles three cases:
 *   - Real DB word:  look up by id
 *   - Custom word:   reconstruct from room.customWords by index (id = "custom_N")
 *   - Fallback word: id = "fallback_N", text = the literal id suffix ("cat" etc.)
 *                    We store the text encoded in the ID: "fallback_0:cat"
 *
 * NOTE: for backward compat, bare "fallback_0" (no colon) defaults to "cat".
 */
async function resolveWordText(wordId: string, roomId: string): Promise<string | null> {
  if (wordId.startsWith("fallback_")) {
    const parts = wordId.split(":");
    return parts[1] ?? "cat";
  }
  if (wordId.startsWith("custom_")) {
    const idx = parseInt(wordId.replace("custom_", ""), 10);
    const config = await prisma.roomSkribblConfig.findUnique({ where: { roomId }, select: { customWords: true } });
    return config?.customWords[idx] ?? "mystery";
  }
  const word = await prisma.word.findUnique({ where: { id: wordId } });
  return word?.text ?? null;
}

function revealOneLetter(word: string, current: string): string {
  const tokens = current.split(" ");
  const hidden = tokens.reduce<number[]>((acc, t, i) => {
    if (t === "_") acc.push(i);
    return acc;
  }, []);
  if (hidden.length === 0) return current;
  const pick = hidden[Math.floor(Math.random() * hidden.length)];
  tokens[pick] = word[pick];
  return tokens.join(" ");
}

function calculatePoints(timeLeft: number, totalTime: number, isFirstGuesser: boolean): number {
  return Math.max(50, Math.round((timeLeft / totalTime) * (isFirstGuesser ? 500 : 300)));
}

// ── Levenshtein distance ─────────────────────────────────────────────────────
// Used for "So close!" detection in submitGuess (distance ≤ 2 = close guess).

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[a.length][b.length];
}

async function fetchActiveGame(roomId: string) {
  const game = await prisma.skribblGame.findFirst({
    where: { roomId, phaseId: { not: "FINISHED" } },
    include: {
      rounds: {
        orderBy: { roundNumber: "desc" },
        take: 1,
        include: { guesses: true },
      },
      room: {
        include: {
          players: { where: { statusId: "CONNECTED" }, include: { user: true } },
          skribblConfig: true,
        },
      },
    },
  });
  return game;
}

async function allPlayersGuessed(
  roundId: string,
  roomId: string,
  drawerClerkId: string
): Promise<boolean> {
  const correctCount = await prisma.skribblGuess.count({
    where: { roundId, isCorrect: true },
  });
  const nonDrawerCount = await prisma.roomPlayer.count({
    where: {
      roomId,
      statusId: "CONNECTED",          // only count players still in the room
      user: { clerkId: { not: drawerClerkId } },
    },
  });
  // Guard: if everyone left, don't advance
  return nonDrawerCount > 0 && correctCount >= nonDrawerCount;
}

// ── Helper: build RoomPlayerDTO array from room players ───────────────────────

function buildPlayerDTOs(players: Array<{
  id: string; isHost: boolean; isBot: boolean; score: number; statusId: string;
  user: { id: string; clerkId: string; username: string; avatarUrl: string | null };
}>): RoomPlayerDTO[] {
  return players.map((p) => ({
    id: p.id,
    userId: p.user.id,
    clerkId: p.user.clerkId,
    username: p.user.username,
    avatarUrl: p.user.avatarUrl,
    isHost: p.isHost,
    isBot: p.isBot,
    score: p.score,
    status: p.statusId as "CONNECTED" | "DISCONNECTED" | "KICKED",
  }));
}

// ── Exported service functions ────────────────────────────────────────────────

export async function startGame(roomId: string, io: AppServer): Promise<void> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      players: { where: { statusId: "CONNECTED" }, include: { user: true } },
      skribblConfig: true,
    },
  });
  if (!room) throw new Error("ROOM_NOT_FOUND");
  if (room.players.length < 2) throw new Error("Need at least 2 players");

  // Shuffle players for drawing order (Fisher-Yates)
  const shuffled = [...room.players].sort(() => Math.random() - 0.5);
  const playerOrder = shuffled.map((p) => p.user.clerkId);

  const game = await prisma.skribblGame.create({
    data: {
      roomId,
      phaseId: "PICKING_WORD",
      currentRound: 1,
      playerOrder,
      currentDrawerIndex: 0,
      offeredWordIds: [],
    },
    include: {
      rounds: { orderBy: { roundNumber: "desc" }, take: 1, include: { guesses: true } },
      room: {
        include: {
          players: { where: { statusId: "CONNECTED" }, include: { user: true } },
          skribblConfig: true,
        },
      },
    },
  });

  if (room.skribblConfig?.withAI) {
    aiGameScores.set(roomId, { score: 0, correctGuesses: 0 });
  }

  await startPickingWordPhase(game, io);
}

export async function chooseWord(
  roomId: string,
  clerkId: string,
  wordIndex: number,
  io: AppServer
): Promise<void> {
  const game = await fetchActiveGame(roomId);
  if (!game || game.phaseId !== "PICKING_WORD") return;
  if (game.playerOrder[game.currentDrawerIndex] !== clerkId) return;

  clearPhaseTimer(game.id);
  const safeIndex = Math.max(0, Math.min(wordIndex, game.offeredWordIds.length - 1));
  await startDrawingPhase(game, game.offeredWordIds[safeIndex], io);
}

export async function submitGuess(
  roomId: string,
  clerkId: string,
  guessText: string,
  io: AppServer
): Promise<void> {
  const game = await fetchActiveGame(roomId);
  if (!game || game.phaseId !== "DRAWING") return;

  const currentRound = game.rounds[0];
  if (!currentRound) return;

  // Drawer cannot guess
  const drawerClerkId = game.playerOrder[game.currentDrawerIndex];
  if (drawerClerkId === clerkId) return;

  const player = game.room.players.find((p) => p.user.clerkId === clerkId);
  const username = player?.user.username ?? clerkId;
  const avatarUrl = player?.user.avatarUrl ?? null;

  // Set of clerkIds who have already guessed correctly this round
  const guessedSet = new Set(
    currentRound.guesses.filter((g) => g.isCorrect).map((g) => g.playerId)
  );

  // ── Post-correct chat: player already guessed, route only to guessers+drawer ──
  if (guessedSet.has(clerkId)) {
    const sanitized = sanitizeText(guessText, 50);
    if (!sanitized) return;
    const postDTO = {
      clerkId, username, avatarUrl,
      guess: sanitized,
      isCorrect: false, isClose: false, pointsAwarded: 0,
      guessedAt: new Date().toISOString(),
    };
    const allSockets = await io.in(roomId).fetchSockets();
    for (const s of allSockets) {
      if (guessedSet.has(s.data.userId) || s.data.userId === drawerClerkId) {
        s.emit("skribbl:guess_result", { guess: postDTO });
      }
    }
    return;
  }

  const sanitized = sanitizeText(guessText, 50);
  const isCorrect = sanitized.toLowerCase() === currentRound.word.toLowerCase();
  const isClose = !isCorrect && levenshtein(sanitized.toLowerCase(), currentRound.word.toLowerCase()) <= 2;

  let pointsEarned = 0;
  if (isCorrect) {
    const isFirstGuesser = guessedSet.size === 0;
    pointsEarned = calculatePoints(
      game.room.timePerRound - (Date.now() - currentRound.startedAt.getTime()) / 1000,
      game.room.timePerRound,
      isFirstGuesser
    );
    if (player) {
      await prisma.roomPlayer.update({
        where: { id: player.id },
        data: { score: { increment: pointsEarned } },
      });
    }
  }

  await prisma.skribblGuess.create({
    data: { roundId: currentRound.id, playerId: clerkId, content: sanitized, isCorrect, pointsEarned },
  });

  const guessDTO = {
    clerkId, username, avatarUrl,
    guess: sanitized,
    isCorrect, isClose,
    pointsAwarded: pointsEarned,
    guessedAt: new Date().toISOString(),
  };

  // ── Selective emit based on guess type ────────────────────────────────────
  if (isCorrect) {
    // Guessers + drawer see full DTO; non-guessers see stripped notification (no word)
    guessedSet.add(clerkId);
    const allSockets = await io.in(roomId).fetchSockets();
    for (const s of allSockets) {
      if (guessedSet.has(s.data.userId) || s.data.userId === drawerClerkId) {
        s.emit("skribbl:guess_result", { guess: guessDTO });
      } else {
        s.emit("skribbl:guess_result", { guess: { ...guessDTO, guess: null } });
      }
    }
  } else if (isClose) {
    // Only the guesser sees "so close!" — others learn nothing about the word
    const allSockets = await io.in(roomId).fetchSockets();
    allSockets.find((s) => s.data.userId === clerkId)
      ?.emit("skribbl:guess_result", { guess: guessDTO });
  } else {
    // Plain wrong guess — visible to all
    io.to(roomId).emit("skribbl:guess_result", { guess: guessDTO });
  }

  if (isCorrect && (await allPlayersGuessed(currentRound.id, roomId, drawerClerkId))) {
    await advanceRound(game, io);
  }
}

export async function advanceRound(game: Awaited<ReturnType<typeof fetchActiveGame>> & object, io: AppServer): Promise<void> {
  const currentRound = game!.rounds[0];
  if (!currentRound) return;

  clearPhaseTimer(game!.id);
  clearHintTimers(currentRound.id);

  const drawerClerkId = game!.playerOrder[game!.currentDrawerIndex];

  // Award drawer bonus: +50 per correct guess
  const correctGuesses = await prisma.skribblGuess.count({ where: { roundId: currentRound.id, isCorrect: true } });
  if (correctGuesses > 0) {
    const drawerPlayer = game!.room.players.find((p) => p.user.clerkId === drawerClerkId);
    if (drawerPlayer) {
      await prisma.roomPlayer.update({
        where: { id: drawerPlayer.id },
        data: { score: { increment: 50 * correctGuesses } },
      });
    }
  }

  // Fetch updated player scores
  const updatedPlayers = await prisma.roomPlayer.findMany({
    where: { roomId: game!.roomId, statusId: "CONNECTED" },
    include: { user: true },
  });

  const withAI: boolean = game!.room?.skribblConfig?.withAI ?? false;

  await prisma.skribblGame.update({ where: { id: game!.id }, data: { phaseId: "ROUND_END" } });

  const roundEndPayload: SkribblPhasePayload = {
    phase: "ROUND_END",
    round: {
      roundNumber: game!.currentRound,
      drawerClerkId,
      word: currentRound.word,
      hint: currentRound.hint ?? buildBlankHint(currentRound.word),
      wordLength: currentRound.word.length,
      category: null,
      imageUrl: null,
      timeLeft: 0,
    },
    players: buildPlayerDTOsWithAI(updatedPlayers, game!.roomId, withAI),
    words: null,
    timeLimit: ROUND_END_PAUSE_S,
    roundCount: game!.room.roundCount,
  };

  io.to(game!.roomId).emit("skribbl:phase_changed", roundEndPayload);

  // After pause, advance to next round or finish.
  // Tracked by setPhaseTimer to prevent double-fire if advanceRound is called twice.
  setPhaseTimer(game!.id, ROUND_END_PAUSE_S, async () => {
    const totalRounds = game!.room.roundCount * game!.playerOrder.length;
    if (game!.currentRound < totalRounds) {
      const nextDrawerIndex = (game!.currentDrawerIndex + 1) % game!.playerOrder.length;
      const updatedGame = await prisma.skribblGame.update({
        where: { id: game!.id },
        data: { currentRound: { increment: 1 }, currentDrawerIndex: nextDrawerIndex, phaseId: "PICKING_WORD" },
        include: {
          rounds: { orderBy: { roundNumber: "desc" }, take: 1, include: { guesses: true } },
          room: {
            include: {
              players: { where: { statusId: "CONNECTED" }, include: { user: true } },
              skribblConfig: true,
            },
          },
        },
      });
      await startPickingWordPhase(updatedGame, io);
    } else {
      await finishGame(game!, io);
    }
  });
}

// ── Internal phase functions ──────────────────────────────────────────────────

async function startPickingWordPhase(game: any, io: AppServer): Promise<void> {
  const drawerClerkId = game.playerOrder[game.currentDrawerIndex];

  // Fetch random words, filtered by wordCategories and language if set, excluding already-used words
  const usedIds: string[] = (game.usedWordIds as string[] | undefined) ?? [];
  const wordCategories: string[] = game.room?.skribblConfig?.wordCategories ?? [];
  const wordLanguage: string = game.room?.skribblConfig?.wordLanguage ?? "en";
  const categoryFilter = {
    language: wordLanguage,
    ...(wordCategories.length > 0 ? { category: { in: wordCategories } } : {}),
    ...(usedIds.length > 0 ? { id: { notIn: usedIds } } : {}),
  };

  const wordCount = await prisma.word.count({ where: categoryFilter });
  const skip = wordCount > WORD_CHOICE_COUNT ? Math.floor(Math.random() * (wordCount - WORD_CHOICE_COUNT)) : 0;
  const words = await prisma.word.findMany({ where: categoryFilter, skip, take: WORD_CHOICE_COUNT });

  // Also include custom words if set
  const customWordTexts: string[] = game.room?.skribblConfig?.customWords ?? [];
  let offeredWords = words;
  if (customWordTexts.length > 0 && words.length < WORD_CHOICE_COUNT) {
    // supplement with custom words if DB word bank is short
    const needed = WORD_CHOICE_COUNT - words.length;
    const customSample = customWordTexts.sort(() => Math.random() - 0.5).slice(0, needed);
    // Create synthetic word objects (not persisted)
    offeredWords = [
      ...words,
      ...customSample.map((text, i) => ({ id: `custom_${i}`, text, category: "custom", difficultyId: "MEDIUM" })),
    ] as typeof words;
  }

  // Fallback: if fewer than WORD_CHOICE_COUNT words found, pad with hardcoded words
  // Encode the text in the ID ("fallback_N:text") so resolveWordText can retrieve it without a DB lookup
  if (offeredWords.length < WORD_CHOICE_COUNT) {
    const fallbackPool = ["cat", "house", "tree", "fish", "sun", "moon", "car", "book", "door", "star"];
    const alreadyHave = new Set(offeredWords.map((w) => w.text));
    const available = fallbackPool.filter((t) => !alreadyHave.has(t));
    const needed = WORD_CHOICE_COUNT - offeredWords.length;
    const extras = available.slice(0, needed).map((text, i) => ({
      id: `fallback_${offeredWords.length + i}:${text}`,
      text,
      category: "misc",
      difficultyId: "EASY",
    }));
    offeredWords = [...offeredWords, ...extras] as typeof words;
  }

  // Store offered word IDs for validation + append to usedWordIds to prevent future repetition.
  // Build the full array explicitly — Neon adapter doesn't support Prisma's { push: [] } syntax.
  const currentUsedIds: string[] = (game.usedWordIds as string[] | undefined) ?? [];
  const newUsedIds = [...currentUsedIds, ...offeredWords.map((w) => w.id)];

  await prisma.skribblGame.update({
    where: { id: game.id },
    data: {
      offeredWordIds: offeredWords.map((w) => w.id),
      usedWordIds: newUsedIds,
    },
  });

  const updatedPlayers = await prisma.roomPlayer.findMany({
    where: { roomId: game.roomId, statusId: "CONNECTED" },
    include: { user: true },
  });

  const withAI: boolean = game.room?.skribblConfig?.withAI ?? false;

  const roundDTO: SkribblRoundDTO = {
    roundNumber: game.currentRound,
    drawerClerkId,
    word: null,
    hint: "",
    wordLength: 0,
    category: null,
    imageUrl: null,
    timeLeft: PICKING_WORD_TIME_LIMIT_S,
  };

  const drawerPayload: SkribblPhasePayload = {
    phase: "PICKING_WORD",
    round: roundDTO,
    players: buildPlayerDTOsWithAI(updatedPlayers, game.roomId, withAI),
    words: offeredWords.map((w) => w.text),
    timeLimit: PICKING_WORD_TIME_LIMIT_S,
    roundCount: game.room.roundCount,
  };

  const guesserPayload: SkribblPhasePayload = {
    ...drawerPayload,
    words: null,
  };

  // Emit to drawer specifically, then to everyone else
  io.sockets.sockets.forEach((s) => {
    if (s.data.userId === drawerClerkId) {
      s.emit("skribbl:phase_changed", drawerPayload);
    }
  });
  // Broadcast guesser payload to room (drawer will just get overwritten but that's fine
  // since socket.io delivers last; alternatively use to(roomId) excluding drawer)
  // Use targeted approach: emit to all in room except drawer
  const allInRoom = await io.in(game.roomId).fetchSockets();

  for (const s of allInRoom) {
    if (s.data.userId === drawerClerkId) {
      s.emit("skribbl:phase_changed", drawerPayload);
    } else {
      s.emit("skribbl:phase_changed", guesserPayload);
    }
  }

  setPhaseTimer(game.id, PICKING_WORD_TIME_LIMIT_S, () => autoSelectWord(game, io));
}

async function autoSelectWord(game: any, io: AppServer): Promise<void> {
  const fresh = await prisma.skribblGame.findUnique({
    where: { id: game.id },
    include: {
      rounds: { orderBy: { roundNumber: "desc" }, take: 1, include: { guesses: true } },
      room: {
        include: {
          players: { where: { statusId: "CONNECTED" }, include: { user: true } },
          skribblConfig: true,
        },
      },
    },
  });
  if (!fresh || fresh.phaseId !== "PICKING_WORD") return;
  const ids = fresh.offeredWordIds;
  if (ids.length === 0) return;
  const wordId = ids[Math.floor(Math.random() * ids.length)];
  await startDrawingPhase(fresh, wordId, io);
}

async function startDrawingPhase(game: any, wordId: string, io: AppServer): Promise<void> {
  const resolved = await resolveWordText(wordId, game.roomId);
  if (!resolved) return;
  const wordText = resolved;

  const hint = buildBlankHint(wordText);
  const drawerClerkId = game.playerOrder[game.currentDrawerIndex];
  const timePerRound = game.room?.timePerRound ?? 60;

  const round = await prisma.skribblRound.create({
    data: {
      skribblGameId: game.id,
      roundNumber: game.currentRound,
      drawerId: drawerClerkId,
      word: wordText,
      hint,
    },
  });

  await prisma.skribblGame.update({ where: { id: game.id }, data: { phaseId: "DRAWING" } });

  const updatedPlayers = await prisma.roomPlayer.findMany({
    where: { roomId: game.roomId, statusId: "CONNECTED" },
    include: { user: true },
  });

  const withAI: boolean = game.room?.skribblConfig?.withAI ?? false;

  const baseRoundDTO: SkribblRoundDTO = {
    roundNumber: game.currentRound,
    drawerClerkId,
    word: null,
    hint,
    wordLength: wordText.length,
    category: null,
    imageUrl: null,
    timeLeft: timePerRound,
  };

  const drawerPayload: SkribblPhasePayload = {
    phase: "DRAWING",
    round: { ...baseRoundDTO, word: wordText },
    players: buildPlayerDTOsWithAI(updatedPlayers, game.roomId, withAI),
    words: null,
    timeLimit: timePerRound,
    roundCount: game.room.roundCount,
  };

  const guesserPayload: SkribblPhasePayload = {
    phase: "DRAWING",
    round: baseRoundDTO,
    players: buildPlayerDTOsWithAI(updatedPlayers, game.roomId, withAI),
    words: null,
    timeLimit: timePerRound,
    roundCount: game.room.roundCount,
  };

  io.sockets.sockets.forEach((s) => {
    if (s.data.userId === drawerClerkId) {
      s.emit("skribbl:phase_changed", drawerPayload);
    }
  });
  const allInRoom = await io.in(game.roomId).fetchSockets();

  for (const s of allInRoom) {
    if (s.data.userId === drawerClerkId) {
      s.emit("skribbl:phase_changed", drawerPayload);
    } else {
      s.emit("skribbl:phase_changed", guesserPayload);
    }
  }

  // Schedule hint reveals + AI snapshot requests
  const handles = HINT_REVEAL_THRESHOLDS.map((t) => {
    const hintTimer = setTimeout(
      () => revealHintLetter(round.id, game.roomId, io).catch(console.error),
      t * timePerRound * 1000
    );
    if (withAI) {
      const snapshotTimer = setTimeout(() => {
        io.to(game.roomId).emit("skribbl:request_canvas_snapshot", {
          roomId: game.roomId,
          drawerClerkId,
        });
      }, t * timePerRound * 1000);
      return [hintTimer, snapshotTimer];
    }
    return [hintTimer];
  });
  hintTimers.set(round.id, handles.flat());

  // Re-fetch game with new round for advanceRound reference
  const gameWithRound = await fetchActiveGame(game.roomId);
  setPhaseTimer(game.id, timePerRound, () => advanceRound(gameWithRound!, io));
}

async function revealHintLetter(roundId: string, roomId: string, io: AppServer): Promise<void> {
  const round = await prisma.skribblRound.findUnique({ where: { id: roundId } });
  if (!round) return;
  const newHint = revealOneLetter(round.word, round.hint ?? buildBlankHint(round.word));
  await prisma.skribblRound.update({ where: { id: roundId }, data: { hint: newHint } });
  io.to(roomId).emit("skribbl:hint_updated", { hint: newHint });
}

async function finishGame(game: any, io: AppServer): Promise<void> {
  const result = await buildResults(game.id);

  await prisma.skribblGame.update({ where: { id: game.id }, data: { phaseId: "FINISHED", endedAt: new Date() } });
  await prisma.room.update({ where: { id: game.roomId }, data: { statusId: "FINISHED", endedAt: new Date() } });

  aiGameScores.delete(game.roomId);
  aiService.clearRoom(game.roomId);

  // Update SkribblStats per player — find first to correctly preserve bestScore
  for (const pr of result.results) {
    if (pr.clerkId.startsWith("guest_") || pr.clerkId === "__ai_bot__") continue;
    const user = await prisma.user.findUnique({ where: { clerkId: pr.clerkId }, select: { id: true } });
    if (!user) continue;
    const existing = await prisma.skribblStats.findUnique({ where: { userId: user.id } });
    if (existing) {
      await prisma.skribblStats.update({
        where: { userId: user.id },
        data: {
          gamesPlayed: { increment: 1 },
          totalScore: { increment: pr.totalScore },
          totalCorrect: { increment: pr.correctGuesses },
          totalDrawn: { increment: pr.timesDrawn },
          bestScore: { set: Math.max(existing.bestScore, pr.totalScore) },
          wins: pr.rank === 1 ? { increment: 1 } : undefined,
        },
      });
    } else {
      await prisma.skribblStats.create({
        data: {
          userId: user.id,
          gamesPlayed: 1,
          totalScore: pr.totalScore,
          totalCorrect: pr.correctGuesses,
          totalDrawn: pr.timesDrawn,
          bestScore: pr.totalScore,
          wins: pr.rank === 1 ? 1 : 0,
        },
      });
    }
  }

  io.to(game.roomId).emit("skribbl:game_ended", { roomId: game.roomId, result });
}

async function buildResults(gameId: string): Promise<SkribblResultDTO> {
  const rounds = await prisma.skribblRound.findMany({
    where: { skribblGameId: gameId },
    orderBy: { roundNumber: "asc" },
    include: { guesses: true },
  });

  // Aggregate per player
  const stats = new Map<string, { totalScore: number; correctGuesses: number; timesDrawn: number; username: string; avatarUrl: string | null }>();

  // Get players from the room via the game
  const game = await prisma.skribblGame.findUnique({
    where: { id: gameId },
    include: { room: { include: { players: { include: { user: true } }, skribblConfig: true } } },
  });

  for (const p of game?.room.players ?? []) {
    stats.set(p.user.clerkId, { totalScore: p.score, correctGuesses: 0, timesDrawn: 0, username: p.user.username, avatarUrl: p.user.avatarUrl });
  }

  // Inject AI player if enabled
  if (game?.room?.skribblConfig?.withAI) {
    const aiState = aiGameScores.get(game!.roomId) ?? { score: 0, correctGuesses: 0 };
    stats.set("__ai_bot__", {
      totalScore: aiState.score,
      correctGuesses: aiState.correctGuesses,
      timesDrawn: 0,
      username: "DrawBot",
      avatarUrl: null,
    });
  }

  for (const round of rounds) {
    const entry = stats.get(round.drawerId);
    if (entry) entry.timesDrawn++;
    for (const guess of round.guesses) {
      const gEntry = stats.get(guess.playerId);
      if (gEntry && guess.isCorrect) gEntry.correctGuesses++;
    }
  }

  // Sort by score desc, assign ranks
  const sorted = Array.from(stats.entries()).sort((a, b) => b[1].totalScore - a[1].totalScore);
  let rank = 1;
  const playerResults: SkribblPlayerResultDTO[] = sorted.map(([clerkId, s], i) => {
    if (i > 0 && s.totalScore < sorted[i - 1][1].totalScore) rank = i + 1;
    return { clerkId, username: s.username, avatarUrl: s.avatarUrl, rank, totalScore: s.totalScore, correctGuesses: s.correctGuesses, timesDrawn: s.timesDrawn };
  });

  // Build a clerkId → username map for drawerUsername lookup
  const usernameMap = new Map<string, string>();
  for (const [clerkId, s] of stats.entries()) {
    usernameMap.set(clerkId, s.username);
  }

  return {
    results: playerResults,
    totalRounds: rounds.length,
    winnerClerkId: playerResults[0]?.clerkId ?? null,
    rounds: rounds.map((r) => ({
      roundNumber: r.roundNumber,
      drawerClerkId: r.drawerId,
      drawerUsername: usernameMap.get(r.drawerId) ?? r.drawerId,
      word: r.word,
      imageUrl: r.drawingUrl ?? null,
      correctGuessCount: r.guesses.filter((g) => g.isCorrect).length,
    })),
  };
}

// ── AI guess submission ───────────────────────────────────────────────────────
// Called from skribblHandlers when a canvas snapshot is received.
// Processes the AI's guess, updates in-memory AI score, broadcasts to room.

export async function submitAiGuess(roomId: string, guessText: string, io: AppServer): Promise<void> {
  const game = await fetchActiveGame(roomId);
  if (!game || game.phaseId !== "DRAWING") return;

  const currentRound = game.rounds[0];
  if (!currentRound) return;

  const sanitized = sanitizeText(guessText, 50);
  if (!sanitized) return;

  const isCorrect = sanitized.toLowerCase() === currentRound.word.toLowerCase();
  const isClose = !isCorrect && levenshtein(sanitized.toLowerCase(), currentRound.word.toLowerCase()) <= 2;

  let pointsEarned = 0;
  const guessedSet = new Set(
    currentRound.guesses.filter((g) => g.isCorrect).map((g) => g.playerId)
  );

  if (isCorrect) {
    const isFirstGuesser = guessedSet.size === 0;
    const timeLeft = game.room.timePerRound - (Date.now() - currentRound.startedAt.getTime()) / 1000;
    pointsEarned = calculatePoints(timeLeft, game.room.timePerRound, isFirstGuesser);

    const existing = aiGameScores.get(roomId) ?? { score: 0, correctGuesses: 0 };
    aiGameScores.set(roomId, {
      score: existing.score + pointsEarned,
      correctGuesses: existing.correctGuesses + 1,
    });
    aiService.markCorrect(roomId, game.currentRound);
  }

  const drawerClerkId = game.playerOrder[game.currentDrawerIndex];

  const guessDTO = {
    clerkId: "__ai_bot__",
    username: "DrawBot",
    avatarUrl: null as string | null,
    guess: sanitized,
    isCorrect,
    isClose,
    pointsAwarded: pointsEarned,
    guessedAt: new Date().toISOString(),
    isAI: true,
  };

  if (isCorrect) {
    guessedSet.add("__ai_bot__");
    const allSockets = await io.in(roomId).fetchSockets();
    for (const s of allSockets) {
      if (guessedSet.has(s.data.userId) || s.data.userId === drawerClerkId) {
        s.emit("skribbl:guess_result", { guess: guessDTO });
      } else {
        s.emit("skribbl:guess_result", { guess: { ...guessDTO, guess: null } });
      }
    }
  } else if (isClose) {
    // AI close guess — only guessers+drawer see it (no leakage to non-guessers)
    const allSockets = await io.in(roomId).fetchSockets();
    for (const s of allSockets) {
      if (guessedSet.has(s.data.userId) || s.data.userId === drawerClerkId) {
        s.emit("skribbl:guess_result", { guess: guessDTO });
      }
    }
  } else {
    io.to(roomId).emit("skribbl:guess_result", { guess: guessDTO });
  }
}

// ── Exported helper for socket disconnect handler ────────────────────────────

export async function fetchActiveGameForRoom(roomId: string) {
  return fetchActiveGame(roomId);
}

// ── Re-sync: emit current phase to a single reconnecting socket ───────────────
// Called from roomHandlers when a player joins a room that is already PLAYING.
// Mirrors garticPhoneService.emitCurrentPhaseToSocket for the Skribbl game.

export async function emitCurrentPhaseToSocket(
  socket: { emit: (event: string, data: unknown) => void; data: { userId: string } },
  roomId: string
): Promise<void> {
  const userId = socket.data.userId;

  const game = await prisma.skribblGame.findFirst({
    where: { roomId, phaseId: { notIn: ["WAITING", "FINISHED"] } },
    include: {
      rounds: { orderBy: { roundNumber: "desc" }, take: 1 },
      room: {
        include: {
          players: { where: { statusId: "CONNECTED" }, include: { user: true } },
          skribblConfig: true,
        },
      },
    },
  });

  if (!game) return;

  const phase = game.phaseId as "PICKING_WORD" | "DRAWING" | "ROUND_END";
  const currentRound = game.rounds[0] ?? null;
  const drawerClerkId = game.playerOrder[game.currentDrawerIndex] ?? "";
  const isDrawer = userId === drawerClerkId;
  const withAI: boolean = game.room?.skribblConfig?.withAI ?? false;
  const players = buildPlayerDTOsWithAI(game.room.players, game.roomId, withAI);

  if (phase === "PICKING_WORD") {
    let wordTexts: string[] | null = null;
    if (isDrawer && game.offeredWordIds.length > 0) {
      const resolved = await Promise.all(game.offeredWordIds.map((id: string) => resolveWordText(id, roomId)));
      wordTexts = resolved.filter((t): t is string => t !== null);
    }

    socket.emit("skribbl:phase_changed", {
      phase: "PICKING_WORD",
      round: {
        roundNumber: game.currentRound,
        drawerClerkId,
        word: null,
        hint: currentRound ? buildBlankHint(currentRound.word) : "",
        wordLength: currentRound?.word.length ?? 0,
        category: null,
        imageUrl: null,
        timeLeft: PICKING_WORD_TIME_LIMIT_S,
      },
      players,
      words: wordTexts,
      timeLimit: PICKING_WORD_TIME_LIMIT_S,
      roundCount: game.room.roundCount,
    } satisfies SkribblPhasePayload);
    return;
  }

  if (!currentRound) return;

  if (phase === "DRAWING") {
    const timePerRound = game.room.timePerRound ?? 60;
    const elapsed = (Date.now() - currentRound.startedAt.getTime()) / 1000;
    const timeLeft = Math.max(0, Math.round(timePerRound - elapsed));

    socket.emit("skribbl:phase_changed", {
      phase: "DRAWING",
      round: {
        roundNumber: currentRound.roundNumber,
        drawerClerkId,
        word: isDrawer ? currentRound.word : null,
        hint: currentRound.hint ?? buildBlankHint(currentRound.word),
        wordLength: currentRound.word.length,
        category: null,
        imageUrl: null,
        timeLeft,
      },
      players,
      words: null,
      timeLimit: timePerRound,
      roundCount: game.room.roundCount,
    } satisfies SkribblPhasePayload);
    return;
  }

  // ROUND_END
  socket.emit("skribbl:phase_changed", {
    phase: "ROUND_END",
    round: {
      roundNumber: currentRound.roundNumber,
      drawerClerkId,
      word: currentRound.word,
      hint: currentRound.hint ?? buildBlankHint(currentRound.word),
      wordLength: currentRound.word.length,
      category: null,
      imageUrl: currentRound.drawingUrl ?? null,
      timeLeft: 0,
    },
    players,
    words: null,
    timeLimit: ROUND_END_PAUSE_S,
    roundCount: game.room.roundCount,
  } satisfies SkribblPhasePayload);
}
