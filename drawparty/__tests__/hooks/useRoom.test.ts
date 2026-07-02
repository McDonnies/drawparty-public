// DrawParty — useRoom Hook Tests
// Tests hooks/useRoom.ts — room state + socket event dispatching.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Capture socket event listeners so we can fire them manually
const socketListeners: Record<string, ((...args: unknown[]) => void)[]> = {};
const mockSocket = {
  on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
    if (!socketListeners[event]) socketListeners[event] = [];
    socketListeners[event].push(cb);
  }),
  off: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
    if (socketListeners[event]) {
      socketListeners[event] = socketListeners[event].filter((l) => l !== cb);
    }
  }),
  emit: vi.fn(),
  connected: true,
};

vi.mock("@/lib/socket", () => ({ socket: mockSocket }));
vi.mock("@/lib/api", () => ({ fetchRoom: vi.fn() }));
vi.mock("@clerk/nextjs", () => ({
  useAuth: vi.fn(() => ({ getToken: vi.fn().mockResolvedValue("tok") })),
  useUser: vi.fn(() => ({ user: { id: "user_host" } })),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), warning: vi.fn(), dismiss: vi.fn(), success: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: vi.fn(() => ({ push: vi.fn() })) }));
vi.mock("@/hooks/useCurrentUserId", () => ({ useCurrentUserId: vi.fn(() => "user_host") }));
vi.mock("@/hooks/useSound", () => ({ useSound: vi.fn(() => ({ play: vi.fn() })) }));
vi.mock("@/hooks/useSocket", () => ({
  useSocket: vi.fn(() => ({ socket: mockSocket, isConnected: true })),
}));

import { useRoom } from "@/hooks/useRoom";

// Helper: fire a socket event
function emit(event: string, payload: unknown) {
  (socketListeners[event] ?? []).forEach((cb) => cb(payload));
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.keys(socketListeners).forEach((k) => delete socketListeners[k]);
});

describe("initial load", () => {
  it("emits room:join on mount", () => {
    renderHook(() => useRoom("room1"));
    expect(mockSocket.emit).toHaveBeenCalledWith("room:join", { roomId: "room1" });
  });

  it("isLoading=true initially then false after room:joined", () => {
    const { result } = renderHook(() => useRoom("room1"));
    expect(result.current.isLoading).toBe(true);

    act(() => {
      emit("room:joined", {
        id: "room1",
        code: "ABC",
        gameMode: "GARTIC_PHONE",
        status: "WAITING",
        hostId: "user_host",
        maxPlayers: 8,
        settings: { roundCount: 3, timePerRound: 60, maxPlayers: 8, wordCategories: [], customWords: [] },
        players: [{ id: "p1", userId: "u1", clerkId: "user_host", username: "Host", avatarUrl: null, isHost: true, isBot: false, score: 0, status: "CONNECTED" }],
        createdAt: new Date().toISOString(),
      });
    });

    expect(result.current.isLoading).toBe(false);
  });

  it("derives isHost correctly", () => {
    const { result } = renderHook(() => useRoom("room1"));

    act(() => {
      emit("room:joined", {
        id: "room1",
        code: "ABC",
        gameMode: "GARTIC_PHONE",
        status: "WAITING",
        hostId: "user_host",
        maxPlayers: 8,
        settings: { roundCount: 3, timePerRound: 60, maxPlayers: 8, wordCategories: [], customWords: [] },
        players: [
          { id: "p1", userId: "u1", clerkId: "user_host", username: "Host", avatarUrl: null, isHost: true, isBot: false, score: 0, status: "CONNECTED" },
        ],
        createdAt: new Date().toISOString(),
      });
    });

    expect(result.current.isHost).toBe(true);
  });
});

describe("socket event handlers", () => {
  function setupRoom() {
    const hook = renderHook(() => useRoom("room1"));
    act(() => {
      emit("room:joined", {
        id: "room1",
        code: "ABC",
        gameMode: "GARTIC_PHONE",
        status: "WAITING",
        hostId: "user_host",
        maxPlayers: 8,
        settings: { roundCount: 3, timePerRound: 60, maxPlayers: 8, wordCategories: [], customWords: [] },
        players: [{ id: "p1", userId: "u1", clerkId: "user_host", username: "Host", avatarUrl: null, isHost: true, isBot: false, score: 0, status: "CONNECTED" }],
        createdAt: new Date().toISOString(),
      });
    });
    return hook;
  }

  it("handles room:player_joined — appends new player", () => {
    const { result } = setupRoom();
    expect(result.current.players).toHaveLength(1);

    act(() => {
      emit("room:player_joined", {
        id: "p2", userId: "u2", clerkId: "user_guest", username: "Guest",
        avatarUrl: null, isHost: false, isBot: false, score: 0, status: "CONNECTED",
      });
    });

    expect(result.current.players).toHaveLength(2);
    expect(result.current.players[1].username).toBe("Guest");
  });

  it("handles room:player_joined — does not duplicate existing player", () => {
    const { result } = setupRoom();
    act(() => {
      emit("room:player_joined", {
        id: "p1", userId: "u1", clerkId: "user_host", username: "Host",
        avatarUrl: null, isHost: true, isBot: false, score: 0, status: "CONNECTED",
      });
    });
    expect(result.current.players).toHaveLength(1);
  });

  it("handles room:player_left — removes the player", () => {
    const { result } = setupRoom();
    act(() => {
      emit("room:player_joined", {
        id: "p2", userId: "u2", clerkId: "user_guest", username: "Guest",
        avatarUrl: null, isHost: false, isBot: false, score: 0, status: "CONNECTED",
      });
    });
    expect(result.current.players).toHaveLength(2);

    act(() => {
      emit("room:player_left", { playerId: "user_guest" });
    });

    expect(result.current.players).toHaveLength(1);
  });

  it("handles room:settings_updated — merges settings", () => {
    const { result } = setupRoom();
    expect(result.current.settings.roundCount).toBe(3);

    act(() => {
      emit("room:settings_updated", { roundCount: 5 });
    });

    expect(result.current.settings.roundCount).toBe(5);
    // Other settings preserved
    expect(result.current.settings.timePerRound).toBe(60);
  });

  it("appends lobby:message to chatMessages", () => {
    const { result } = setupRoom();
    expect(result.current.chatMessages).toHaveLength(0);

    act(() => {
      emit("lobby:message", { id: "msg1", userId: "u1", username: "Host", message: "Hello!", createdAt: new Date().toISOString() });
    });

    expect(result.current.chatMessages).toHaveLength(1);
    expect(result.current.chatMessages[0].message).toBe("Hello!");
  });
});

describe("cleanup", () => {
  it("unregisters socket listeners on unmount", () => {
    const { unmount } = renderHook(() => useRoom("room1"));
    unmount();
    expect(mockSocket.off).toHaveBeenCalledWith("room:joined", expect.any(Function));
    expect(mockSocket.off).toHaveBeenCalledWith("room:player_joined", expect.any(Function));
    expect(mockSocket.off).toHaveBeenCalledWith("room:player_left", expect.any(Function));
    expect(mockSocket.off).toHaveBeenCalledWith("room:settings_updated", expect.any(Function));
    expect(mockSocket.off).toHaveBeenCalledWith("lobby:message", expect.any(Function));
  });
});
