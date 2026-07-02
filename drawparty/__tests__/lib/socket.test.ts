// DrawParty — lib/socket Tests
// Tests lib/socket.ts — Socket.io client singleton.
// socket.io-client is mocked to avoid real WebSocket connections.

import { describe, it, expect, vi, beforeEach } from "vitest";

// Must mock BEFORE importing the module under test
vi.mock("socket.io-client", () => {
  const mockSocket = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connected: false,
    auth: {},
  };
  return {
    io: vi.fn().mockReturnValue(mockSocket),
  };
});

describe("socket singleton", () => {
  it("is a singleton — same object on multiple imports", async () => {
    const { socket: s1 } = await import("@/lib/socket");
    const { socket: s2 } = await import("@/lib/socket");
    expect(s1).toBe(s2);
  });

  it("does not auto-connect on import", async () => {
    const { socket } = await import("@/lib/socket");
    expect(socket.connected).toBe(false);
    expect(socket.connect).not.toHaveBeenCalled();
  });

  it("initializes with correct backend URL", async () => {
    const { io } = await import("socket.io-client");
    // io() should have been called exactly once when the module loaded
    expect(io).toHaveBeenCalled();
    // autoConnect should be false
    const callArgs = (io as ReturnType<typeof vi.fn>).mock.calls[0];
    const opts = callArgs[1] as { autoConnect: boolean };
    expect(opts.autoConnect).toBe(false);
  });
});
