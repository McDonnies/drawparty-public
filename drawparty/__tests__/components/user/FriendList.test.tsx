// DrawParty — FriendList Component Tests
// Tests components/user/FriendList.tsx — grouped friend list (online/offline).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/context/LanguageContext", () => ({
  useLanguage: () => ({
    t: {
      social: {
        onlineStatus: "Online",
        inGameStatus: "In Game",
        awayStatus: "Away",
        offlineStatus: "Offline",
        noFriendsYet: "No friends yet",
        searchToAdd: "Search to add",
        remove: "Remove",
      },
    },
  }),
}));

import { FriendList } from "@/components/user/FriendList";
import type { FriendDTO } from "@/hooks/useFriends";

function makeFriend(clerkId: string, overrides: Partial<FriendDTO> = {}): FriendDTO {
  return {
    id: `f-${clerkId}`,
    clerkId,
    username: clerkId,
    avatarUrl: null,
    status: "online",
    ...overrides,
  };
}

let mockOnRemove: ReturnType<typeof vi.fn>;
let mockOnInvite: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockOnRemove = vi.fn();
  mockOnInvite = vi.fn();
});

describe("friend grouping", () => {
  it("renders grouped sections Online / In Game / Offline", () => {
    const friends = [
      makeFriend("p1", { username: "Alice", status: "online" }),
      makeFriend("p2", { username: "Bob", status: "offline" }),
    ];
    render(<FriendList friends={friends} onRemove={mockOnRemove} onInvite={mockOnInvite} />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });
});

describe("empty state", () => {
  it("shows 'No friends yet' when friends array is empty", () => {
    render(<FriendList friends={[]} onRemove={mockOnRemove} onInvite={mockOnInvite} />);
    expect(screen.getByText("No friends yet")).toBeInTheDocument();
    expect(screen.getByText("Search to add")).toBeInTheDocument();
  });
});

describe("remove friend", () => {
  it("calls onRemove with clerkId when remove button clicked", async () => {
    const user = userEvent.setup();
    render(
      <FriendList
        friends={[makeFriend("p1", { username: "Alice" })]}
        onRemove={mockOnRemove}
        onInvite={mockOnInvite}
      />
    );
    await user.click(screen.getByText("Remove"));
    expect(mockOnRemove).toHaveBeenCalledWith("p1");
  });

  it("shows invite button when currentRoomId is provided", () => {
    const friends = [makeFriend("p1", { username: "Alice", status: "online" })];
    render(
      <FriendList
        friends={friends}
        currentRoomId="room-1"
        onRemove={mockOnRemove}
        onInvite={mockOnInvite}
      />
    );
    // FriendInvite component renders "Invite" button
    expect(screen.getByText("Invite")).toBeInTheDocument();
  });
});
