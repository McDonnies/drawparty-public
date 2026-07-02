// DrawParty — errorHandler Unit Tests
// Tests src/middleware/errorHandler.ts — global Express error handler.

import { describe, it, beforeEach } from "vitest";

describe("errorHandler middleware", () => {
  // TODO: returns 500 with { error: "Internal server error" } for generic Error
  // TODO: returns the status code from error.status when present
  // TODO: returns the error.message when it is a known domain error
  // TODO: does not leak stack traces to the response body in production
  // TODO: calls next() to pass the error down when response is already sent
  it.todo("returns 500 for generic Error");
  it.todo("uses error.status when set");
  it.todo("returns error.message for known domain errors");
  it.todo("does not leak stack trace in production");
});
