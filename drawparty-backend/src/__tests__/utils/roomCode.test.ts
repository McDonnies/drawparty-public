// DrawParty — roomCode Utility Tests
// Tests src/utils/roomCode.ts — room code generation.

import { describe, it, expect } from "vitest";

import { generateRoomCode } from "../../utils/roomCode";

describe("generateRoomCode", () => {
  // TODO: returns a string of exactly 6 characters
  // TODO: returned string contains only uppercase letters and digits
  // TODO: two consecutive calls return different codes (probabilistic)
  it.todo("returns a 6-character string");
  it.todo("contains only uppercase alphanumeric characters");
  it.todo("generates unique codes on repeated calls");
});
