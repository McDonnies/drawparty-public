import { Request, Response, NextFunction } from "express";
import { verifyToken } from "@clerk/backend";

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    // Path 1: Clerk JWT
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });
      (req as any).auth = { userId: payload.sub };
      return next();
    }

    // Path 2: Guest ID (UUID format)
    const guestId = req.headers["x-guest-id"] as string | undefined;
    if (guestId && /^[0-9a-f-]{36}$/.test(guestId)) {
      const rawName = req.headers["x-guest-name"] as string | undefined;
      const guestName = rawName?.trim().slice(0, 20) || undefined;
      (req as any).auth = { userId: `guest_${guestId}`, guestName };
      return next();
    }

    return res.status(401).json({ error: "No token provided" });
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
