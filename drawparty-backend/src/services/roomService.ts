import { prisma } from "../config/prisma";
import { generateRoomCode } from "../utils/roomCode";
import type {
  RoomDTO,
  RoomPlayerDTO,
  CreateRoomParams,
  JoinRoomParams,
  UpdateSettingsParams,
  GameMode,
  RoomStatus,
  RoomPlayerStatus,
} from "../types/game";

const roomInclude = {
  players: {
    include: { user: true },
  },
  skribblConfig: true,
  garticAIConfig: true,
} as const;

type PrismaRoom = Awaited<ReturnType<typeof fetchRoomById>>;
type PrismaPlayer = PrismaRoom["players"][number];

async function fetchRoomById(id: string) {
  const room = await prisma.room.findUnique({
    where: { id },
    include: roomInclude,
  });
  if (!room) throw new Error("ROOM_NOT_FOUND");
  return room;
}

export async function createRoom(params: CreateRoomParams): Promise<RoomDTO> {
  const isGuest = params.hostClerkId.startsWith("guest_");
  const derivedUsername = params.guestName
    ? `${params.guestName}#${params.hostClerkId.slice(-4)}`
    : `Guest_${params.hostClerkId.slice(-12)}`;

  const host = await prisma.user.upsert({
    where: { clerkId: params.hostClerkId },
    update: isGuest ? { username: derivedUsername } : {},
    create: {
      clerkId: params.hostClerkId,
      username: isGuest ? derivedUsername : `player_${params.hostClerkId.slice(-6)}`,
      email: `${params.hostClerkId}@drawparty.local`,
      skribblStats: { create: {} },
      garticStats: { create: {} },
    },
  });

  let code: string;
  let attempts = 0;
  do {
    code = generateRoomCode();
    const existing = await prisma.room.findUnique({ where: { code } });
    if (!existing) break;
    attempts++;
  } while (attempts < 5);

  const room = await prisma.room.create({
    data: {
      code,
      gameModeId: params.gameMode,
      // statusId omitted — DB default is "WAITING"
      hostId: params.hostClerkId,
      maxPlayers: params.maxPlayers ?? 8,
      roundCount: params.roundCount ?? 3,
      timePerRound: params.timePerRound ?? 60,
      players: {
        create: {
          userId: host.id,
          isHost: true,
          statusId: "CONNECTED",
        },
      },
      skribblConfig: { create: { wordCategories: [], customWords: [] } },
      garticAIConfig: { create: {} },
    },
    include: roomInclude,
  });

  return mapRoomToDTO(room);
}

export async function getRoomByCode(code: string, _clerkId: string): Promise<RoomDTO> {
  const room = await prisma.room.findUnique({
    where: { code },
    include: roomInclude,
  });
  if (!room) throw new Error("ROOM_NOT_FOUND");
  return mapRoomToDTO(room);
}

export async function getRoomById(roomId: string): Promise<RoomDTO> {
  const room = await fetchRoomById(roomId);
  return mapRoomToDTO(room);
}

export async function joinRoom(params: JoinRoomParams): Promise<RoomDTO> {
  const room = await prisma.room.findUnique({
    where: { code: params.code },
    include: roomInclude,
  });
  if (!room) throw new Error("ROOM_NOT_FOUND");

  if (room.statusId !== "WAITING") throw new Error("ROOM_NOT_WAITING");

  const connectedPlayers = room.players.filter(
    (p) => p.statusId !== "KICKED"
  );
  if (connectedPlayers.length >= room.maxPlayers) throw new Error("ROOM_FULL");

  const isGuestUser = params.clerkId.startsWith("guest_");
  const derivedJoinUsername = params.guestName
    ? `${params.guestName}#${params.clerkId.slice(-4)}`
    : `Guest_${params.clerkId.slice(-12)}`;

  const user = await prisma.user.upsert({
    where: { clerkId: params.clerkId },
    update: isGuestUser ? { username: derivedJoinUsername } : {},
    create: {
      clerkId: params.clerkId,
      username: isGuestUser ? derivedJoinUsername : `player_${params.clerkId.slice(-6)}`,
      email: `${params.clerkId}@drawparty.local`,
      skribblStats: { create: {} },
      garticStats: { create: {} },
    },
  });

  const existingPlayer = room.players.find((p) => p.userId === user.id);
  if (existingPlayer) {
    if (existingPlayer.statusId === "KICKED") throw new Error("ROOM_KICKED");
    return mapRoomToDTO(room);
  }

  try {
    await prisma.roomPlayer.create({
      data: {
        roomId: room.id,
        userId: user.id,
        isHost: false,
        statusId: "CONNECTED",
      },
    });
  } catch (err: unknown) {
    // P2002 = unique constraint — concurrent request already inserted this player
    if ((err as { code?: string }).code === "P2002") {
      const updatedRoom = await fetchRoomById(room.id);
      return mapRoomToDTO(updatedRoom);
    }
    throw err;
  }

  const updatedRoom = await fetchRoomById(room.id);
  return mapRoomToDTO(updatedRoom);
}

