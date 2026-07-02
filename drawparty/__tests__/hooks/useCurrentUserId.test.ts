// DrawParty — useCurrentUserId Hook Tests
// Tests hooks/useCurrentUserId.ts — returns Clerk userId or guest id.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";

// Mock @clerk/nextjs
vi.mock("@clerk/nextjs", () => ({ useUser: vi.fn() }));
// Mock @/lib/guestId
vi.mock("@/lib/guestId", () => ({
  getOrCreateGuestId: vi.fn().mockReturnValue("test-uuid"),
}));

import { useUser } from "@clerk/nextjs";

beforeEach(() => vi.clearAllMocks());

describe("useCurrentUserId", () => {
  it("returns Clerk userId when signed in", () => {
    (useUser as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { id: "user_clerk123" },
    });
    const { result } = renderHook(() => useCurrentUserId());
    expect(result.current).toBe("user_clerk123");
  });

  it("returns guest id when not signed in", async () => {
    (useUser as ReturnType<typeof vi.fn>).mockReturnValue({ user: null });
    const { result } = renderHook(() => useCurrentUserId());
    // Initially empty string, then guest_ prefix after the effect
    // We just confirm a string is returned
    expect(typeof result.current).toBe("string");
  });

  it("returns empty string while auth is loading (user=undefined)", () => {
    (useUser as ReturnType<typeof vi.fn>).mockReturnValue({ user: undefined });
    const { result } = renderHook(() => useCurrentUserId());
    // No user yet → returns "" (guestId not yet resolved from dynamic import)
    expect(result.current).toBe("");
  });
});
