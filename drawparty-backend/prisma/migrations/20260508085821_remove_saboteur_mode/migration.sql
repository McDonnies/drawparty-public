/*
  Warnings:

  - You are about to drop the column `chainOnTrack` on the `gartic_games` table. All the data in the column will be lost.
  - You are about to drop the column `ejectedPlayerId` on the `gartic_games` table. All the data in the column will be lost.
  - You are about to drop the column `endTitle` on the `gartic_games` table. All the data in the column will be lost.
  - You are about to drop the column `saboteurId` on the `gartic_games` table. All the data in the column will be lost.
  - You are about to drop the column `saboteurMode` on the `gartic_games` table. All the data in the column will be lost.
  - You are about to drop the column `startTitle` on the `gartic_games` table. All the data in the column will be lost.
  - You are about to drop the column `waypoints` on the `gartic_games` table. All the data in the column will be lost.
  - You are about to drop the column `saboteurMode` on the `rooms` table. All the data in the column will be lost.
  - You are about to drop the `gartic_meeting_votes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `gartic_meetings` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "gartic_meeting_votes" DROP CONSTRAINT "gartic_meeting_votes_meetingId_fkey";

-- DropForeignKey
ALTER TABLE "gartic_meetings" DROP CONSTRAINT "gartic_meetings_garticGameId_fkey";

-- AlterTable
ALTER TABLE "gartic_games" DROP COLUMN "chainOnTrack",
DROP COLUMN "ejectedPlayerId",
DROP COLUMN "endTitle",
DROP COLUMN "saboteurId",
DROP COLUMN "saboteurMode",
DROP COLUMN "startTitle",
DROP COLUMN "waypoints";

-- AlterTable
ALTER TABLE "rooms" DROP COLUMN "saboteurMode";

-- DropTable
DROP TABLE "gartic_meeting_votes";

-- DropTable
DROP TABLE "gartic_meetings";
