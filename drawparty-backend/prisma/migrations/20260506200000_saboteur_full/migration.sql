-- AlterTable: GarticGame — add saboteur full-spec fields
ALTER TABLE "gartic_games"
  ADD COLUMN "startTitle"      TEXT,
  ADD COLUMN "endTitle"        TEXT,
  ADD COLUMN "waypoints"       TEXT[]  NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "ejectedPlayerId" TEXT,
  ADD COLUMN "chainOnTrack"    BOOLEAN;

-- AlterTable: GarticChainStep — add per-step rating
ALTER TABLE "gartic_chain_steps"
  ADD COLUMN "rating" TEXT;

-- CreateTable: gartic_meetings
CREATE TABLE "gartic_meetings" (
    "id"           TEXT         NOT NULL,
    "garticGameId" TEXT         NOT NULL,
    "callerId"     TEXT         NOT NULL,
    "calledAtStep" INTEGER      NOT NULL,
    "outcome"      TEXT,
    "ejectedId"    TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gartic_meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable: gartic_meeting_votes
CREATE TABLE "gartic_meeting_votes" (
    "id"        TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "voterId"   TEXT NOT NULL,
    "suspectId" TEXT,

    CONSTRAINT "gartic_meeting_votes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gartic_meetings_garticGameId_idx" ON "gartic_meetings"("garticGameId");
CREATE INDEX "gartic_meeting_votes_meetingId_idx" ON "gartic_meeting_votes"("meetingId");
CREATE UNIQUE INDEX "gartic_meeting_votes_meetingId_voterId_key" ON "gartic_meeting_votes"("meetingId", "voterId");

-- AddForeignKey
ALTER TABLE "gartic_meetings" ADD CONSTRAINT "gartic_meetings_garticGameId_fkey"
  FOREIGN KEY ("garticGameId") REFERENCES "gartic_games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "gartic_meeting_votes" ADD CONSTRAINT "gartic_meeting_votes_meetingId_fkey"
  FOREIGN KEY ("meetingId") REFERENCES "gartic_meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
