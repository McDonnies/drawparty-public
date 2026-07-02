-- Fix 9: Add FK constraint SkribblRound.drawerId → users.clerkId.
-- Delete orphaned rounds first (drawer user no longer exists — stale guest data).
-- Cascades on skribbl_guesses handle child cleanup.

DELETE FROM "skribbl_rounds"
WHERE NOT EXISTS (
    SELECT 1 FROM "users" u WHERE u."clerkId" = "skribbl_rounds"."drawerId"
);

-- AddForeignKey
ALTER TABLE "skribbl_rounds" ADD CONSTRAINT "skribbl_rounds_drawerId_fkey"
    FOREIGN KEY ("drawerId") REFERENCES "users"("clerkId") ON DELETE RESTRICT ON UPDATE CASCADE;