export async function updateSettings(params: UpdateSettingsParams): Promise<void> {
  const room = await prisma.room.findUnique({
    where: { id: params.roomId },
    select: { hostId: true },
  });
  if (!room) throw new Error("ROOM_NOT_FOUND");

  if (room.hostId !== params.hostClerkId) throw new Error("UNAUTHORIZED");

  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
  const roundCount   = params.settings.roundCount   !== undefined ? clamp(params.settings.roundCount,   1,   10)  : undefined;
  const timePerRound = params.settings.timePerRound !== undefined ? clamp(params.settings.timePerRound, 30,  120) : undefined;
  const maxPlayers   = params.settings.maxPlayers   !== undefined ? clamp(params.settings.maxPlayers,   2,   16)  : undefined;

  const hasRoomChanges = roundCount !== undefined || timePerRound !== undefined || maxPlayers !== undefined;
  if (hasRoomChanges) {
    await prisma.room.update({
      where: { id: params.roomId },
      data: {
        ...(roundCount   !== undefined && { roundCount }),
        ...(timePerRound !== undefined && { timePerRound }),
        ...(maxPlayers   !== undefined && { maxPlayers }),
      },
    });
  }

  const wordCategories = params.settings.wordCategories;
  const customWords = params.settings.customWords !== undefined
    ? [...new Set(params.settings.customWords.map((w) => w.trim().slice(0, 50)).filter(Boolean))].slice(0, 200)
    : undefined;
  const withAI = params.settings.withAI;
  const wordLanguage = (params.settings as any).wordLanguage;

  const skribblChanges: Record<string, unknown> = {};
  if (wordCategories !== undefined) skribblChanges.wordCategories = wordCategories;
  if (customWords    !== undefined) skribblChanges.customWords    = customWords;
  if (withAI         !== undefined) skribblChanges.withAI         = withAI;
  if (wordLanguage   !== undefined && ["en", "fr", "de"].includes(wordLanguage)) {
    skribblChanges.wordLanguage = wordLanguage;
  }

  if (Object.keys(skribblChanges).length > 0) {
    await prisma.roomSkribblConfig.upsert({
      where:  { roomId: params.roomId },
      update: skribblChanges,
      create: { roomId: params.roomId, wordCategories: [], customWords: [], ...skribblChanges },
    });
  }

  const aiJudgeMode      = params.settings.aiJudgeMode;
  const aiDrawTime       = (params.settings as any).aiDrawTime;
  const aiDrawTimePerTurn = (params.settings as any).aiDrawTimePerTurn;
  const aiDrawMode       = (params.settings as any).aiDrawMode;
  const aiLives          = (params.settings as any).aiLives;
  const aiWordCategory   = (params.settings as any).aiWordCategory;
  const aiHintLetters    = (params.settings as any).aiHintLetters;

  const garticAIChanges: Record<string, unknown> = {};
  if (aiJudgeMode      !== undefined) garticAIChanges.aiJudgeMode      = aiJudgeMode;
  if (aiDrawTime       !== undefined) garticAIChanges.aiDrawTime        = aiDrawTime;
  if (aiDrawTimePerTurn !== undefined) garticAIChanges.aiDrawTimePerTurn = aiDrawTimePerTurn;
  if (aiDrawMode       !== undefined) garticAIChanges.aiDrawModeId      = aiDrawMode;
  if (aiLives          !== undefined) garticAIChanges.aiLives           = aiLives;
  if (aiWordCategory   !== undefined) garticAIChanges.aiWordCategory    = aiWordCategory;
  if (aiHintLetters    !== undefined) garticAIChanges.aiHintLetters     = aiHintLetters;

  if (Object.keys(garticAIChanges).length > 0) {
    await prisma.roomGarticAIConfig.upsert({
      where:  { roomId: params.roomId },
      update: garticAIChanges,
      create: { roomId: params.roomId, ...garticAIChanges },
    });
  }
}

export function mapRoomToDTO(room: PrismaRoom): RoomDTO {
  const s = room.skribblConfig;
  const g = room.garticAIConfig;
  return {
    id: room.id,
    code: room.code,
    gameMode: room.gameModeId as GameMode,
    status: room.statusId as RoomStatus,
    hostId: room.hostId,
    maxPlayers: room.maxPlayers,
    settings: {
      roundCount:       room.roundCount,
      timePerRound:     room.timePerRound,
      maxPlayers:       room.maxPlayers,
      wordCategories:   s?.wordCategories   ?? [],
      customWords:      s?.customWords      ?? [],
      withAI:           s?.withAI           ?? false,
      wordLanguage:     s?.wordLanguage     ?? "en",
      aiJudgeMode:      g?.aiJudgeMode      ?? false,
      aiDrawTime:       g?.aiDrawTime       ?? 20,
      aiDrawTimePerTurn: g?.aiDrawTimePerTurn ?? 20,
      aiDrawMode:       (g?.aiDrawModeId as "turn" | "shared") ?? "turn",
      aiLives:          g?.aiLives          ?? 3,
      aiWordCategory:   g?.aiWordCategory   ?? "",
      aiHintLetters:    g?.aiHintLetters    ?? 0,
    },
    players: room.players.map(mapPlayerToDTO),
    createdAt: room.createdAt.toISOString(),
  };
}

export function mapPlayerToDTO(player: PrismaPlayer): RoomPlayerDTO {
  return {
    id: player.id,
    userId: player.user.id,
    clerkId: player.user.clerkId,
    username: player.user.username,
    avatarUrl: player.user.avatarUrl,
    isHost: player.isHost,
    isBot: player.isBot,
    score: player.score,
    status: player.statusId as RoomPlayerStatus,
  };
}

export type { GameMode, RoomStatus, RoomPlayerStatus };
