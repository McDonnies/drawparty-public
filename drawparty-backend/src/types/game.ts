// Interfaces for service return shapes and socket payloads.
// Frontend mirror: drawparty/types/game.ts — keep in sync.

// ============================================================
// ROOM
// ============================================================

export type GameMode = "GARTIC_PHONE" | "SKRIBBL";
export type RoomStatus = "WAITING" | "PLAYING" | "FINISHED";
export type RoomPlayerStatus = "CONNECTED" | "DISCONNECTED" | "KICKED";

export interface RoomPlayerDTO {
  id: string;
  userId: string;
  clerkId: string;
  username: string;
  avatarUrl: string | null;
  isHost: boolean;
  isBot: boolean;
  score: number;
  status: RoomPlayerStatus;
}

export interface LobbySettings {
  roundCount: number;       // 1–10; default 3
  timePerRound: number;     // seconds; 30–120; default 60
  maxPlayers: number;       // 2–16; default 8
  wordCategories: string[]; // Skribbl-only; empty = all categories
  customWords: string[];    // Skribbl-only; comma-split custom words
  withAI?: boolean;         // Skribbl-only; adds DrawBot AI guesser
  wordLanguage?: string;    // Skribbl-only; "en" | "fr" | "de"; default "en"
  aiJudgeMode?: boolean;       // Gartic-only; relay drawing vs AI judge
  aiDrawTime?: number;         // AI Judge shared mode: total drawing time (s); default 20
  aiDrawTimePerTurn?: number;  // AI Judge turn mode: time per player (s); default 20
  aiDrawMode?: "turn" | "shared"; // AI Judge draw mode; default "turn"
  aiLives?: number;            // AI Judge: number of lives; default 3
  aiWordCategory?: string;     // AI Judge: word category filter; empty = all
  aiHintLetters?: number;      // AI Judge: random letters revealed to AI (0-3); default 0
}

export interface RoomDTO {
  id: string;
  code: string;
  gameMode: GameMode;
  status: RoomStatus;
  hostId: string;        // clerkId of current host
  maxPlayers: number;
  settings: LobbySettings;
  players: RoomPlayerDTO[];
  createdAt: string;     // ISO date string
}

// ============================================================
// GARTIC PHONE
// ============================================================

export type GarticPhase = "PROMPT" | "DRAW" | "DESCRIBE" | "REWIND" | "FINISHED";
export type GarticStepType = "PROMPT" | "DRAW" | "DESCRIBE";
export type StepRating = "GREEN" | "YELLOW" | "RED";

export interface GarticChainStepDTO {
  stepIndex: number;
  type: GarticStepType;
  authorId: string;
  authorUsername: string;
  content: string | null;
  imageBase64: string | null;
  strokeData: string | null;  // JSON FabricStroke[] for DRAW step replay
  rating: StepRating | null;  // author's rating of what they received (null for step 0)
}

export interface GarticChainDTO {
  chainId: string;
  ownerId: string;
  ownerUsername: string;
  orderIndex: number;
  steps: GarticChainStepDTO[];
}

export interface GarticPlayerResultDTO {
  clerkId: string;
  username: string;
  avatarUrl: string | null;
  rank: number;
  promptsWritten: number;
  drawingsSubmitted: number;
  descriptionsWritten: number;
}

export interface GarticResultDTO {
  chains: GarticChainDTO[];
  playerResults: GarticPlayerResultDTO[];
}

// ============================================================
// CANVAS
// ============================================================

export interface FabricStroke {
  type: "path" | "clear" | "undo";
  path?: string;
  color?: string;
  width?: number;
}

// ============================================================
// LOBBY CHAT
// ============================================================

export interface ChatMessageDTO {
  id: string;
  senderId: string;
  senderUsername: string;
  senderAvatarUrl: string | null;
  message: string;
  sentAt: string;
}

// ============================================================
// SERVICE PARAMS
// ============================================================

export interface CreateRoomParams {
  hostClerkId: string;
  gameMode: GameMode;
  maxPlayers?: number;
  roundCount?: number;
  timePerRound?: number;
  guestName?: string;
}

export interface JoinRoomParams {
  code: string;
  clerkId: string;
  guestName?: string;
}

export interface UpdateSettingsParams {
  roomId: string;
  hostClerkId: string;
  settings: Partial<LobbySettings>;
}

// ============================================================
// SKRIBBL
// ============================================================

export type SkribblPhase =
  | "WAITING"
  | "PICKING_WORD"
  | "DRAWING"
  | "ROUND_END"
  | "FINISHED";

export interface SkribblRoundDTO {
  roundNumber: number;
  drawerClerkId: string;
  word: string | null;
  hint: string;
  wordLength: number;
  category: string | null;
  imageUrl: string | null;
  timeLeft: number;
}

export interface SkribblGuessDTO {
  clerkId: string;
  username: string;
  avatarUrl: string | null;
  guess: string | null;
  isCorrect: boolean;
  isClose: boolean;
  pointsAwarded: number;
  guessedAt: string;
  isAI?: boolean;
}

export interface SkribblPhasePayload {
  phase: SkribblPhase;
  round: SkribblRoundDTO | null;
  players: RoomPlayerDTO[];
  words: string[] | null;
  timeLimit: number;
  roundCount: number;
}

export interface SkribblPlayerResultDTO {
  clerkId: string;
  username: string;
  avatarUrl: string | null;
  rank: number;
  totalScore: number;
  correctGuesses: number;
  timesDrawn: number;
}

export interface SkribblRoundSummaryDTO {
  roundNumber: number;
  drawerClerkId: string;
  drawerUsername: string;
  word: string;
  imageUrl: string | null;
  correctGuessCount: number;
}

// ============================================================
// GARTIC AI
// ============================================================
// GARTIC AI

export type GarticAIPhase = "REVEALING" | "DRAWING" | "JUDGING" | "RESULT" | "GAME_OVER";

export interface GarticAIRoundStartDTO {
  word: string;
  wordLength: number;
  letterHint: string;
  roundIndex: number;
  lives: number;
  score: number;
  revealDuration: number; // ms to show word before drawing starts
}

export interface GarticAIDrawingStartDTO {
  durationMs: number;
}

export interface GarticAITurnStartDTO {
  playerId: string;
  turnIndex: number;
  totalTurns: number;
  durationMs: number;
}

export interface GarticAITurnEndDTO {
  playerId: string;
  turnIndex: number;
}

export interface GarticAIRoundResultDTO {
  success: boolean;
  aiGuess: string;
  word: string;
  lives: number;
  score: number;
}

export interface GarticAIGameOverDTO {
  finalScore: number;
  rounds: Array<{ word: string; success: boolean; aiGuess: string; canvas?: string }>;
}

export interface SkribblResultDTO {
  results: SkribblPlayerResultDTO[];
  totalRounds: number;
  winnerClerkId: string | null;
  rounds: SkribblRoundSummaryDTO[];
}
