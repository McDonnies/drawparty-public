import type { Server } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  UserStatus,
} from "../types/socket";
import { socketAuthMiddleware } from "./middleware/socketAuth";
import { registerRoomHandlers } from "./handlers/roomHandlers";
import { registerGarticHandlers } from "./handlers/garticHandlers";
import { registerSkribblHandlers } from "./handlers/skribblHandlers";
import { registerGarticAIHandlers } from "./handlers/garticAIHandlers";
import * as skribblService from "../services/skribblService";
import { prisma } from "../config/prisma";

export type AppServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

let ioRef: AppServer | null = null;
const statusMap = new Map<string, UserStatus>();

export function getIoInstance(): AppServer | null { return ioRef; }
export function getUserStatus(clerkId: string): UserStatus { return statusMap.get(clerkId) ?? "offline"; }
export function setUserStatus(clerkId: string, status: UserStatus): void {
  if (status === "offline") statusMap.delete(clerkId);
  else statusMap.set(clerkId, status);
}

export async function broadcastStatusToFriends(clerkId: string, status: UserStatus): Promise<void> {
  if (!ioRef) return;
  const user = await prisma.user.findUnique({ where: { clerkId }, select: { id: true } });
  if (!user) return;
  const friendships = await prisma.friendship.findMany({
    where: { statusId: "ACCEPTED", OR: [{ senderId: user.id }, { receiverId: user.id }] },
    select: {
      sender:   { select: { clerkId: true } },
      receiver: { select: { clerkId: true } },
    },
  });
  const friendClerkIds = new Set(
    friendships.map(f => (f.sender.clerkId === clerkId ? f.receiver.clerkId : f.sender.clerkId))
  );
  const sockets = await ioRef.fetchSockets();
  for (const s of sockets) {
    if (friendClerkIds.has(s.data.userId)) {
      s.emit("friend:status_changed", { clerkId, status });
    }
  }
}

const disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function initializeSocket(io: AppServer): void {
  ioRef = io;

  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {
    const { userId } = socket.data;

    const pendingTimer = disconnectTimers.get(userId);
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      disconnectTimers.delete(userId);
    }

    setUserStatus(userId, "online");
    broadcastStatusToFriends(userId, "online").catch(err =>
      console.error("[presence] broadcast on connect failed:", err)
    );

    registerRoomHandlers(io, socket);
    registerGarticHandlers(io, socket);
    registerSkribblHandlers(io, socket);
    registerGarticAIHandlers(io, socket);

    socket.on("disconnect", async (reason) => {
      const roomId = socket.data.roomId;

      if (roomId) {
        try {
          // clerkId ≠ internal userId on room_players — must resolve first
          const dbUser = await prisma.user.findUnique({
            where: { clerkId: userId },
            select: { id: true },
          });

          if (dbUser) {
            await prisma.roomPlayer.updateMany({
              where: { userId: dbUser.id, roomId, statusId: "CONNECTED" },
              data: { statusId: "DISCONNECTED" },
            });
          }

          socket.to(roomId).emit("room:player_left", { playerId: userId });
        } catch (err) {
          console.error("[socket] Failed to mark player disconnected:", err);
        }

        try {
          const activeGame = await prisma.skribblGame.findFirst({
            where: { roomId, phaseId: { in: ["PICKING_WORD", "DRAWING"] } },
            select: { playerOrder: true, currentDrawerIndex: true },
          });
          if (activeGame) {
            const drawerClerkId = activeGame.playerOrder[activeGame.currentDrawerIndex];
            if (drawerClerkId === userId) {
              const fullGame = await skribblService.fetchActiveGameForRoom(roomId);
              if (fullGame) await skribblService.advanceRound(fullGame, io);
            }
          }
        } catch (err) {
          console.error("[socket] Failed to auto-advance after drawer disconnect:", err);
        }
      }

      const timer = setTimeout(async () => {
        disconnectTimers.delete(userId);

        setUserStatus(userId, "offline");
        broadcastStatusToFriends(userId, "offline").catch(err =>
          console.error("[presence] broadcast on grace-expiry failed:", err)
        );

        if (!roomId) return;

        try {
          // clerkId ≠ internal userId on room_players — must resolve first
          const dbUser = await prisma.user.findUnique({
            where: { clerkId: userId },
            select: { id: true },
          });
          if (!dbUser) return;

          const player = await prisma.roomPlayer.findFirst({
            where: { userId: dbUser.id, roomId, statusId: "DISCONNECTED" },
          });
          if (!player) return;

          await prisma.roomPlayer.delete({ where: { id: player.id } });

          const remaining = await prisma.roomPlayer.count({
            where: { roomId, statusId: "CONNECTED" },
          });
          if (remaining === 0) {
            await prisma.room.update({
              where: { id: roomId },
              data: { statusId: "FINISHED" },
            });
          }
        } catch (err) {
          console.error("[socket] Failed to handle permanent leave:", err);
        }
      }, 30_000);

      disconnectTimers.set(userId, timer);
    });
  })
}
