// DrawParty — FriendInvite Component Tests
// Tests components/user/FriendInvite.tsx — send game invite with 2s cooldown.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";

vi.mock("@/lib/api", () => ({ sendGameInvite: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@clerk/nextjs", () => ({ useAuth: () => ({ getToken: vi.fn() }) }));

import { FriendInvite } from "@/components/user/FriendInvite";

let mockOnInvite: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  mockOnInvite = vi.fn();
});

afterEach(() => vi.useRealTimers());

function renderInvite(overrides: Partial<{
  targetClerkId: string; roomId: string; disabled: boolean; onInvite: () => void;
}> = {}) {
  return render(
    <FriendInvite
      targetClerkId={overrides.targetClerkId ?? "friend1"}
      roomId={overrides.roomId ?? "room-1"}
      disabled={overrides.disabled ?? false}
      onInvite={overrides.onInvite ?? mockOnInvite}
    />
  );
}

describe("invite button", () => {
  it("renders the 'Invite' button", () => {
    renderInvite();
    expect(screen.getByRole("button", { name: "Invite" })).toBeInTheDocument();
  });

  it("calls onInvite when clicked", () => {
    renderInvite();
    act(() => {
      screen.getByRole("button", { name: "Invite" }).click();
    });
    expect(mockOnInvite).toHaveBeenCalledOnce();
  });

  it("shows 'Invited!' and disables button during 2s cooldown", () => {
    renderInvite();
    act(() => {
      screen.getByRole("button", { name: "Invite" }).click();
    });
    expect(screen.getByRole("button", { name: "Invited!" })).toBeDisabled();
  });

  it("reverts to 'Invite' after 2s cooldown", () => {
    renderInvite();
    act(() => {
      screen.getByRole("button", { name: "Invite" }).click();
    });
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByRole("button", { name: "Invite" })).toBeEnabled();
  });

  it("respects the disabled prop", () => {
    renderInvite({ disabled: true });
    expect(screen.getByRole("button", { name: "Invite" })).toBeDisabled();
  });
});
