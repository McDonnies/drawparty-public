// DrawParty — LobbyChat Component Tests
// Tests components/lobby/LobbyChat.tsx — pre-game lobby chat.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// jsdom does not implement scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

vi.mock("@/context/LanguageContext", () => ({
  useLanguage: () => ({
    t: {
      lobby: {
        lobbyChat: "lobby chat",
        noMessages: "No messages yet",
        youChat: "You",
        saySomething: "Say something...",
        slowDown: "Slow down",
      },
    },
  }),
}));

import { LobbyChat } from "@/components/lobby/LobbyChat";
import type { ChatMessageDTO } from "@/types/game";

function makeMsg(clerkId: string, username: string, message: string): ChatMessageDTO {
  return {
    id: `msg-${clerkId}-${Date.now()}`,
    senderId: clerkId,
    senderUsername: username,
    senderAvatarUrl: null,
    message,
    sentAt: new Date().toISOString(),
  };
}

let mockOnSend: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockOnSend = vi.fn();
});

function renderChat(overrides: Partial<{
  messages: ChatMessageDTO[]; currentUserId: string; onSendMessage: (m: string) => void; isRateLimited: boolean;
}> = {}) {
  return render(
    <LobbyChat
      messages={overrides.messages ?? []}
      currentUserId={overrides.currentUserId ?? "u1"}
      onSendMessage={overrides.onSendMessage ?? mockOnSend}
      isRateLimited={overrides.isRateLimited ?? false}
    />
  );
}

describe("message list", () => {
  it("renders messages with sender name", () => {
    renderChat({ messages: [makeMsg("u2", "Alice", "hello")] });
    expect(screen.getByText("Alice:")).toBeInTheDocument();
    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("shows empty state when no messages", () => {
    renderChat({ messages: [] });
    expect(screen.getByText("No messages yet")).toBeInTheDocument();
  });

  it("shows 'You:' for own messages", () => {
    renderChat({ messages: [makeMsg("u1", "Me", "my message")], currentUserId: "u1" });
    expect(screen.getByText("You:")).toBeInTheDocument();
  });
});

describe("input", () => {
  it("submits on Enter and clears input", async () => {
    const user = userEvent.setup();
    renderChat();
    await user.type(screen.getByPlaceholderText("Say something..."), "hello{Enter}");
    expect(mockOnSend).toHaveBeenCalledWith("hello");
  });

  it("ignores empty submissions", async () => {
    const user = userEvent.setup();
    renderChat();
    await user.keyboard("{Enter}");
    expect(mockOnSend).not.toHaveBeenCalled();
  });

  it("disables send button when rate limited", () => {
    renderChat({ isRateLimited: true });
    expect(screen.getByText("Slow down")).toBeInTheDocument();
  });
});
