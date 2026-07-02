-- Fix 4: Drop SkribblGame.wordCategories.
-- Source of truth is now RoomSkribblConfig.wordCategories (set in Fix 3).
-- Service code reads from room.skribblConfig.wordCategories instead of game.wordCategories.

ALTER TABLE "skribbl_games" DROP COLUMN "wordCategories";
