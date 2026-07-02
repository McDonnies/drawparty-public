-- AlterTable
ALTER TABLE "skribbl_games" ADD COLUMN     "usedWordIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
