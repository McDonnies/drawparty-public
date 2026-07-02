-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "friendships" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "statusId" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "friendships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "friendship_statuses" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT,

    CONSTRAINT "friendship_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "gameModeId" TEXT NOT NULL,
    "statusId" TEXT NOT NULL DEFAULT 'WAITING',
    "hostId" TEXT NOT NULL,
    "maxPlayers" INTEGER NOT NULL DEFAULT 8,
    "roundCount" INTEGER NOT NULL DEFAULT 3,
    "timePerRound" INTEGER NOT NULL DEFAULT 60,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_modes" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "game_modes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_statuses" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "room_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_players" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "isHost" BOOLEAN NOT NULL DEFAULT false,
    "statusId" TEXT NOT NULL DEFAULT 'CONNECTED',
    "score" INTEGER NOT NULL DEFAULT 0,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_player_statuses" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "room_player_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gartic_games" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "totalSteps" INTEGER NOT NULL,
    "phaseId" TEXT NOT NULL DEFAULT 'PROMPT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "gartic_games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gartic_game_phases" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "gartic_game_phases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gartic_chains" (
    "id" TEXT NOT NULL,
    "garticGameId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,

    CONSTRAINT "gartic_chains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gartic_chain_steps" (
    "id" TEXT NOT NULL,
    "chainId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "stepIndex" INTEGER NOT NULL,
    "typeId" TEXT NOT NULL,
    "content" TEXT,
    "drawingUrl" TEXT,
    "strokeData" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gartic_chain_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gartic_step_types" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "gartic_step_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skribbl_games" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "currentRound" INTEGER NOT NULL DEFAULT 1,
    "phaseId" TEXT NOT NULL DEFAULT 'WAITING',
    "wordCategories" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "skribbl_games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skribbl_game_phases" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "skribbl_game_phases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skribbl_rounds" (
    "id" TEXT NOT NULL,
    "skribblGameId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "drawerId" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "hint" TEXT,
    "drawingUrl" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "skribbl_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skribbl_guesses" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "pointsEarned" INTEGER NOT NULL DEFAULT 0,
    "guessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skribbl_guesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skribbl_stats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "totalCorrect" INTEGER NOT NULL DEFAULT 0,
    "totalDrawn" INTEGER NOT NULL DEFAULT 0,
    "bestScore" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skribbl_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gartic_stats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "chainsShared" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gartic_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "words" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "difficultyId" TEXT NOT NULL DEFAULT 'MEDIUM',

    CONSTRAINT "words_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "word_difficulties" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "word_difficulties_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_clerkId_key" ON "users"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_clerkId_idx" ON "users"("clerkId");

-- CreateIndex
CREATE INDEX "friendships_senderId_idx" ON "friendships"("senderId");

-- CreateIndex
CREATE INDEX "friendships_receiverId_idx" ON "friendships"("receiverId");

-- CreateIndex
CREATE INDEX "friendships_statusId_idx" ON "friendships"("statusId");

-- CreateIndex
CREATE UNIQUE INDEX "friendships_senderId_receiverId_key" ON "friendships"("senderId", "receiverId");

-- CreateIndex
CREATE UNIQUE INDEX "friendship_statuses_slug_key" ON "friendship_statuses"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_code_key" ON "rooms"("code");

-- CreateIndex
CREATE INDEX "rooms_code_idx" ON "rooms"("code");

-- CreateIndex
CREATE INDEX "rooms_statusId_idx" ON "rooms"("statusId");

-- CreateIndex
CREATE UNIQUE INDEX "game_modes_slug_key" ON "game_modes"("slug");

-- CreateIndex
CREATE INDEX "room_players_roomId_idx" ON "room_players"("roomId");

-- CreateIndex
CREATE INDEX "room_players_userId_idx" ON "room_players"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "room_players_roomId_userId_key" ON "room_players"("roomId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "gartic_games_roomId_key" ON "gartic_games"("roomId");

-- CreateIndex
CREATE INDEX "gartic_games_roomId_idx" ON "gartic_games"("roomId");

-- CreateIndex
CREATE INDEX "gartic_chains_garticGameId_idx" ON "gartic_chains"("garticGameId");

-- CreateIndex
CREATE INDEX "gartic_chain_steps_chainId_idx" ON "gartic_chain_steps"("chainId");

-- CreateIndex
CREATE INDEX "gartic_chain_steps_authorId_idx" ON "gartic_chain_steps"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "gartic_chain_steps_chainId_stepIndex_key" ON "gartic_chain_steps"("chainId", "stepIndex");

-- CreateIndex
CREATE UNIQUE INDEX "skribbl_games_roomId_key" ON "skribbl_games"("roomId");

-- CreateIndex
CREATE INDEX "skribbl_games_roomId_idx" ON "skribbl_games"("roomId");

-- CreateIndex
CREATE INDEX "skribbl_rounds_skribblGameId_idx" ON "skribbl_rounds"("skribblGameId");

-- CreateIndex
CREATE INDEX "skribbl_guesses_roundId_idx" ON "skribbl_guesses"("roundId");

-- CreateIndex
CREATE INDEX "skribbl_guesses_playerId_idx" ON "skribbl_guesses"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "skribbl_stats_userId_key" ON "skribbl_stats"("userId");

-- CreateIndex
CREATE INDEX "skribbl_stats_userId_idx" ON "skribbl_stats"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "gartic_stats_userId_key" ON "gartic_stats"("userId");

-- CreateIndex
CREATE INDEX "gartic_stats_userId_idx" ON "gartic_stats"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "words_text_key" ON "words"("text");

-- CreateIndex
CREATE INDEX "words_category_idx" ON "words"("category");

-- CreateIndex
CREATE INDEX "words_difficultyId_idx" ON "words"("difficultyId");

-- AddForeignKey
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "friendship_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_gameModeId_fkey" FOREIGN KEY ("gameModeId") REFERENCES "game_modes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "room_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_players" ADD CONSTRAINT "room_players_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "room_player_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_players" ADD CONSTRAINT "room_players_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_players" ADD CONSTRAINT "room_players_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gartic_games" ADD CONSTRAINT "gartic_games_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "gartic_game_phases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gartic_games" ADD CONSTRAINT "gartic_games_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gartic_chains" ADD CONSTRAINT "gartic_chains_garticGameId_fkey" FOREIGN KEY ("garticGameId") REFERENCES "gartic_games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gartic_chain_steps" ADD CONSTRAINT "gartic_chain_steps_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "gartic_step_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gartic_chain_steps" ADD CONSTRAINT "gartic_chain_steps_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "gartic_chains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gartic_chain_steps" ADD CONSTRAINT "gartic_chain_steps_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("clerkId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skribbl_games" ADD CONSTRAINT "skribbl_games_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "skribbl_game_phases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skribbl_games" ADD CONSTRAINT "skribbl_games_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skribbl_rounds" ADD CONSTRAINT "skribbl_rounds_skribblGameId_fkey" FOREIGN KEY ("skribblGameId") REFERENCES "skribbl_games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skribbl_guesses" ADD CONSTRAINT "skribbl_guesses_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "skribbl_rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skribbl_guesses" ADD CONSTRAINT "skribbl_guesses_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "users"("clerkId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skribbl_stats" ADD CONSTRAINT "skribbl_stats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gartic_stats" ADD CONSTRAINT "gartic_stats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "words" ADD CONSTRAINT "words_difficultyId_fkey" FOREIGN KEY ("difficultyId") REFERENCES "word_difficulties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
