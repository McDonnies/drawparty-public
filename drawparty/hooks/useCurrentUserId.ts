"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";

/**
 * Returns the current user's stable identity string:
 * - Signed-in users: Clerk user ID (e.g. "user_abc123")
 * - Guests: "guest_<uuid>" derived from localStorage
 *
 * This is the value stored as `clerkId` in the DB and used in all
 * room/player comparisons. Use this instead of `useUser().user?.id`
 * so that guest hosts can be correctly identified.
 */
export function useCurrentUserId(): string {
  const { user } = useUser();
  const [guestId, setGuestId] = useState<string>("");

  useEffect(() => {
    if (!user) {
      import("@/lib/guestId").then(({ getOrCreateGuestId }) => {
        setGuestId(`guest_${getOrCreateGuestId()}`);
      });
    }
  }, [user]);

  return user?.id ?? guestId;
}
