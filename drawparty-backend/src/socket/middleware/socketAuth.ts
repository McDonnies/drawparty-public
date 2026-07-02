import type { Socket } from "socket.io";
import { verifyToken } from "@clerk/backend";
import { prisma } from "../../config/prisma";

export type AuthenticatedSocket = Socket & {
  data: {
    userId: string;    // verified clerkId or "guest_<uuid>"
    username: string;
  };
};

export async function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void
): Promise<void> {
  try {
    const token = socket.handshake.auth?.token as string | undefined;
    const guestId = socket.handshake.auth?.guestId as string | undefined;

    if (!token && !guestId) {
      return next(new Error("Authentication required"));
    }

    let userId: string;

    if (token) {
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });
      userId = payload.sub;
    } else {
      if (!/^[0-9a-f-]{36}$/.test(guestId!)) {
        return next(new Error("Invalid guest ID"));
      }
      userId = `guest_${guestId}`;
    }

    const rawGuestName = socket.handshake.auth?.guestName as string | undefined;
    const rawDisplayName = socket.handshake.auth?.displayName as string | undefined;
    const safeName = (rawGuestName ?? rawDisplayName)?.trim().slice(0, 50) || undefined;

    const isGuest = userId.startsWith("guest_");
    // Guest usernames include a 4-char suffix to guarantee DB uniqueness.
    const derivedName = safeName
      ? (isGuest ? `${safeName}#${userId.slice(-4)}` : safeName)
      : (isGuest ? `Guest_${userId.slice(-12)}` : `player_${userId.slice(-6)}`);

    const user = await prisma.user.upsert({
      where: { clerkId: userId },
      // Guests: always update (derived name changes each connect).
      // Clerk users: never overwrite — username is owned by PATCH /users/me + webhook.
      update: isGuest ? { username: derivedName } : {},
      create: {
        clerkId: userId,
        username: derivedName,
        email: `${userId}@drawparty.local`,
        skribblStats: { create: {} },
        garticStats: { create: {} },
      },
      select: { username: true },
    });

    socket.data.userId = userId;
    socket.data.username = user.username;

    next();
  } catch {
    next(new Error("Invalid token"));
  }
}
