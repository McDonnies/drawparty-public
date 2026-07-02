// Mirror of drawparty-backend/src/types/game.ts — keep in sync.

// ============================================================
// ROOM
// ============================================================

export type GameMode = "GARTIC_PHONE" | "SKRIBBL";
export type RoomStatus = "WAITING" | "PLAYING" | "FINISHED";
export type RoomPlayerStatus = "CONNECTED" | "DISCONNECTED" | "KICKED";

export type RoomPlayerDTO = {
  id: string;
  userId: string;
  clerkId: string;
  username: string;
  avatarUrl: string | null;
  isHost: boolean;
  isBot: boolean;
  score: number;
  status: RoomPlayerStatus;
};

export type LobbySettings = {
  roundCount: number;
  timePerRound: number;
  maxPlayers: number;
  wordCategories: string[];
  customWords: string[];
  withAI?: boolean;
  wordLanguage?: string;     // "en" | "fr" | "de"; Skribbl word language
  aiJudgeMode?: boolean;
  aiDrawTime?: number;       // seconds; shared canvas total time, default 20
  aiDrawTimePerTurn?: number; // seconds per player turn, default 20
  aiDrawMode?: "turn" | "shared"; // default "turn"
  aiLives?: number;          // default 3
  aiWordCategory?: string;   // empty = all categories
  aiHintLetters?: number;    // random letters revealed to AI (0-3); default 0
};

export type RoomDTO = {
  id: string;
  code: string;
  gameMode: GameMode;
  status: RoomStatus;
  hostId: string;
  maxPlayers: number;
  settings: LobbySettings;
  players: RoomPlayerDTO[];
  createdAt: string;
};

// ============================================================
// GARTIC PHONE
// ============================================================

export type GarticPhase = "PROMPT" | "DRAW" | "DESCRIBE" | "REWIND" | "FINISHED";
export type GarticStepType = "PROMPT" | "DRAW" | "DESCRIBE";
export type StepRating = "GREEN" | "YELLOW" | "RED";

export type GarticChainStepDTO = {
  stepIndex: number;
  type: GarticStepType;
  authorId: string;
  authorUsername: string;
  content: string | null;
  imageBase64: string | null;
  strokeData: string | null;
  rating: StepRating | null; // author's rating of what they received; null for step 0
};

export type GarticChainDTO = {
  chainId: string;
  ownerId: string;
  ownerUsername: string;
  orderIndex: number;
  steps: GarticChainStepDTO[];
};

export type GarticPlayerResultDTO = {
  clerkId: string;
  username: string;
  avatarUrl: string | null;
  rank: number;
  promptsWritten: number;
  drawingsSubmitted: number;
  descriptionsWritten: number;
};

export type GarticResultDTO = {
  chains: GarticChainDTO[];
  playerResults: GarticPlayerResultDTO[];
};

// ============================================================
// CANVAS
// ============================================================

export type FabricStroke = {
  type: "path" | "clear" | "undo" | "preview" | "preview_end";
  path?: string;
  color?: string;
  width?: number;
};

export type SkribblChatDTO = {
  clerkId: string;
  username: string;
  avatarUrl: string | null;
  message: string;
  sentAt: string;
};

// ============================================================
// LOBBY CHAT
// ============================================================

export type ChatMessageDTO = {
  id: string;
  senderId: string;
  senderUsername: string;
  senderAvatarUrl: string | null;
  message: string;
  sentAt: string;
};

// ============================================================
// SKRIBBL
// ============================================================

export type SkribblPhase = "WAITING" | "PICKING_WORD" | "DRAWING" | "ROUND_END" | "FINISHED";

export type SkribblRoundDTO = {
  roundNumber: number;
  drawerClerkId: string;
  word: string | null;
  hint: string;
  wordLength: number;
  category: string | null;
  imageUrl: string | null;
  timeLeft: number;
};

export type SkribblGuessDTO = {
  clerkId: string;
  username: string;
  avatarUrl: string | null;
  guess: string | null;
  isCorrect: boolean;
  isClose: boolean;
  pointsAwarded: number;
  guessedAt: string;
  isAI?: boolean;
};

export type SkribblPhasePayload = {
  phase: SkribblPhase;
  round: SkribblRoundDTO | null;
  players: RoomPlayerDTO[];
  words: string[] | null;
  timeLimit: number;
  roundCount: number;
};

export type SkribblPlayerResultDTO = {
  clerkId: string;
  username: string;
  avatarUrl: string | null;
  rank: number;
  totalScore: number;
  correctGuesses: number;
  timesDrawn: number;
};

export type SkribblRoundSummaryDTO = {
  roundNumber: number;
  drawerClerkId: string;
  drawerUsername: string;
  word: string;
  imageUrl: string | null;
  correctGuessCount: number;
};

export type SkribblResultDTO = {
  results: SkribblPlayerResultDTO[];
  totalRounds: number;
  winnerClerkId: string | null;
  rounds: SkribblRoundSummaryDTO[];
};

// ============================================================
// GARTIC AI
// ============================================================

export type GarticAIPhase = "REVEALING" | "DRAWING" | "JUDGING" | "RESULT" | "GAME_OVER";

export type GarticAIRoundStartDTO = {
  word: string;
  wordLength: number;
  letterHint: string;     // e.g. "_ P _ _ E" — positions revealed to AI
  roundIndex: number;
  lives: number;
  score: number;
  revealDuration: number; // ms to show word before drawing starts
};

export type GarticAIDrawingStartDTO = {
  durationMs: number;
};

export type GarticAITurnStartDTO = {
  playerId: string;
  turnIndex: number;
  totalTurns: number;
  durationMs: number;
};

export type GarticAITurnEndDTO = {
  playerId: string;
  turnIndex: number;
};

export type GarticAIRoundResultDTO = {
  success: boolean;
  aiGuess: string;
  word: string;
  lives: number;
  score: number;
};

export type GarticAIGameOverDTO = {
  finalScore: number;
  rounds: Array<{ word: string; success: boolean; aiGuess: string; canvas?: string }>;
};
