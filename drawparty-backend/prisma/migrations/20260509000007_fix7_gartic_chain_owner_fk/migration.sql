-- Fix 7: Add FK constraint GarticChain.ownerId → users.clerkId.
-- Delete orphaned chains first (owner user no longer exists — stale guest data).
-- Cascades on gartic_chain_steps handle child cleanup.

DELETE FROM "gartic_chains"
WHERE NOT EXISTS (
    SELECT 1 FROM "users" u WHERE u."clerkId" = "gartic_chains"."ownerId"
);

-- AddForeignKey
ALTER TABLE "gartic_chains" ADD CONSTRAINT "gartic_chains_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "users"("clerkId") ON DELETE RESTRICT ON UPDATE CASCADE;
