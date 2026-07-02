import { Router, Request, Response } from "express";
import * as userController from "../controllers/userController";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/authMiddleware";
import { clerkClient } from "../config/clerk";

const router = Router();

router.post("/sync", async (req: Request, res: Response) => {
  const { type, data } = req.body;

  try {
    switch (type) {
      case "user.created": {
        const primaryEmail = data.email_addresses?.find(
          (e: any) => e.id === data.primary_email_address_id
        );
        await prisma.user.upsert({
          where: { clerkId: data.id },
          update: {
            ...(data.username  && { username:  data.username }),
            ...(data.image_url && { avatarUrl: data.image_url }),
          },
          create: {
            clerkId:   data.id,
            username:  data.username ?? `player_${data.id.slice(-6)}`,
            email:     primaryEmail?.email_address ?? `${data.id}@drawparty.local`,
            avatarUrl: data.image_url ?? null,
            skribblStats: { create: {} },
            garticStats:  { create: {} },
          },
        });
        break;
      }
      case "user.updated": {
        const primaryEmail = data.email_addresses?.find(
          (e: any) => e.id === data.primary_email_address_id
        );
        await prisma.user.update({
          where: { clerkId: data.id },
          data: {
            ...(data.username           && { username:  data.username }),
            ...(primaryEmail            && { email:     primaryEmail.email_address }),
            ...(data.image_url          && { avatarUrl: data.image_url }),
          },
        });
        break;
      }
      case "user.deleted": {
        await prisma.user.delete({ where: { clerkId: data.id } });
        break;
      }
    }
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("[/users/sync] Error:", error);
    res.status(500).json({ error: "User sync failed" });
  }
});

// GET /users/me upserts the user row on first load — covers local dev without a Clerk webhook tunnel.
router.get("/me", requireAuth, async (req: Request, res: Response) => {
  const clerkId = (req as any).auth.userId as string;

  // Block guests — they have no persistent profile
  if (clerkId.startsWith("guest_")) {
    return res.status(403).json({ error: "Guests do not have a profile" });
  }

  try {
    // Check if the user already exists before hitting Clerk's API
    const existing = await prisma.user.findUnique({
      where: { clerkId },
      include: { skribblStats: true, garticStats: true },
    });
    if (existing) return res.json(existing);

    let username = `player_${clerkId.slice(-6)}`;
    let email = `${clerkId}@drawparty.local`;
    let avatarUrl: string | null = null;

    try {
      const clerkUser = await clerkClient.users.getUser(clerkId);
      avatarUrl = clerkUser.imageUrl ?? null;
      // Email intentionally not fetched from Clerk — clerkId placeholder avoids P2002 on shared emails.
      username = (clerkUser.username ?? clerkUser.firstName ?? username)
        .slice(0, 20).replace(/[^a-zA-Z0-9_-]/g, "_");
    } catch {
      // Clerk API unavailable — fall back to placeholder
    }

    // Try preferred username; fall back with clerkId suffix on uniqueness collision
    const tryCreate = async (name: string) =>
      prisma.user.upsert({
        where: { clerkId },
        update: {},
        create: {
          clerkId,
          username: name,
          email,
          avatarUrl,
          skribblStats: { create: {} },
          garticStats:  { create: {} },
        },
        include: { skribblStats: true, garticStats: true },
      });

    try {
      res.json(await tryCreate(username));
    } catch (e: any) {
      if (e?.code === "P2002") {
        // P2002: username taken — append clerkId suffix to guarantee uniqueness
        const fallback = `${username.slice(0, 15)}_${clerkId.slice(-4)}`;
        res.json(await tryCreate(fallback));
      } else {
        throw e;
      }
    }
  } catch (err) {
    console.error("[GET /users/me]", err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

router.patch("/me", requireAuth, async (req: Request, res: Response) => {
  const clerkId = (req as any).auth.userId as string;
  if (clerkId.startsWith("guest_")) {
    return res.status(403).json({ error: "Guests cannot update their profile" });
  }

  const { username, avatarUrl } = req.body;

  try {
    const updated = await prisma.user.update({
      where: { clerkId },
      data: {
        ...(username  && { username }),
        ...(avatarUrl && { avatarUrl }),
      },
    });
    res.json(updated);
  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Username already taken" });
    }
    res.status(500).json({ error: "Failed to update user" });
  }
});

router.get("/me/stats",    requireAuth, userController.getMyStats);
router.get("/leaderboard", userController.getLeaderboard);
router.get("/me/rank",     requireAuth, userController.getMyRank);

export default router;
