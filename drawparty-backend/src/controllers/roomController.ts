import type { Request, Response, NextFunction } from "express";
import * as roomService from "../services/roomService";
import type { GameMode } from "../types/game";

const VALID_GAME_MODES: GameMode[] = ["GARTIC_PHONE", "SKRIBBL"];

export async function createRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { gameMode, roundCount, timePerRound } = req.body;

    if (!gameMode) {
      res.status(400).json({ error: "gameMode is required" });
      return;
    }
    if (!VALID_GAME_MODES.includes(gameMode as GameMode)) {
      res.status(400).json({ error: `gameMode must be one of: ${VALID_GAME_MODES.join(", ")}` });
      return;
    }

    const hostClerkId = (req as any).auth?.userId;
    if (!hostClerkId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const guestName = (req as any).auth?.guestName as string | undefined;
    const room = await roomService.createRoom({
      hostClerkId,
      gameMode: gameMode as GameMode,
      roundCount: roundCount ? Number(roundCount) : undefined,
      timePerRound: timePerRound ? Number(timePerRound) : undefined,
      guestName,
    });

    res.status(201).json(room);
  } catch (err: any) {
    if (err.message === "User not found") {
      res.status(404).json({ error: "User not found" });
      return;
    }
    next(err);
  }
}

export async function getRoomByCode(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { code } = req.params;
    const clerkId = (req as any).auth?.userId;

    const room = await roomService.getRoomByCode(code.toUpperCase(), clerkId);
    res.json(room);
  } catch (err: any) {
    if (err.message === "ROOM_NOT_FOUND") {
      res.status(404).json({ error: "Room not found" });
      return;
    }
    next(err);
  }
}

export async function joinRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { code } = req.params;
    const clerkId = (req as any).auth?.userId;

    if (!clerkId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const guestName = (req as any).auth?.guestName as string | undefined;
    const room = await roomService.joinRoom({
      code: code.toUpperCase(),
      clerkId,
      guestName,
    });

    res.json(room);
  } catch (err: any) {
    const clientErrors = ["ROOM_FULL", "ROOM_NOT_WAITING", "ALREADY_IN_ROOM", "ROOM_KICKED"];
    if (err.message === "ROOM_NOT_FOUND" || err.message === "User not found") {
      res.status(404).json({ error: err.message === "ROOM_NOT_FOUND" ? "Room not found" : "User not found" });
      return;
    }
    if (clientErrors.includes(err.message)) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
}
