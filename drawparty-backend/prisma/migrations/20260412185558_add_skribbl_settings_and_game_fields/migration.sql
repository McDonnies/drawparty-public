-- AlterTable
ALTER TABLE "rooms" ADD COLUMN     "customWords" TEXT[],
ADD COLUMN     "wordCategories" TEXT[];

-- AlterTable
ALTER TABLE "skribbl_games" ADD COLUMN     "currentDrawerIndex" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "offeredWordIds" TEXT[],
ADD COLUMN     "playerOrder" TEXT[];
