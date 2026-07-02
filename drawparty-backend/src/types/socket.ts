// Mirror of drawparty/types/socket.ts — keep in sync.

import type {
  RoomDTO,
  RoomPlayerDTO,
  LobbySettings,
  GarticPhase,
  GarticChainDTO,
  GarticResultDTO,
  ChatMessageDTO,
  FabricStroke,
  SkribblResultDTO,
  SkribblPhasePayload,
  SkribblGuessDTO,
  StepRating,
  GarticAIRoundStartDTO,
  GarticAIDrawingStartDTO,
  GarticAITurnStartDTO,
  GarticAITurnEndDTO,
  GarticAIRoundResultDTO,
  GarticAIGameOverDTO,
} from "./game";

export type UserStatus = "online" | "away" | "in-game" | "offline";

// ============================================================
// CLIENT → SERVER
// ============================================================

export interface ClientToServerEvents {
  "room:join": (payload: { roomId: string }) => void;
  "room:leave": (payload: { roomId: string }) => void;
  "room:update_settings": (payload: Partial<LobbySettings & { withAI?: boolean; aiJudgeMode?: boolean }>) => void;
  "room:kick_player": (payload: { targetId: string }) => void;
  "room:start_game": (payload: Record<string, never>) => void;
  "room:invite_friend": (payload: { roomId: string; targetId: string }) => void;

  // Gartic Phone — standard
  "gartic:submit_prompt": (payload: { roomId: string; prompt: string }) => void;
  "gartic:submit_drawing": (payload: { roomId: string; imageBase64: string; strokeData?: string; rating?: StepRating }) => void;
  "gartic:submit_description": (payload: { roomId: string; description: string; rating?: StepRating }) => void;
  "gartic:rewind_next": (payload: { roomId: string }) => void;
  "gartic:end_rewind": (payload: { roomId: string }) => void;
  "gartic:stroke": (payload: { roomId: string; strokeData: FabricStroke }) => void;

  "skribbl:choose_word": (payload: { roomId: string; wordIndex: number }) => void;
  "skribbl:submit_guess": (payload: { roomId: string; guess: string }) => void;
  "skribbl:stroke": (payload: { roomId: string; stroke: FabricStroke }) => void;
  "skribbl:canvas_snapshot": (payload: { roomId: string; imageBase64: string }) => void;
  "skribbl:chat_message": (payload: { roomId: string; message: string }) => void;

  "room:new_game": (payload: { roomId: string }) => void;
  "lobby:chat_message": (payload: { roomId: string; message: string }) => void;

  // Gartic AI
  "gartic_ai:stroke": (payload: { roomId: string; strokeData: FabricStroke }) => void;
  "gartic_ai:submit_canvas": (payload: { roomId: string; canvasBase64: string }) => void;
}

// ============================================================
// SERVER → CLIENT
// ============================================================

export interface ServerToClientEvents {
  "room:joined": (payload: RoomDTO) => void;
  "room:player_joined": (payload: RoomPlayerDTO) => void;
  "room:player_left": (payload: { playerId: string }) => void;
  "room:settings_updated": (payload: Partial<LobbySettings>) => void;
  "room:player_kicked": (payload: { playerId: string }) => void;
  "room:game_started": (payload: { roomId: string }) => void;

  // Gartic Phone — standard
  "gartic:phase_changed": (payload: {
    phase: GarticPhase;
    prompt?: string;
    imageBase64?: string;
    timeLimit: number;
  }) => void;
  "gartic:player_done": (payload: { playerId: string }) => void;
  "gartic:stroke_received": (payload: FabricStroke) => void;
  "gartic:rewind_data": (payload: {
    chains: GarticChainDTO[];
  }) => void;
  "gartic:rewind_next": () => void;
  "gartic:game_ended": (payload: { roomId: string; results: GarticResultDTO }) => void;

  "skribbl:phase_changed": (payload: SkribblPhasePayload) => void;
  "skribbl:hint_updated": (payload: { hint: string }) => void;
  "skribbl:guess_result": (payload: { guess: SkribblGuessDTO }) => void;
  "skribbl:stroke_received": (payload: { stroke: FabricStroke; drawerClerkId: string }) => void;
  "skribbl:game_ended": (payload: { roomId: string; result: SkribblResultDTO }) => void;
  "skribbl:request_canvas_snapshot": (payload: { roomId: string; drawerClerkId: string }) => void;
  "skribbl:chat_received": (payload: { clerkId: string; username: string; avatarUrl: string | null; message: string; sentAt: string }) => void;

  "room:new_game_started": (payload: { newRoomId: string }) => void;
  "lobby:message": (payload: ChatMessageDTO) => void;

  "friend:status_changed": (payload: { clerkId: string; status: UserStatus }) => void;
  "friend:request_received": (payload: {
    requestId: string;
    from: { clerkId: string; username: string; avatarUrl: string | null };
  }) => void;
  "room:invite_received": (payload: {
    roomId: string; roomCode: string; fromId: string;
    fromUsername: string; gameMode: "GARTIC_PHONE" | "SKRIBBL";
  }) => void;
  "friend:removed": (payload: { removedBy: string }) => void;
  "friend:request_accepted": (payload: {
    friend: { id: string; clerkId: string; username: string; avatarUrl: string | null };
  }) => void;

  // Gartic AI
  "gartic_ai:round_start":    (payload: GarticAIRoundStartDTO) => void;
  "gartic_ai:drawing_start":  (payload: GarticAIDrawingStartDTO) => void;
  "gartic_ai:turn_start":     (payload: GarticAITurnStartDTO) => void;
  "gartic_ai:turn_end":       (payload: GarticAITurnEndDTO) => void;
  "gartic_ai:time_up":        () => void;
  "gartic_ai:stroke_received":(payload: FabricStroke) => void;
  "gartic_ai:judging":        () => void;
  "gartic_ai:round_result":   (payload: GarticAIRoundResultDTO) => void;
  "gartic_ai:game_over":      (payload: GarticAIGameOverDTO) => void;
}

// ============================================================
// INTER-SERVER + SOCKET DATA
// ============================================================

export type InterServerEvents = Record<string, never>;

export interface SocketData {
  userId: string;
  username: string;
  roomId?: string;
}
