// DrawParty — socketAuth Middleware Unit Tests
// Tests src/socket/middleware/socketAuth.ts — Socket.io auth middleware.
// @clerk/backend is mocked to control verifyToken responses.

import { describe, it, vi, beforeEach } from "vitest";

vi.mock("@clerk/backend", () => ({
  createClerkClient: vi.fn().mockReturnValue({
    verifyToken: vi.fn(),
  }),
}));

beforeEach(() => vi.clearAllMocks());

describe("socketAuth middleware", () => {
  // TODO: calls next() and sets socket.data.clerkId on valid JWT in socket.handshake.auth.token
  // TODO: calls next(error) when token is missing
  // TODO: calls next(error) when verifyToken throws
  // TODO: allows guest connections when token is absent and guest mode is enabled
  // TODO: attaches displayName from socket.handshake.auth.displayName if provided
  it.todo("authenticates valid JWT and sets clerkId on socket.data");
  it.todo("rejects connection when token missing");
  it.todo("rejects connection on verifyToken failure");
  it.todo("allows guest connection (sets clerkId to guest_* id)");
  it.todo("attaches displayName from auth payload");
});
