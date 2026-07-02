-- Fix 5: Normalize RoomGarticAIConfig.aiDrawMode → AIDrawMode lookup table.
-- Order: CREATE table → seed → ADD column (nullable) → backfill → NOT NULL → FK → DROP old column.

-- CreateTable
CREATE TABLE "ai_draw_modes" (
    "id"    TEXT NOT NULL,
    "label" TEXT NOT NULL,
    CONSTRAINT "ai_draw_modes_pkey" PRIMARY KEY ("id")
);

-- Seed lookup values before adding the FK column
INSERT INTO "ai_draw_modes" ("id", "label") VALUES
    ('turn',   'Tour par tour'),
    ('shared', 'Simultané')
ON CONFLICT ("id") DO NOTHING;

-- Add aiDrawModeId as nullable first so backfill can run without NOT NULL violation
ALTER TABLE "room_gartic_ai_configs" ADD COLUMN "aiDrawModeId" TEXT;

-- Backfill: copy existing string value (COALESCE guards against any unexpected NULLs)
UPDATE "room_gartic_ai_configs" SET "aiDrawModeId" = COALESCE("aiDrawMode", 'turn');

-- Enforce NOT NULL and set default
ALTER TABLE "room_gartic_ai_configs" ALTER COLUMN "aiDrawModeId" SET NOT NULL;
ALTER TABLE "room_gartic_ai_configs" ALTER COLUMN "aiDrawModeId" SET DEFAULT 'turn';

-- AddForeignKey
ALTER TABLE "room_gartic_ai_configs" ADD CONSTRAINT "room_gartic_ai_configs_aiDrawModeId_fkey"
    FOREIGN KEY ("aiDrawModeId") REFERENCES "ai_draw_modes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Drop the old untyped string column
ALTER TABLE "room_gartic_ai_configs" DROP COLUMN "aiDrawMode";
