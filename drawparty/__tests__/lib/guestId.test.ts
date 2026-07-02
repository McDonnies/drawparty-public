// DrawParty — lib/guestId Tests
// Tests lib/guestId.ts — localStorage-backed guest identifier.
// localStorage is available in jsdom environment.

import { describe, it, expect, beforeEach } from "vitest";
import { getOrCreateGuestId, getGuestName, setGuestName } from "@/lib/guestId";

beforeEach(() => localStorage.clear());

describe("getOrCreateGuestId", () => {
  it("generates id on first call", () => {
    const id = getOrCreateGuestId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
    // UUID format
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("returns same id on subsequent calls", () => {
    const first = getOrCreateGuestId();
    const second = getOrCreateGuestId();
    expect(first).toBe(second);
  });
});

describe("getGuestName / setGuestName", () => {
  it("setGuestName persists to localStorage", () => {
    setGuestName("Alice");
    expect(localStorage.getItem("drawparty_guest_name")).toBe("Alice");
  });

  it("getGuestName returns stored name", () => {
    setGuestName("Bob");
    expect(getGuestName()).toBe("Bob");
  });

  it("getGuestName returns null when not set", () => {
    expect(getGuestName()).toBeNull();
  });
});
