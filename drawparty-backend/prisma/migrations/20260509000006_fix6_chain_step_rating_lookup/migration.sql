-- Fix 6: Normalize GarticChainStep.rating → ChainStepRating lookup table.
-- Column is nullable (rating is optional), so ratingId stays nullable.
-- Order: CREATE table → seed → ADD column → backfill non-NULLs → FK → DROP old column.

-- CreateTable
CREATE TABLE "chain_step_ratings" (
    "id"    TEXT NOT NULL,
    "label" TEXT NOT NULL,
    CONSTRAINT "chain_step_ratings_pkey" PRIMARY KEY ("id")
);

-- Seed lookup values before adding the FK column
INSERT INTO "chain_step_ratings" ("id", "label") VALUES
    ('GREEN',  'Vert'),
    ('YELLOW', 'Jaune'),
    ('RED',    'Rouge')
ON CONFLICT ("id") DO NOTHING;

-- Add nullable ratingId column
ALTER TABLE "gartic_chain_steps" ADD COLUMN "ratingId" TEXT;

-- Backfill: copy existing rating string where not NULL; NULL stays NULL
UPDATE "gartic_chain_steps" SET "ratingId" = "rating" WHERE "rating" IS NOT NULL;

-- AddForeignKey (nullable FK — ON DELETE SET NULL keeps orphan safety)
ALTER TABLE "gartic_chain_steps" ADD CONSTRAINT "gartic_chain_steps_ratingId_fkey"
    FOREIGN KEY ("ratingId") REFERENCES "chain_step_ratings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Drop the old untyped string column
ALTER TABLE "gartic_chain_steps" DROP COLUMN "rating";
