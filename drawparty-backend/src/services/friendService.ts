import { prisma } from "../config/prisma";

export type UserStatus = "online" | "away" | "in-game" | "offline";

export type SearchResultDTO = {
  id: string;
  clerkId: string;
  username: string;
  avatarUrl: string | null;
  alreadyFriend: boolean;
  pendingRequest: boolean;
};

export type FriendDTO = {
  id: string;
  clerkId: string;
  username: string;
  avatarUrl: string | null;
  status: UserStatus;
};

export type PendingRequestDTO = {
  requestId: string;
  sender: {
    id: string;
    clerkId: string;
    username: string;
    avatarUrl: string | null;
  };
  createdAt: Date;
};

export async function searchUsers(
  query: string,
  requesterId: string
): Promise<SearchResultDTO[]> {
  if (query.trim().length < 2) return [];

  const users = await prisma.user.findMany({
    where: {
      username: { contains: query.trim(), mode: "insensitive" },
      id: { not: requesterId },
      // Only registered Clerk accounts — guests have no social features
      NOT: { clerkId: { startsWith: "guest_" } },
      sentFriendRequests: { none: { receiverId: requesterId, statusId: "BLOCKED" } },
      receivedFriendRequests: { none: { senderId: requesterId, statusId: "BLOCKED" } },
    },
    select: { id: true, clerkId: true, username: true, avatarUrl: true },
    take: 20,
  });

  if (users.length === 0) return [];

  const userIds = users.map(u => u.id);
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [
        { senderId: requesterId, receiverId: { in: userIds } },
        { senderId: { in: userIds }, receiverId: requesterId },
      ],
      statusId: { in: ["ACCEPTED", "PENDING"] },
    },
    select: { senderId: true, receiverId: true, statusId: true },
  });

  return users.map(u => {
    const related = friendships.filter(
      f =>
        (f.senderId === requesterId && f.receiverId === u.id) ||
        (f.senderId === u.id && f.receiverId === requesterId)
    );
    return {
      ...u,
      alreadyFriend: related.some(f => f.statusId === "ACCEPTED"),
      pendingRequest: related.some(f => f.statusId === "PENDING"),
    };
  });
}

export async function sendFriendRequest(
  senderId: string,
  receiverId: string
): Promise<{ id: string }> {
  if (senderId === receiverId) throw new Error("Cannot send request to yourself");

  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    },
    select: { statusId: true },
  });

  if (existing) {
    if (existing.statusId === "ACCEPTED") throw new Error("Already friends");
    throw new Error("Friend request already sent");
  }

  const friendship = await prisma.friendship.create({
    data: { senderId, receiverId, statusId: "PENDING" },
    select: { id: true },
  });

  return { id: friendship.id };
}

export async function acceptFriendRequest(
  requestId: string,
  receiverId: string
): Promise<void> {
  const friendship = await prisma.friendship.findUnique({
    where: { id: requestId },
    select: { receiverId: true, statusId: true },
  });

  if (!friendship) throw new Error("Friend request not found");
  if (friendship.receiverId !== receiverId) throw new Error("Forbidden");
  if (friendship.statusId !== "PENDING") throw new Error("Request is no longer pending");

  await prisma.friendship.update({
    where: { id: requestId },
    data: { statusId: "ACCEPTED" },
  });
}

export async function declineFriendRequest(
  requestId: string,
  receiverId: string
): Promise<void> {
  const friendship = await prisma.friendship.findUnique({
    where: { id: requestId },
    select: { receiverId: true, statusId: true },
  });

  if (!friendship) throw new Error("Friend request not found");
  if (friendship.receiverId !== receiverId) throw new Error("Forbidden");
  if (friendship.statusId !== "PENDING") throw new Error("Request is no longer pending");

  await prisma.friendship.update({
    where: { id: requestId },
    data: { statusId: "DECLINED" },
  });
}

export async function getFriends(userId: string): Promise<FriendDTO[]> {
  const friendships = await prisma.friendship.findMany({
    where: {
      statusId: "ACCEPTED",
      OR: [{ senderId: userId }, { receiverId: userId }],
    },
    include: {
      sender:   { select: { id: true, clerkId: true, username: true, avatarUrl: true } },
      receiver: { select: { id: true, clerkId: true, username: true, avatarUrl: true } },
    },
  });

  return friendships.map(f => {
    const other = f.senderId === userId ? f.receiver : f.sender;
    return { ...other, status: "offline" as UserStatus };
  });
}

export async function removeFriend(
  userId: string,
  targetId: string
): Promise<void> {
  const result = await prisma.friendship.deleteMany({
    where: {
      statusId: "ACCEPTED",
      OR: [
        { senderId: userId,   receiverId: targetId },
        { senderId: targetId, receiverId: userId },
      ],
    },
  });

  if (result.count === 0) throw new Error("Friendship not found");
}

export async function getPendingRequests(
  userId: string
): Promise<PendingRequestDTO[]> {
  const friendships = await prisma.friendship.findMany({
    where: { receiverId: userId, statusId: "PENDING" },
    include: {
      sender: { select: { id: true, clerkId: true, username: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return friendships.map(f => ({
    requestId: f.id,
    sender: f.sender,
    createdAt: f.createdAt,
  }));
}
