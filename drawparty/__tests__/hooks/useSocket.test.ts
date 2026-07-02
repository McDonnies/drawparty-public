// DrawParty — useSocket Hook Tests
// Tests hooks/useSocket.ts — socket singleton access + JWT injection.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

// Use vi.hoisted to define variables that vi.mock factory can reference
const { mockSocket, mockGetToken } = vi.hoisted(() => {
  const mockSocket = {
    auth: {} as Record<string, unknown>,
    connect: vi.fn(),
    connected: false,
    on: vi.fn(),
    off: vi.fn(),
  };
  const mockGetToken = vi.fn().mockResolvedValue("tok");
  return { mockSocket, mockGetToken };
});

vi.mock("@/lib/socket", () => ({ socket: mockSocket }));
vi.mock("sonner", () => ({ toast: { warning: vi.fn(), success: vi.fn(), dismiss: vi.fn() } }));
vi.mock("@clerk/nextjs", () => ({
  useAuth: vi.fn(() => ({ getToken: mockGetToken, isLoaded: true })),
  useUser: vi.fn(() => ({ user: { username: "alice" } })),
}));

import { useAuth, useUser } from "@clerk/nextjs";
import { useSocket } from "@/hooks/useSocket";

beforeEach(() => {
  vi.clearAllMocks();
  mockSocket.auth = {};
  mockSocket.connected = false;
  (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ getToken: mockGetToken, isLoaded: true });
  (useUser as ReturnType<typeof vi.fn>).mockReturnValue({ user: { username: "alice" } });
  mockGetToken.mockResolvedValue("tok");
});

describe("useSocket", () => {
  it("returns socket singleton", () => {
    const { result } = renderHook(() => useSocket());
    expect(result.current.socket).toBe(mockSocket);
  });

  it("injects JWT token into socket.auth", async () => {
    renderHook(() => useSocket());
    await vi.waitFor(() => {
      expect(mockGetToken).toHaveBeenCalled();
    });
    await vi.waitFor(() => {
      expect(mockSocket.auth).toMatchObject({ token: "tok" });
    });
  });

  it("calls socket.connect() after injecting auth", async () => {
    renderHook(() => useSocket());
    await vi.waitFor(() => {
      expect(mockSocket.connect).toHaveBeenCalled();
    });
  });

  it("does not inject auth when isLoaded=false", () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ getToken: mockGetToken, isLoaded: false });
    renderHook(() => useSocket());
    expect(mockGetToken).not.toHaveBeenCalled();
    expect(mockSocket.connect).not.toHaveBeenCalled();
  });
});
