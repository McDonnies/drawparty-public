// DrawParty — authMiddleware Unit Tests
// Tests src/middleware/authMiddleware.ts — Clerk JWT verification.
// @clerk/backend is mocked to control verifyToken responses.

import { describe, it, vi, beforeEach } from "vitest";

vi.mock("@clerk/backend", () => ({
  createClerkClient: vi.fn().mockReturnValue({
    verifyToken: vi.fn(),
  }),
}));

beforeEach(() => vi.clearAllMocks());

describe("requireAuth middleware", () => {
  // TODO: calls next() and attaches req.auth when JWT is valid
  // TODO: returns 401 when Authorization header is missing
  // TODO: returns 401 when Bearer token is invalid / expired
  // TODO: returns 401 when verifyToken throws
  // TODO: attaches userId from the JWT payload to req.auth
  it.todo("calls next() on valid JWT");
  it.todo("returns 401 for missing Authorization header");
  it.todo("returns 401 for invalid/expired token");
  it.todo("attaches userId to req.auth");
});
