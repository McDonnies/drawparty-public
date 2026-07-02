// DrawParty — ChatGuess Component Tests
// Tests components/skribbl/ChatGuess.tsx — merged guess + chat timeline.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import ChatGuess from "@/components/skribbl/ChatGuess";
import type { SkribblGuessDTO, SkribblChatDTO } from "@/types/game";

beforeEach(() => vi.clearAllMocks());

function makeGuess(overrides: Partial<SkribblGuessDTO> = {}): SkribblGuessDTO {
  return {
    clerkId: "p1",
    username: "Player1",
    guess: "testguess",
    isCorrect: false,
    isClose: false,
    isAI: false,
    pointsAwarded: 0,
    guessedAt: new Date().toISOString(),
    avatarUrl: null,
    ...overrides,
  };
}

function makeChat(overrides: Partial<SkribblChatDTO> = {}): SkribblChatDTO {
  return {
    clerkId: "p1",
    username: "Player1",
    message: "hello",
    sentAt: new Date().toISOString(),
    avatarUrl: null,
    ...overrides,
  };
}

describe("message list", () => {
  it("renders guess rows with username and text", () => {
    render(<ChatGuess guesses={[makeGuess({ username: "Alice", guess: "cat" })]} currentUserId="u1" />);
    expect(screen.getByText("Alice:")).toBeInTheDocument();
    expect(screen.getByText("cat")).toBeInTheDocument();
  });

  it("shows 'No messages yet...' when both lists are empty", () => {
    render(<ChatGuess guesses={[]} currentUserId="u1" />);
    expect(screen.getByText("No messages yet...")).toBeInTheDocument();
  });

  it("highlights correct guesses with green border and points badge", () => {
    const guess = makeGuess({ username: "Alice", guess: "cat", isCorrect: true, pointsAwarded: 100 });
    render(<ChatGuess guesses={[guess]} currentUserId="u1" />);
    const row = document.querySelector(".border-emerald-400");
    expect(row).not.toBeNull();
    expect(screen.getByText(/\+100/)).toBeInTheDocument();
  });

  it("highlights close guesses with amber border and arrow", () => {
    const guess = makeGuess({ username: "Bob", guess: "cta", isClose: true });
    render(<ChatGuess guesses={[guess]} currentUserId="u1" />);
    const row = document.querySelector(".border-amber-400");
    expect(row).not.toBeNull();
  });

  it("renders chat messages with blue border", () => {
    render(
      <ChatGuess
        guesses={[]}
        currentUserId="u1"
        chatMessages={[makeChat({ username: "Alice", message: "hello world" })]}
      />
    );
    // Chat rows use border-l-2 border-[#3AAFD4]
    const row = document.querySelector(".border-l-2");
    expect(row).not.toBeNull();
    expect(screen.getByText("hello world")).toBeInTheDocument();
  });
});
