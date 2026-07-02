// DrawParty — NotificationContext Tests

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import { NotificationProvider, useNotifications } from "@/context/NotificationContext";

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  // Mock Audio to avoid jsdom errors
  vi.stubGlobal("Audio", vi.fn(function (this: { play: ReturnType<typeof vi.fn> }) {
    this.play = vi.fn().mockResolvedValue(undefined);
  }));
  // Mock crypto.randomUUID
  let counter = 0;
  vi.spyOn(crypto, "randomUUID").mockImplementation(() => `uuid-${++counter}` as `${string}-${string}-${string}-${string}-${string}`);
});

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(NotificationProvider, null, children);

describe("NotificationProvider", () => {
  it("provides empty notifications initially", () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });
    expect(result.current.notifications).toEqual([]);
    expect(result.current.hasUnread).toBe(false);
  });

  it("addNotification appends with auto id and read=false", () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });

    act(() => {
      result.current.addNotification({
        type: "friend-request",
        message: "Alice sent you a friend request",
        time: "Just now",
      });
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].id).toBeDefined();
    expect(result.current.notifications[0].read).toBe(false);
    expect(result.current.notifications[0].message).toBe("Alice sent you a friend request");
  });

  it("removeNotification removes by id", () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });

    act(() => {
      result.current.addNotification({ type: "announcement", message: "Hello", time: "now" });
    });

    const { id } = result.current.notifications[0];

    act(() => {
      result.current.removeNotification(id);
    });

    expect(result.current.notifications).toHaveLength(0);
  });

  it("hasUnread reflects unread state", () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });
    expect(result.current.hasUnread).toBe(false);

    act(() => {
      result.current.addNotification({ type: "announcement", message: "Test", time: "now" });
    });

    expect(result.current.hasUnread).toBe(true);
  });

  it("markAllRead sets all to read", () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });

    act(() => {
      result.current.addNotification({ type: "announcement", message: "A", time: "now" });
      result.current.addNotification({ type: "announcement", message: "B", time: "now" });
    });

    expect(result.current.hasUnread).toBe(true);

    act(() => {
      result.current.markAllRead();
    });

    expect(result.current.hasUnread).toBe(false);
    expect(result.current.notifications.every((n) => n.read)).toBe(true);
  });
});

describe("useNotifications", () => {
  it("throws outside provider", () => {
    // Suppress React error boundary noise in test output
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useNotifications())).toThrow(
      "useNotifications must be used inside NotificationProvider"
    );
    consoleError.mockRestore();
  });
});
