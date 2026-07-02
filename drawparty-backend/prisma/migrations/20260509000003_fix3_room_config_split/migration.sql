-- Fix 3: Split game-mode-specific columns out of rooms into RoomSkribblConfig and RoomGarticAIConfig.
-- Order: CREATE tables → backfill INSERT → count verification → ADD FKs → DROP columns from rooms.

-- CreateTable: Skribbl-specific room config
CREATE TABLE "room_skribbl_configs" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "wordCategories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "customWords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "withAI" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "room_skribbl_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Gartic AI-specific room config
CREATE TABLE "room_gartic_ai_configs" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "aiJudgeMode" BOOLEAN NOT NULL DEFAULT false,
    "aiDrawTime" INTEGER NOT NULL DEFAULT 20,
    "aiDrawTimePerTurn" INTEGER NOT NULL DEFAULT 20,
    "aiDrawMode" TEXT NOT NULL DEFAULT 'turn',
    "aiLives" INTEGER NOT NULL DEFAULT 3,
    "aiWordCategory" TEXT NOT NULL DEFAULT '',
    "aiHintLetters" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "room_gartic_ai_configs_pkey" PRIMARY KEY ("id")
);

-- Unique index: one config row per room
CREATE UNIQUE INDEX "room_skribbl_configs_roomId_key" ON "room_skribbl_configs"("roomId");
CREATE UNIQUE INDEX "room_gartic_ai_configs_roomId_key" ON "room_gartic_ai_configs"("roomId");

-- Backfill: insert one skribbl config row for every existing room
-- COALESCE guards against rows that predate the column additions (NULL values).
INSERT INTO "room_skribbl_configs" ("id", "roomId", "wordCategories", "customWords", "withAI")
SELECT
    gen_random_uuid()::text,
    "id",
    COALESCE("wordCategories", ARRAY[]::TEXT[]),
    COALESCE("customWords",    ARRAY[]::TEXT[]),
    COALESCE("withAI",         false)
FROM "rooms";

-- Backfill: insert one gartic AI config row for every existing room
-- COALESCE guards against rows that predate the column additions (NULL values).
INSERT INTO "room_gartic_ai_configs" ("id", "roomId", "aiJudgeMode", "aiDrawTime", "aiDrawTimePerTurn", "aiDrawMode", "aiLives", "aiWordCategory", "aiHintLetters")
SELECT
    gen_random_uuid()::text,
    "id",
    COALESCE("aiJudgeMode",       false),
    COALESCE("aiDrawTime",        20),
    COALESCE("aiDrawTimePerTurn", 20),
    COALESCE("aiDrawMode",        'turn'),
    COALESCE("aiLives",           3),
    COALESCE("aiWordCategory",    ''),
    COALESCE("aiHintLetters",     0)
FROM "rooms";

-- Verify row counts match before dropping source columns
DO $$
DECLARE
  room_count       INTEGER;
  skribbl_count    INTEGER;
  gartic_ai_count  INTEGER;
BEGIN
  SELECT COUNT(*) INTO room_count      FROM "rooms";
  SELECT COUNT(*) INTO skribbl_count   FROM "room_skribbl_configs";
  SELECT COUNT(*) INTO gartic_ai_count FROM "room_gartic_ai_configs";

  IF room_count != skribbl_count THEN
    RAISE EXCEPTION 'Skribbl config count mismatch: rooms=% skribbl_configs=%', room_count, skribbl_count;
  END IF;
  IF room_count != gartic_ai_count THEN
    RAISE EXCEPTION 'GarticAI config count mismatch: rooms=% gartic_ai_configs=%', room_count, gartic_ai_count;
  END IF;
END $$;

-- AddForeignKey
ALTER TABLE "room_skribbl_configs"   ADD CONSTRAINT "room_skribbl_configs_roomId_fkey"   FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "room_gartic_ai_configs" ADD CONSTRAINT "room_gartic_ai_configs_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop the now-redundant columns from rooms
ALTER TABLE "rooms"
  DROP COLUMN "wordCategories",
  DROP COLUMN "customWords",
  DROP COLUMN "withAI",
  DROP COLUMN "aiJudgeMode",
  DROP COLUMN "aiDrawTime",
  DROP COLUMN "aiDrawTimePerTurn",
  DROP COLUMN "aiDrawMode",
  DROP COLUMN "aiLives",
  DROP COLUMN "aiWordCategory",
  DROP COLUMN "aiHintLetters";
