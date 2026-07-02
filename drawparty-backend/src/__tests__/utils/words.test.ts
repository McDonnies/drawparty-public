// DrawParty — words Utility Tests
// Tests src/utils/words.ts — word list helpers.

import { describe, it, vi, beforeEach } from "vitest";
import { mockDeep, mockReset } from "vitest-mock-extended";
import { PrismaClient } from "../../generated/prisma";

const prismaMock = mockDeep<PrismaClient>();
vi.mock("../../config/prisma", () => ({ prisma: prismaMock }));

beforeEach(() => mockReset(prismaMock));

describe("pickRandomWord", () => {
  // TODO: returns a Word row selected at random from the DB
  // TODO: respects the category filter when provided
  // TODO: excludes word IDs in the usedWordIds array
  // TODO: falls back to any word when all category words are exhausted
  it.todo("returns a random word from DB");
  it.todo("filters by category");
  it.todo("excludes used word IDs");
  it.todo("falls back when category exhausted");
});
