// DrawParty — garticAIHandlers Unit Tests  [NEW — added for gartic-ai game mode]
// Tests registerGarticAIHandlers() socket event handlers.
// Handler extraction: mock socket.on(), store by event name, invoke directly.

import { describe, it, vi, beforeEach } from "vitest";
import { mockDeep, mockReset } from "vitest-mock-extended";
import { PrismaClient } from "../../generated/prisma";

const prismaMock = mockDeep<PrismaClient>();
vi.mock("../../config/prisma", () => ({ prisma: prismaMock }));
vi.mock("../../services/garticAIService", () => ({
  handleCanvasSubmit: vi.fn(),
}));

import { registerGarticAIHandlers } from "../../socket/handlers/garticAIHandlers";
import type { AppServer } from "../../socket/index";
import type { Socket } from "socket.io";

beforeEach(() => mockReset(prismaMock));

// ── gartic_ai:submit_canvas ────────────────────────────────────────────────────
describe("gartic_ai:submit_canvas handler", () => {
  // TODO: calls garticAIService.handleCanvasSubmit with roomId and canvasBase64
  // TODO: is idempotent (service handles duplicate submits)
  // TODO: wraps call in try/catch, does not crash on service error
  it.todo("calls handleCanvasSubmit with correct args");
  it.todo("handles service errors gracefully");
});

// ── gartic_ai:stroke ───────────────────────────────────────────────────────────
describe("gartic_ai:stroke handler", () => {
  // TODO: relays strokeData to all sockets in the room EXCEPT the sender
  // TODO: wraps relay in try/catch
  it.todo("relays strokeData to room (socket.to broadcast)");
  it.todo("handles relay errors gracefully");
});
