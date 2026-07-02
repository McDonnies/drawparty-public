import type { Request, Response, NextFunction } from "express";
import { prisma } from "../config/prisma";
import * as friendService from "../services/friendService";
import { getIoInstance, getUserStatus } from "../socket";

function mapServiceError(err: unknown, res: Response): void {
  const msg = err instanceof Error ? err.message : "Internal error";
  if (
    msg === "User not found" ||
    msg === "Friend request not found" ||
    msg === "Friendship not found"
  ) {
    res.status(404).json({ error: msg });
    return;
  }
  if (msg === "Forbidden") {
    res.status(403).json({ error: msg });
    return;
  }
  if (
    msg === "Already friends" ||
    msg === "Friend request already sent" ||
    msg === "Request is no longer pending"
  ) {
    res.status(409).json({ error: msg });
    return;
  }
  if (msg === "Cannot send request to yourself") {
    res.status(400).json({ error: msg });
    return;
  }
  console.error("[friendController]", err);
  res.status(500).json({ error: "Internal error" });
}

async function resolveUserId(clerkId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { clerkId }, select: { id: true } });
  if (!user) throw Object.assign(new Error("User not found"), { status: 404 });
  return user.id;
}

function isGuest(req: Request): boolean {
  return String((req as any).auth?.userId ?? "").startsWith("guest_");
}

export async function searchUsers(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  if (isGuest(req)) { res.status(403).json({ error: "Guests cannot use social features" }); return; }
  try {
    const username = String(req.query.username ?? "");
    if (username.trim().length < 2) {
      res.status(400).json({ error: "username query param required (min 2 chars)" });
      return;
    }
    const callerId = await resolveUserId((req as any).auth.userId);
    res.json(await friendService.searchUsers(username, callerId));
  } catch (err) {
    mapServiceError(err, res);
  }
}

export async function sendFriendRequest(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  if (isGuest(req)) { res.status(403).json({ error: "Guests cannot use social features" }); return; }
  try {
    const { targetClerkId } = req.body;
    if (!targetClerkId) {
      res.status(400).json({ error: "targetClerkId is required" });
      return;
    }

    const [callerId, targetId] = await Promise.all([
      resolveUserId((req as any).auth.userId),
      resolveUserId(targetClerkId),
    ]);

    const { id } = await friendService.sendFriendRequest(callerId, targetId);

    // Emit real-time notification if target is currently connected
    const caller = await prisma.user.findUnique({
      where: { clerkId: (req as any).auth.userId },
      select: { clerkId: true, username: true, avatarUrl: true },
    });
    const io = getIoInstance();
    if (io && caller) {
      const sockets = await io.fetchSockets();
      const targetSocket = sockets.find(s => s.data.userId === targetClerkId);
      targetSocket?.emit("friend:request_received", { requestId: id, from: caller });
    }

    res.status(201).json({ requestId: id });
  } catch (err) {
    mapServiceError(err, res);
  }
}

export async function acceptFriendRequest(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  if (isGuest(req)) { res.status(403).json({ error: "Guests cannot use social features" }); return; }
  try {
    const accepterClerkId = (req as any).auth.userId as string;
    const callerId = await resolveUserId(accepterClerkId);
    await friendService.acceptFriendRequest(req.params.id, callerId);

    // Notify sender in real-time so their friend list updates instantly
    const friendship = await prisma.friendship.findUnique({
      where: { id: req.params.id },
      select: { sender: { select: { clerkId: true } } },
    });
    const accepter = await prisma.user.findUnique({
      where: { clerkId: accepterClerkId },
      select: { id: true, clerkId: true, username: true, avatarUrl: true },
    });
    const io = getIoInstance();
    if (io && friendship && accepter) {
      const sockets = await io.fetchSockets();
      const senderSocket = sockets.find((s) => s.data.userId === friendship.sender.clerkId);
      senderSocket?.emit("friend:request_accepted", {
        friend: { id: accepter.id, clerkId: accepter.clerkId, username: accepter.username, avatarUrl: accepter.avatarUrl },
      });
    }

    res.json({ ok: true });
  } catch (err) {
    mapServiceError(err, res);
  }
}

export async function declineFriendRequest(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  if (isGuest(req)) { res.status(403).json({ error: "Guests cannot use social features" }); return; }
  try {
    const callerId = await resolveUserId((req as any).auth.userId);
    await friendService.declineFriendRequest(req.params.id, callerId);
    res.json({ ok: true });
  } catch (err) {
    mapServiceError(err, res);
  }
}

export async function getFriends(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  if (isGuest(req)) { res.json([]); return; }
  try {
    const callerId = await resolveUserId((req as any).auth.userId);
    const friends = await friendService.getFriends(callerId);
    // Overlay live presence status from the socket registry
    const withStatus = friends.map(f => ({ ...f, status: getUserStatus(f.clerkId) }));
    res.json(withStatus);
  } catch (err) {
    mapServiceError(err, res);
  }
}

export async function removeFriend(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  if (isGuest(req)) { res.status(403).json({ error: "Guests cannot use social features" }); return; }
  try {
    const callerClerkId = (req as any).auth.userId as string;
    const [callerId, targetId] = await Promise.all([
      resolveUserId(callerClerkId),
      resolveUserId(req.params.targetClerkId),
    ]);
    await friendService.removeFriend(callerId, targetId);

    // Notify other party in real-time so their UI updates instantly
    const io = getIoInstance();
    if (io) {
      const sockets = await io.fetchSockets();
      const targetSocket = sockets.find((s) => s.data.userId === req.params.targetClerkId);
      targetSocket?.emit("friend:removed", { removedBy: callerClerkId });
    }

    res.json({ ok: true });
  } catch (err) {
    mapServiceError(err, res);
  }
}

export async function getPendingRequests(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  if (isGuest(req)) { res.json([]); return; }
  try {
    const callerId = await resolveUserId((req as any).auth.userId);
    res.json(await friendService.getPendingRequests(callerId));
  } catch (err) {
    mapServiceError(err, res);
  }
}
