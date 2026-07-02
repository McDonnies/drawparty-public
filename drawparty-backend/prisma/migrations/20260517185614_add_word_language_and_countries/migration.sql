/*
  Warnings:

  - A unique constraint covering the columns `[text,language]` on the table `words` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "words_text_key";

-- AlterTable
ALTER TABLE "room_skribbl_configs" ADD COLUMN     "wordLanguage" TEXT NOT NULL DEFAULT 'en',
ALTER COLUMN "wordCategories" DROP DEFAULT,
ALTER COLUMN "customWords" DROP DEFAULT;

-- AlterTable
ALTER TABLE "words" ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'en';

-- CreateIndex
CREATE INDEX "gartic_ai_turns_playerId_idx" ON "gartic_ai_turns"("playerId");

-- CreateIndex
CREATE INDEX "gartic_chains_ownerId_idx" ON "gartic_chains"("ownerId");

-- CreateIndex
CREATE INDEX "skribbl_rounds_drawerId_idx" ON "skribbl_rounds"("drawerId");

-- CreateIndex
CREATE INDEX "words_language_idx" ON "words"("language");

-- CreateIndex
CREATE UNIQUE INDEX "words_text_language_key" ON "words"("text", "language");
