-- Fix 8: Add FK constraint GarticAITurn.playerId → users.clerkId.
-- Delete orphaned turns first (player user no longer exists — stale guest data).

DELETE FROM "gartic_ai_turns"
WHERE NOT EXISTS (
    SELECT 1 FROM "users" u WHERE u."clerkId" = "gartic_ai_turns"."playerId"
);

-- AddForeignKey
ALTER TABLE "gartic_ai_turns" ADD CONSTRAINT "gartic_ai_turns_playerId_fkey"
    FOREIGN KEY ("playerId") REFERENCES "users"("clerkId") ON DELETE RESTRICT ON UPDATE CASCADE;
