import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware";
import { createRoom, getRoomByCode, joinRoom } from "../controllers/roomController";

const router = Router();

router.post("/", requireAuth, createRoom);
router.get("/:code", requireAuth, getRoomByCode);
router.post("/:code/join", requireAuth, joinRoom);

export default router;
