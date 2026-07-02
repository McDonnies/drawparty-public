-- CreateTable
CREATE TABLE "gartic_ai_games" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "lives" INTEGER NOT NULL DEFAULT 3,
    "score" INTEGER NOT NULL DEFAULT 0,
    "phase" TEXT NOT NULL DEFAULT 'DRAWING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "gartic_ai_games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gartic_ai_rounds" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "roundIndex" INTEGER NOT NULL,
    "word" TEXT NOT NULL,
    "success" BOOLEAN,
    "aiGuess" TEXT,

    CONSTRAINT "gartic_ai_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gartic_ai_turns" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "turnIndex" INTEGER NOT NULL,
    "strokeData" TEXT,

    CONSTRAINT "gartic_ai_turns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gartic_ai_games_roomId_key" ON "gartic_ai_games"("roomId");

-- CreateIndex
CREATE INDEX "gartic_ai_games_roomId_idx" ON "gartic_ai_games"("roomId");

-- CreateIndex
CREATE INDEX "gartic_ai_rounds_gameId_idx" ON "gartic_ai_rounds"("gameId");

-- CreateIndex
CREATE INDEX "gartic_ai_turns_roundId_idx" ON "gartic_ai_turns"("roundId");

-- AddForeignKey
ALTER TABLE "gartic_ai_games" ADD CONSTRAINT "gartic_ai_games_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gartic_ai_rounds" ADD CONSTRAINT "gartic_ai_rounds_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "gartic_ai_games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gartic_ai_turns" ADD CONSTRAINT "gartic_ai_turns_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "gartic_ai_rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
