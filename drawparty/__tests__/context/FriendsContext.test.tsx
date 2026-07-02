// DrawParty — FriendsContext Tests

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import React from "react";

// Mock socket singleton
vi.mock("@/lib/socket", () => ({
  socket: { on: vi.fn(), off: vi.fn() },
}));

// Mock API calls
vi.mock("@/lib/api", () => ({
  getFriends: vi.fn().mockResolvedValue([{ id: "f1", clerkId: "c1", username: "alice", avatarUrl: null, status: "online" }]),
  getPendingRequests: vi.fn().mockResolvedValue([]),
  searchUsers: vi.fn().mockResolvedValue([]),
  sendFriendRequest: vi.fn().mockResolvedValue(undefined),
  acceptFriendRequest: vi.fn().mockResolvedValue(undefined),
  declineFriendRequest: vi.fn().mockResolvedValue(undefined),
  removeFriend: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: vi.fn(() => ({ getToken: vi.fn().mockResolvedValue("tok"), isSignedIn: true })),
}));

vi.mock("@/context/NotificationContext", () => ({
  useNotifications: vi.fn(() => ({ addNotification: vi.fn() })),
}));

import { FriendsProvider, useFriendsContext } from "@/context/FriendsContext";

beforeEach(() => vi.clearAllMocks());

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(FriendsProvider, null, children);

describe("FriendsProvider", () => {
  it("exposes friends from the API via context", async () => {
    const { result } = renderHook(() => useFriendsContext(), { wrapper });

    await vi.waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.friends).toHaveLength(1);
    expect(result.current.friends[0].username).toBe("alice");
  });

  it("exposes sendFriendRequest, acceptRequest, declineRequest, removeFriend functions", async () => {
    const { result } = renderHook(() => useFriendsContext(), { wrapper });
    await vi.waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(typeof result.current.sendFriendRequest).toBe("function");
    expect(typeof result.current.acceptRequest).toBe("function");
    expect(typeof result.current.declineRequest).toBe("function");
    expect(typeof result.current.removeFriend).toBe("function");
  });

  it("useFriendsContext throws outside provider", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useFriendsContext())).toThrow(
      "useFriendsContext must be used inside FriendsProvider"
    );
    consoleError.mockRestore();
  });
});
