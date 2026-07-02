// DrawParty — aiService Unit Tests
// Tests src/services/aiService.ts — Groq Vision API wrapper.
// The fetch / Groq client is mocked to avoid real API calls.

import { describe, it, vi, beforeEach } from "vitest";

vi.mock("groq-sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  })),
}));

beforeEach(() => vi.clearAllMocks());

// ── guessDrawing ──────────────────────────────────────────────────────────────
describe("guessDrawing", () => {
  // TODO: calls Groq Vision API with the base64 image
  // TODO: returns the trimmed, lowercased guess string from API response
  // TODO: passes wordLength hint in the prompt when provided
  // TODO: passes letterHint string in the prompt when provided
  // TODO: returns empty string when API response is empty
  // TODO: throws / bubbles error when API call fails so caller can handle
  it.todo("returns lowercased trimmed guess from API");
  it.todo("includes wordLength hint in the prompt");
  it.todo("includes letterHint in the prompt");
  it.todo("returns empty string on empty API response");
  it.todo("propagates API errors");
});

// ── generateWord (if exported) ────────────────────────────────────────────────
describe("generateWord", () => {
  // TODO: returns a single-word string
  // TODO: respects the category filter parameter
  it.todo("returns a valid single word");
  it.todo("respects category filter");
});
