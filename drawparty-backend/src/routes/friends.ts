import { Router } from "express";
import * as friendController from "../controllers/friendController";

const router = Router();

router.get("/search", friendController.searchUsers);
router.get("/requests", friendController.getPendingRequests);
router.post("/request", friendController.sendFriendRequest);
router.get("/", friendController.getFriends);
router.delete("/:targetClerkId", friendController.removeFriend);
router.patch("/request/:id/accept", friendController.acceptFriendRequest);
router.patch("/request/:id/decline", friendController.declineFriendRequest);

export default router;
