"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useSocket } from "@/hooks/useSocket";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useSound } from "@/hooks/useSound";
import type {
  RoomDTO,
  RoomPlayerDTO,
  LobbySettings,
  ChatMessageDTO,
  GameMode,
} from "@/types/game";

// ── Mock data — used when socket isn't connected (backend not running) ───────

const MOCK_PLAYERS: RoomPlayerDTO[] = [
  {
    id: "m1", userId: "u1", clerkId: "mock-host", username: "HostPlayer",
    avatarUrl: null, isHost: true, isBot: false, score: 0, status: "CONNECTED",
  },
  {
    id: "m2", userId: "u2", clerkId: "mock-p2", username: "GuestPlayer",
    avatarUrl: null, isHost: false, isBot: false, score: 0, status: "CONNECTED",
  },
  {
    id: "m3", userId: "u3", clerkId: "mock-p3", username: "Adam",
    avatarUrl: null, isHost: false, isBot: false, score: 0, status: "DISCONNECTED",
  },
];

const MOCK_ROOM: RoomDTO = {
  id: "mock-room-id",
  code: "A8X2KL",
  gameMode: "GARTIC_PHONE",
  status: "WAITING",
  hostId: "mock-host",
  maxPlayers: 8,
  settings: { roundCount: 3, timePerRound: 60, maxPlayers: 8, wordCategories: [], customWords: [] },
  players: MOCK_PLAYERS,
  createdAt: new Date().toISOString(),
};

// ── Return type ──────────────────────────────────────────────────────────────

export type UseRoomReturn = {
  room: RoomDTO | null;
  players: RoomPlayerDTO[];
  isHost: boolean;
  settings: LobbySettings;
  chatMessages: ChatMessageDTO[];
  isLoading: boolean;
};

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Subscribes to room socket events and maintains synchronized room state.
 *
 * @param roomId - The room's internal ID (from URL params)
 * @returns room state object (see UseRoomReturn)
 */
export function useRoom(roomId: string): UseRoomReturn {
  const router = useRouter();
  const currentUserId = useCurrentUserId();
  const { socket, isConnected } = useSocket();
  const { play } = useSound();

  // room — full RoomDTO received via "room:joined"; null until socket confirms join
  const [room, setRoom] = useState<RoomDTO | null>(null);

  // gameModeRef — tracks the latest gameMode without adding room to handleGameStarted deps
  const gameModeRef = useRef<GameMode>("GARTIC_PHONE");
  const aiJudgeModeRef = useRef<boolean>(false);
  // hasRealData — prevents mock fallback from replacing data already received from server
  const hasRealDataRef = useRef<boolean>(false);

  // players — live player list; updated by join/leave/kick socket events
  const [players, setPlayers] = useState<RoomPlayerDTO[]>([]);

  // settings — current lobby settings; updated by "room:settings_updated"
  const [settings, setSettings] = useState<LobbySettings>({ roundCount: 3, timePerRound: 60, maxPlayers: 8, wordCategories: [], customWords: [] });

  // chatMessages — lobby chat history; appended by "lobby:message"
  const [chatMessages, setChatMessages] = useState<ChatMessageDTO[]>([]);

  // isLoading — true until the first "room:joined" event is received
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // ── Socket event handlers (stable refs) ──────────────────────────────────

  const handleJoined = useCallback((data: RoomDTO): void => {
    hasRealDataRef.current = true;
    setRoom(data);
    setPlayers(data.players);
    setSettings(data.settings);
    setIsLoading(false);
    gameModeRef.current = data.gameMode;
    aiJudgeModeRef.current = data.settings.aiJudgeMode ?? false;
  }, []);

  const handlePlayerJoined = useCallback((player: RoomPlayerDTO): void => {
    setPlayers((prev) => {
      if (prev.some((p) => p.id === player.id)) return prev;
      return [...prev, player];
    });
    if (player.clerkId !== currentUserId) play("joined_lobby_or_game");
  }, [currentUserId, play]);

  const handlePlayerLeft = useCallback(({ playerId }: { playerId: string }): void => {
    setPlayers((prev) => prev.filter((p) => p.clerkId !== playerId));
    if (playerId !== currentUserId) play("leave_lobby_or_game");
  }, [currentUserId, play]);

  const handleSettingsUpdated = useCallback((partial: Partial<LobbySettings>): void => {
    setSettings((prev) => ({ ...prev, ...partial }));
    if (partial.aiJudgeMode !== undefined) aiJudgeModeRef.current = partial.aiJudgeMode;
  }, []);

  const handlePlayerKicked = useCallback(
    ({ playerId }: { playerId: string }): void => {
      if (playerId === currentUserId) {
        toast.error("You were kicked from the lobby.");
        router.push("/");
      } else {
        setPlayers((prev) => prev.filter((p) => p.clerkId !== playerId));
      }
    },
    [currentUserId, router]
  );

  const handleGameStarted = useCallback(
    ({ roomId: rid }: { roomId: string }): void => {
      const path =
        gameModeRef.current === "SKRIBBL"
          ? `/skribbl/play/${rid}`
          : aiJudgeModeRef.current
          ? `/gartic-ai/play/${rid}`
          : `/gartic-phone/play/${rid}`;
      router.push(path);
    },
    [router]
  );

  const handleMessage = useCallback((msg: ChatMessageDTO): void => {
    setChatMessages((prev) => [...prev, msg]);
  }, []);

  // ── Effect: subscribe to socket events or fall back to mocks ─────────────

  useEffect(() => {
    // If socket not connected → load mock data after delay (only if no real data yet)
    if (!isConnected) {
      const t = setTimeout((): void => {
        if (hasRealDataRef.current) return;
        // Assign current user as host in mock data for testing
        const mockPlayers = MOCK_PLAYERS.map((p) =>
          p.isHost && currentUserId
            ? { ...p, clerkId: currentUserId, username: "You" }
            : p
        );
        setRoom({ ...MOCK_ROOM, players: mockPlayers });
        setPlayers(mockPlayers);
        setSettings(MOCK_ROOM.settings);
        setIsLoading(false);
      }, 600);
      return (): void => {
        clearTimeout(t);
      };
    }

    // Socket is connected — join room and register listeners
    socket.emit("room:join", { roomId });

    socket.on("room:joined", handleJoined);
    socket.on("room:player_joined", handlePlayerJoined);
    socket.on("room:player_left", handlePlayerLeft);
    socket.on("room:settings_updated", handleSettingsUpdated);
    socket.on("room:player_kicked", handlePlayerKicked);
    socket.on("room:game_started", handleGameStarted);
    socket.on("lobby:message", handleMessage);

    return (): void => {
      socket.off("room:joined", handleJoined);
      socket.off("room:player_joined", handlePlayerJoined);
      socket.off("room:player_left", handlePlayerLeft);
      socket.off("room:settings_updated", handleSettingsUpdated);
      socket.off("room:player_kicked", handlePlayerKicked);
      socket.off("room:game_started", handleGameStarted);
      socket.off("lobby:message", handleMessage);
    };
  }, [
    roomId, isConnected, socket, currentUserId,
    handleJoined, handlePlayerJoined, handlePlayerLeft,
    handleSettingsUpdated, handlePlayerKicked, handleGameStarted, handleMessage,
  ]);

  // isHost — computed from the live players list
  const isHost = players.some((p) => p.clerkId === currentUserId && p.isHost);

  return { room, players, isHost, settings, chatMessages, isLoading };
}
