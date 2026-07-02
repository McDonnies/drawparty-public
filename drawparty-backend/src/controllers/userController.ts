import type { Request, Response, NextFunction } from "express";
import * as userService from "../services/userService";

export async function getMyStats(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const clerkId = (req as any).auth?.userId;
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }

  try {
    res.json(await userService.getUserStats(clerkId));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "User not found") { res.status(404).json({ error: msg }); return; }
    console.error("[userController.getMyStats]", err);
    res.status(500).json({ error: "Internal error" });
  }
}

export async function getLeaderboard(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const rawPage     = req.query.page     as string | undefined;
  const rawPageSize = req.query.pageSize as string | undefined;

  const page     = rawPage     !== undefined ? Number(rawPage)     : 1;
  const pageSize = rawPageSize !== undefined ? Number(rawPageSize) : 10;

  if (
    (rawPage     !== undefined && isNaN(page)) ||
    (rawPageSize !== undefined && isNaN(pageSize))
  ) {
    res.status(400).json({ error: "page and pageSize must be numeric" });
    return;
  }

  try {
    res.json(await userService.getLeaderboard(page, pageSize));
  } catch (err) {
    console.error("[userController.getLeaderboard]", err);
    res.status(500).json({ error: "Internal error" });
  }
}

export async function getMyRank(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const clerkId = (req as any).auth?.userId;
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }

  try {
    res.json({ rank: await userService.getUserRank(clerkId) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "User not found") { res.status(404).json({ error: msg }); return; }
    console.error("[userController.getMyRank]", err);
    res.status(500).json({ error: "Internal error" });
  }
}
