-- Fix 2: Normalize GarticAIGame.phase from raw String to lookup table GarticAIGamePhase.
-- Order: CREATE table → seed → ADD column (nullable) → backfill → NOT NULL → FK → DROP old column.

-- CreateTable
CREATE TABLE "gartic_ai_game_phases" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    CONSTRAINT "gartic_ai_game_phases_pkey" PRIMARY KEY ("id")
);

-- Seed lookup values before adding the FK column
INSERT INTO "gartic_ai_game_phases" ("id", "label") VALUES
  ('DRAWING',      'Dessin'),
  ('AI_JUDGING',   'Jugement IA'),
  ('ROUND_RESULT', 'Résultat du tour'),
  ('GAME_OVER',    'Partie terminée')
ON CONFLICT ("id") DO NOTHING;

-- Add phaseId as nullable first so the backfill UPDATE can run without NOT NULL violation
ALTER TABLE "gartic_ai_games" ADD COLUMN "phaseId" TEXT;

-- Backfill: copy existing phase string into phaseId
-- Only "DRAWING" and "GAME_OVER" are written by the service; all values are in the lookup table.
UPDATE "gartic_ai_games" SET "phaseId" = "phase";

-- Enforce NOT NULL and set default now that every row has a value
ALTER TABLE "gartic_ai_games" ALTER COLUMN "phaseId" SET NOT NULL;
ALTER TABLE "gartic_ai_games" ALTER COLUMN "phaseId" SET DEFAULT 'DRAWING';

-- AddForeignKey
ALTER TABLE "gartic_ai_games" ADD CONSTRAINT "gartic_ai_games_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "gartic_ai_game_phases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Drop the old untyped string column
ALTER TABLE "gartic_ai_games" DROP COLUMN "phase";
