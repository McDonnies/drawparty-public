// DrawParty — FriendSearch Component Tests
// Tests components/user/FriendSearch.tsx — user search with 400ms debounce.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";

vi.mock("@/lib/api", () => ({ searchUsers: vi.fn().mockResolvedValue([]) }));
vi.mock("@clerk/nextjs", () => ({ useAuth: () => ({ getToken: vi.fn() }) }));
vi.mock("@/context/LanguageContext", () => ({
  useLanguage: () => ({ t: {} }),
}));

import { FriendSearch } from "@/components/user/FriendSearch";

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => vi.useRealTimers());

function typeInInput(value: string) {
  const input = screen.getByPlaceholderText("Search by username...") as HTMLInputElement;
  // Use React's tracking to set value and fire the native event that React listens to
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
  nativeInputValueSetter.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("search debounce", () => {
  it("does not call searchUsers before 400ms", () => {
    const searchFn = vi.fn().mockResolvedValue([]);
    render(<FriendSearch searchUsers={searchFn} onSendRequest={vi.fn().mockResolvedValue(undefined)} />);
    act(() => { typeInInput("ab"); });
    act(() => vi.advanceTimersByTime(399));
    expect(searchFn).not.toHaveBeenCalled();
  });

  it("calls searchUsers after 400ms debounce", () => {
    const searchFn = vi.fn().mockResolvedValue([]);
    render(<FriendSearch searchUsers={searchFn} onSendRequest={vi.fn().mockResolvedValue(undefined)} />);
    act(() => { typeInInput("al"); });
    act(() => vi.advanceTimersByTime(400));
    expect(searchFn).toHaveBeenCalledWith("al");
  });
});

describe("results", () => {
  it("shows 'No users found' when results empty and query >= 2", async () => {
    const searchFn = vi.fn().mockResolvedValue([]);
    render(<FriendSearch searchUsers={searchFn} onSendRequest={vi.fn().mockResolvedValue(undefined)} />);
    act(() => { typeInInput("xy"); });
    act(() => vi.advanceTimersByTime(400));
    // Flush pending promises to update state
    await act(() => vi.runAllTimersAsync());
    expect(screen.getByText("No users found")).toBeInTheDocument();
  });

  it("renders result rows with Add button", async () => {
    const searchFn = vi.fn().mockResolvedValue([
      { clerkId: "p1", username: "Alice", avatarUrl: null, alreadyFriend: false, pendingRequest: false },
    ]);
    render(<FriendSearch searchUsers={searchFn} onSendRequest={vi.fn().mockResolvedValue(undefined)} />);
    act(() => { typeInInput("al"); });
    act(() => vi.advanceTimersByTime(400));
    await act(() => vi.runAllTimersAsync());
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Add")).toBeInTheDocument();
  });

  it("calls onSendRequest when Add is clicked", async () => {
    const sendFn = vi.fn().mockResolvedValue(undefined);
    const searchFn = vi.fn().mockResolvedValue([
      { clerkId: "p1", username: "Alice", avatarUrl: null, alreadyFriend: false, pendingRequest: false },
    ]);
    render(<FriendSearch searchUsers={searchFn} onSendRequest={sendFn} />);
    act(() => { typeInInput("al"); });
    act(() => vi.advanceTimersByTime(400));
    await act(() => vi.runAllTimersAsync());
    screen.getByText("Add").click();
    expect(sendFn).toHaveBeenCalledWith("p1");
  });
});
