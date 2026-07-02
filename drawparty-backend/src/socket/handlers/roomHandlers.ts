import type { Socket } from "socket.io";
import type { AppServer } from "../index";
import { broadcastStatusToFriends, setUserStatus } from "../index";
import { prisma } from "../../config/prisma";
import * as roomService from "../../services/roomService";
import * as garticService from "../../services/garticPhoneService";
import * as skribblService from "../../services/skribblService";
import * as garticAIService from "../../services/garticAIService";
import { generateRoomCode } from "../../utils/roomCode";
import { randomUUID } from "crypto";

export function registerRoomHandlers(io: AppServer, socket: Socket): void {
  socket.on("room:join", async ({ roomId }: { roomId: string }) => {
    try {
      const userId = socket.data.userId;

      const roomDTO = await roomService.getRoomById(roomId);

      const isPlayer = roomDTO.players.some((p) => p.clerkId === userId);
      if (!isPlayer) {
        socket.emit("error" as any, { message: "Not a member of this room" });
        return;
      }

      socket.join(roomId);
      socket.data.roomId = roomId;

      await prisma.roomPlayer.updateMany({
        where: {
          userId: { equals: (await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } }))?.id },
          roomId,
          statusId: { not: "KICKED" },
        },
        data: { statusId: "CONNECTED" },
      });

      socket.emit("room:joined", roomDTO);

      // Re-send current phase on reconnect (fixes "stuck on waiting" when socket reconnects after room:game_started)
      if (roomDTO.status === "PLAYING") {
        if (roomDTO.gameMode === "SKRIBBL") {
          await skribblService.emitCurrentPhaseToSocket(socket as any, roomId);
        } else if (roomDTO.settings.aiJudgeMode) {
          await garticAIService.emitCurrentStateToSocket(socket as any, roomId);
        } else {
          await garticService.emitCurrentPhaseToSocket(socket as any, roomId);
        }
      }

      const playerDTO = roomDTO.players.find((p) => p.clerkId === userId);
      if (playerDTO) {
        socket.to(roomId).emit("room:player_joined", playerDTO);
      }
    } catch (err) {
      console.error("[room:join] Error:", err);
      socket.emit("error" as any, { message: "Failed to join room" });
    }
  });

  socket.on("room:leave", async ({ roomId }: { roomId: string }) => {
    try {
      const userId = socket.data.userId;

      socket.leave(roomId);
      socket.data.roomId = undefined;

      setUserStatus(userId, "online");
      broadcastStatusToFriends(userId, "online").catch(console.error);

      const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { id: true },
      });
      if (!user) return;

      // Hard delete on explicit leave (disconnect uses soft delete / grace period)
      await prisma.roomPlayer.deleteMany({
        where: { userId: user.id, roomId },
      });

      const remaining = await prisma.roomPlayer.findMany({
        where: { roomId, statusId: { not: "KICKED" } },
        orderBy: { joinedAt: "asc" },
      });

      if (remaining.length === 0) {
        await prisma.room.update({
          where: { id: roomId },
          data: { statusId: "FINISHED" },
        });
      } else {
        const room = await prisma.room.findUnique({
          where: { id: roomId },
          select: { hostId: true },
        });
        if (room?.hostId === userId) {
          const newHostPlayer = remaining[0];
          const newHostUser = await prisma.user.findUnique({
            where: { id: newHostPlayer.userId },
            select: { clerkId: true },
          });
          if (newHostUser) {
            await Promise.all([
              prisma.room.update({
                where: { id: roomId },
                data: { hostId: newHostUser.clerkId },
              }),
              prisma.roomPlayer.updateMany({
                where: { id: newHostPlayer.id },
                data: { isHost: true },
              }),
            ]);
          }
        }
      }

      socket.to(roomId).emit("room:player_left", { playerId: userId });
    } catch (err) {
      console.error("[room:leave] Error:", err);
    }
  });

  socket.on("room:update_settings", async (partial: { roundCount?: number; timePerRound?: number; maxPlayers?: number; wordCategories?: string[]; customWords?: string[]; withAI?: boolean; wordLanguage?: string; aiJudgeMode?: boolean; aiDrawTime?: number; aiDrawTimePerTurn?: number; aiDrawMode?: "turn" | "shared"; aiLives?: number; aiWordCategory?: string }) => {
    try {
      const roomId = socket.data.roomId;
      if (!roomId) return;

      await roomService.updateSettings({
        roomId,
        hostClerkId: socket.data.userId,
        settings: partial,
      });

      io.to(roomId).emit("room:settings_updated", partial);
    } catch (err: any) {
      console.error("[room:update_settings] Error:", err);
      if (err.message === "UNAUTHORIZED") {
        socket.emit("error" as any, { message: "Only the host can update settings" });
      }
    }
  });

  socket.on("room:kick_player", async ({ targetId }: { targetId: string }) => {
    try {
      const roomId = socket.data.roomId;
      if (!roomId) return;

      const userId = socket.data.userId;

      const room = await prisma.room.findUnique({
        where: { id: roomId },
        select: { hostId: true },
      });
      if (!room || room.hostId !== userId) {
        socket.emit("error" as any, { message: "Only the host can kick players" });
        return;
      }

      if (targetId === userId) {
        socket.emit("error" as any, { message: "Cannot kick yourself" });
        return;
      }

      await prisma.roomPlayer.updateMany({
        where: { roomId, user: { clerkId: targetId } },
        data: { statusId: "KICKED" },
      });

      io.to(roomId).emit("room:player_kicked", { playerId: targetId });

      const allSockets = await io.in(roomId).fetchSockets();
      for (const s of allSockets) {
        if (s.data.userId === targetId) {
          s.leave(roomId);
          break;
        }
      }
    } catch (err) {
      console.error("[room:kick_player] Error:", err);
    }
  });

  socket.on("room:start_game", async () => {
    try {
      const roomId = socket.data.roomId;
      if (!roomId) return;

      const userId = socket.data.userId;

      const room = await prisma.room.findUnique({
        where: { id: roomId },
        include: {
          players: {
            where: { statusId: "CONNECTED" },
            include: { user: { select: { clerkId: true } } },
          },
          garticAIConfig: true,
        },
      });
      if (!room || room.hostId !== userId) {
        socket.emit("error" as any, { message: "Only the host can start the game" });
        return;
      }

      if (room.players.length < 2) {
        socket.emit("error" as any, { message: "Need at least 2 players to start" });
        return;
      }

      await prisma.room.update({
        where: { id: roomId },
        data: { statusId: "PLAYING", startedAt: new Date() },
      });

      io.to(roomId).emit("room:game_started", { roomId });

      for (const player of room.players) {
        setUserStatus(player.user.clerkId, "in-game");
        broadcastStatusToFriends(player.user.clerkId, "in-game").catch(console.error);
      }

      // Delay so clients have time to navigate to the play page and register socket
      // listeners before the first phase broadcast. emitCurrentPhaseToSocket (called
      // on room:join) handles clients that take longer than 1.5s.
      setTimeout(() => {
        if (room.gameModeId === "SKRIBBL") {
          skribblService.startGame(roomId, io).catch((err) => {
            console.error("[room:start_game] startGame failed:", err);
          });
        } else if (room.garticAIConfig?.aiJudgeMode) {
          garticAIService.startGame(roomId, io).catch((err) => {
            console.error("[room:start_game] garticAI startGame failed:", err);
          });
        } else {
          garticService.startPromptPhase(io, roomId).catch((err) => {
            console.error("[room:start_game] startPromptPhase failed:", err);
          });
        }
      }, 1500);
    } catch (err) {
      console.error("[room:start_game] Error:", err);
      socket.emit("error" as any, { message: "Failed to start game" });
    }
  });

  socket.on("room:invite_friend", async ({ roomId, targetId }: { roomId: string; targetId: string }) => {
    try {
      const inviterClerkId = socket.data.userId;

      const inviterDb = await prisma.user.findUnique({
        where: { clerkId: inviterClerkId },
        select: { id: true },
      });
      if (!inviterDb) return;

      const room = await prisma.room.findUnique({
        where: { id: roomId },
        select: {
          code: true,
          gameModeId: true,
          players: { where: { statusId: "CONNECTED" }, select: { userId: true } },
        },
      });
      if (!room) return;

      if (!room.players.some((p) => p.userId === inviterDb.id)) return;

      const allSockets = await io.fetchSockets();
      const targetSocket = allSockets.find((s) => s.data.userId === targetId);
      if (!targetSocket) return;

      targetSocket.emit("room:invite_received", {
        roomId,
        roomCode: room.code,
        fromId: inviterClerkId,
        fromUsername: socket.data.username,
        gameMode: room.gameModeId as "GARTIC_PHONE" | "SKRIBBL",
      });
    } catch (err) {
      console.error("[room:invite_friend] Error:", err);
    }
  });

  socket.on("room:new_game", async ({ roomId }: { roomId: string }) => {
    try {
      const userId = socket.data.userId;

      const oldRoom = await prisma.room.findUnique({
        where: { id: roomId },
        include: {
          players: {
            where: { statusId: { not: "KICKED" } },
            include: { user: true },
            orderBy: { joinedAt: "asc" },
          },
        },
      });
      if (!oldRoom || oldRoom.hostId !== userId) return;

      let code = generateRoomCode();
      while (await prisma.room.findUnique({ where: { code } })) {
        code = generateRoomCode();
      }

      const [oldSkribblCfg, oldGarticAICfg] = await Promise.all([
        prisma.roomSkribblConfig.findUnique({ where: { roomId } }),
        prisma.roomGarticAIConfig.findUnique({ where: { roomId } }),
      ]);

      const newRoom = await prisma.room.create({
        data: {
          code,
          gameModeId: oldRoom.gameModeId,
          hostId: userId,
          maxPlayers: oldRoom.maxPlayers,
          roundCount: oldRoom.roundCount,
          timePerRound: oldRoom.timePerRound,
          // statusId omitted — DB default is "WAITING"
          skribblConfig: {
            create: {
              wordCategories: oldSkribblCfg?.wordCategories ?? [],
              customWords:    oldSkribblCfg?.customWords    ?? [],
              withAI:         oldSkribblCfg?.withAI         ?? false,
              wordLanguage:   oldSkribblCfg?.wordLanguage   ?? "en",
            },
          },
          garticAIConfig: {
            create: {
              aiJudgeMode:       oldGarticAICfg?.aiJudgeMode      ?? false,
              aiDrawTime:        oldGarticAICfg?.aiDrawTime        ?? 20,
              aiDrawTimePerTurn: oldGarticAICfg?.aiDrawTimePerTurn ?? 20,
              aiDrawModeId:      oldGarticAICfg?.aiDrawModeId      ?? "turn",
              aiLives:           oldGarticAICfg?.aiLives           ?? 3,
              aiWordCategory:    oldGarticAICfg?.aiWordCategory    ?? "",
              aiHintLetters:     oldGarticAICfg?.aiHintLetters     ?? 0,
            },
          },
        },
      });

      // statusId "DISCONNECTED" — updated to "CONNECTED" when they emit room:join on new lobby
      for (const player of oldRoom.players) {
        await prisma.roomPlayer.create({
          data: {
            roomId: newRoom.id,
            userId: player.userId,
            isHost: player.user.clerkId === userId,
            isBot: player.isBot,
            score: 0,
            statusId: "DISCONNECTED",
          },
        });
      }

      io.to(roomId).emit("room:new_game_started", { newRoomId: newRoom.id });
    } catch (err) {
      console.error("[room:new_game] Error:", err);
    }
  });

  socket.on("lobby:chat_message", async ({ roomId, message }: { roomId: string; message: string }) => {
    try {
      if (!message || typeof message !== "string") return;
      const trimmed = message.trim().slice(0, 500);
      if (!trimmed) return;

      // Block drawer from chatting during DRAWING phase to prevent word reveal
      const activeGame = await prisma.skribblGame.findFirst({
        where: { roomId, phaseId: "DRAWING" },
        select: { playerOrder: true, currentDrawerIndex: true },
      });
      if (activeGame) {
        const drawerClerkId = (activeGame.playerOrder as string[])[activeGame.currentDrawerIndex];
        if (drawerClerkId === socket.data.userId) return;
      }

      const chatMessage = {
        id: randomUUID(),
        senderId: socket.data.userId,
        senderUsername: socket.data.username,
        senderAvatarUrl: null as string | null,
        message: trimmed,
        sentAt: new Date().toISOString(),
      };

      io.to(roomId).emit("lobby:message", chatMessage);
    } catch (err) {
      console.error("[lobby:chat_message] Error:", err);
    }
  });
}
