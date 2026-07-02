// DrawParty — useFriends Hook Tests
// Tests the FriendsContext (which useFriends re-exports as useFriendsContext).
// Covers optimistic updates + socket subscriptions.
// Uses renderHook() from @testing-library/react.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";

// ── Use vi.hoisted so variables are available inside vi.mock factories ────────
const { mockSocket, socketListeners } = vi.hoisted(() => {
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
  };
  return { mockSocket, socketListeners };
});

vi.mock("@/lib/socket", () => ({ socket: mockSocket }));

const mockGetFriends = vi.fn().mockResolvedValue([]);
const mockGetPending = vi.fn().mockResolvedValue([]);
const mockSendRequest = vi.fn().mockResolvedValue(undefined);
const mockAcceptRequest = vi.fn().mockResolvedValue(undefined);
const mockDeclineRequest = vi.fn().mockResolvedValue(undefined);
const mockRemoveFriend = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/api", () => ({
  getFriends: (...args: unknown[]) => mockGetFriends(...args),
  getPendingRequests: (...args: unknown[]) => mockGetPending(...args),
  searchUsers: vi.fn().mockResolvedValue([]),
  sendFriendRequest: (...args: unknown[]) => mockSendRequest(...args),
  acceptFriendRequest: (...args: unknown[]) => mockAcceptRequest(...args),
  declineFriendRequest: (...args: unknown[]) => mockDeclineRequest(...args),
  removeFriend: (...args: unknown[]) => mockRemoveFriend(...args),
}));

const mockGetToken = vi.fn().mockResolvedValue("tok");
vi.mock("@clerk/nextjs", () => ({
  useAuth: vi.fn(() => ({ getToken: mockGetToken, isSignedIn: true })),
}));

vi.mock("@/context/NotificationContext", () => ({
  useNotifications: vi.fn(() => ({ addNotification: vi.fn() })),
}));

import { FriendsProvider, useFriendsContext } from "@/context/FriendsContext";

// Helper: fire a socket event
function emitSocket(event: string, payload: unknown) {
  (socketListeners[event] ?? []).forEach((cb) => cb(payload));
}

// Wrapper that provides FriendsProvider (also needs NotificationProvider-like deps — already mocked)
const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(FriendsProvider, null, children);

beforeEach(() => {
  vi.clearAllMocks();
  Object.keys(socketListeners).forEach((k) => delete socketListeners[k]);
  mockGetFriends.mockResolvedValue([]);
  mockGetPending.mockResolvedValue([]);
  // Re-attach listeners tracking after clearAllMocks
  mockSocket.on.mockImplementation((event: string, cb: (...args: unknown[]) => void) => {
    if (!socketListeners[event]) socketListeners[event] = [];
    socketListeners[event].push(cb);
  });
  mockSocket.off.mockImplementation((event: string, cb: (...args: unknown[]) => void) => {
    if (socketListeners[event]) {
      socketListeners[event] = socketListeners[event].filter((l) => l !== cb);
    }
  });
});

describe("initial load", () => {
  it("fetches friends and pendingRequests on mount", async () => {
    const fakeFriends = [{ id: "f1", clerkId: "c1", username: "alice", avatarUrl: null, status: "online" }];
    const fakePending = [{ requestId: "r1", sender: { id: "s1", clerkId: "cs1", username: "bob", avatarUrl: null }, createdAt: "" }];
    mockGetFriends.mockResolvedValue(fakeFriends);
    mockGetPending.mockResolvedValue(fakePending);

    const { result } = renderHook(() => useFriendsContext(), { wrapper });

    await vi.waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGetFriends).toHaveBeenCalled();
    expect(mockGetPending).toHaveBeenCalled();
    expect(result.current.friends).toEqual(fakeFriends);
    expect(result.current.pendingRequests).toEqual(fakePending);
  });

  it("sets isLoading=true then false after fetch resolves", async () => {
    const { result } = renderHook(() => useFriendsContext(), { wrapper });
    expect(result.current.isLoading).toBe(true);
    await vi.waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });
});

describe("sendRequest (optimistic)", () => {
  it("optimistically adds to pendingOutgoing — calls API with targetClerkId", async () => {
    const { result } = renderHook(() => useFriendsContext(), { wrapper });
    await vi.waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.sendFriendRequest("target_clerk");
    });

    expect(mockSendRequest).toHaveBeenCalledWith(mockGetToken, "target_clerk");
  });

  it("rolls back on API failure (propagates error)", async () => {
    mockSendRequest.mockRejectedValue(new Error("Conflict"));
    const { result } = renderHook(() => useFriendsContext(), { wrapper });
    await vi.waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await expect(result.current.sendFriendRequest("target_bad")).rejects.toThrow("Conflict");
    });
  });
});

describe("acceptRequest (optimistic)", () => {
  it("moves request to friends list optimistically", async () => {
    const pending = { requestId: "req1", sender: { id: "s1", clerkId: "c1", username: "bob", avatarUrl: null }, createdAt: "" };
    mockGetPending.mockResolvedValue([pending]);
    mockAcceptRequest.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

    const { result } = renderHook(() => useFriendsContext(), { wrapper });
    await vi.waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.pendingRequests).toHaveLength(1);

    act(() => {
      result.current.acceptRequest("req1");
    });

    expect(result.current.pendingRequests).toHaveLength(0);
    expect(result.current.friends.some((f) => f.clerkId === "c1")).toBe(true);
  });

  it("rolls back on API failure", async () => {
    const pending = { requestId: "req2", sender: { id: "s2", clerkId: "c2", username: "carol", avatarUrl: null }, createdAt: "" };
    mockGetPending.mockResolvedValue([pending]);
    mockAcceptRequest.mockRejectedValue(new Error("Server error"));

    const { result } = renderHook(() => useFriendsContext(), { wrapper });
    await vi.waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await expect(result.current.acceptRequest("req2")).rejects.toThrow("Server error");
    });

    await vi.waitFor(() => {
      expect(result.current.pendingRequests).toHaveLength(1);
    });
    expect(result.current.friends.some((f) => f.clerkId === "c2")).toBe(false);
  });
});

describe("socket subscriptions", () => {
  it("registers socket listeners on mount", async () => {
    renderHook(() => useFriendsContext(), { wrapper });
    await vi.waitFor(() => {
      expect(mockSocket.on).toHaveBeenCalledWith("friend:status_changed", expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith("friend:request_received", expect.any(Function));
    });
  });

  it("unregisters listeners on unmount", async () => {
    const { unmount } = renderHook(() => useFriendsContext(), { wrapper });
    await vi.waitFor(() => expect(mockSocket.on).toHaveBeenCalled());

    unmount();
    expect(mockSocket.off).toHaveBeenCalledWith("friend:status_changed", expect.any(Function));
    expect(mockSocket.off).toHaveBeenCalledWith("friend:request_received", expect.any(Function));
  });

  it("friend:request_received adds to pendingRequests", async () => {
    const { result } = renderHook(() => useFriendsContext(), { wrapper });
    await vi.waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.pendingRequests).toHaveLength(0);

    act(() => {
      emitSocket("friend:request_received", {
        requestId: "newReq1",
        from: { clerkId: "c_new", username: "dave", avatarUrl: null },
      });
    });

    expect(result.current.pendingRequests).toHaveLength(1);
    expect(result.current.pendingRequests[0].requestId).toBe("newReq1");
  });
});
