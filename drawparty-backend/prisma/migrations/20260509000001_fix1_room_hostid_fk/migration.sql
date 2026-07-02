-- Fix 1: Add FK constraint on Room.hostId → users.clerkId
-- Delete orphaned rooms first (host user never persisted — stale guest sessions).
-- Cascades defined on room_players, gartic_games, skribbl_games, gartic_ai_games handle child cleanup.

DELETE FROM "rooms"
WHERE NOT EXISTS (
  SELECT 1 FROM "users" u WHERE u."clerkId" = "rooms"."hostId"
);

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "users"("clerkId") ON DELETE RESTRICT ON UPDATE CASCADE;
