-- AlterTable
ALTER TABLE "gartic_games" ADD COLUMN     "saboteurId" TEXT,
ADD COLUMN     "saboteurMode" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "rooms" ADD COLUMN     "saboteurMode" BOOLEAN NOT NULL DEFAULT false;
