"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { SoundName } from "@/hooks/useSound";

export type Notification = {
  id: string;
  type: "friend-request" | "game-invite" | "announcement";
  message: string;
  from?: string;
  avatarUrl?: string;
  time: string;
  read: boolean;
  requestId?: string;
  roomId?: string;
  roomCode?: string;
  gameMode?: string;
};

const STORAGE_KEY = "drawparty:notifications";

function loadFromStorage(): Notification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Notification[]) : [];
  } catch {
    return [];
  }
}

function saveToStorage(notifications: Notification[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  } catch {
    // localStorage full or unavailable — ignore
  }
}

type NotificationContextValue = {
  notifications: Notification[];
  hasUnread: boolean;
  unreadCount: number;
  addNotification: (n: Omit<Notification, "id" | "read">) => void;
  removeNotification: (id: string) => void;
  markAllRead: () => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

function playSound(name: SoundName): void {
  if (typeof window === "undefined") return;
  const audio = new Audio(`/sounds/${name}.mp3`);
  audio.play().catch(() => {});
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(loadFromStorage);

  // Sync every state change to localStorage
  useEffect(() => {
    saveToStorage(notifications);
  }, [notifications]);

  const addNotification = useCallback((n: Omit<Notification, "id" | "read">) => {
    setNotifications((prev) => {
      // Deduplicate by requestId (friend-request) or roomId+type (game-invite)
      if (n.requestId && prev.some((x) => x.requestId === n.requestId)) return prev;
      if (n.roomId && n.type === "game-invite" && prev.some((x) => x.roomId === n.roomId && x.type === "game-invite")) return prev;
      playSound("notification");
      return [{ ...n, id: crypto.randomUUID(), read: false }, ...prev];
    });
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const hasUnread = notifications.some((n) => !n.read);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider value={{ notifications, hasUnread, unreadCount, addNotification, removeNotification, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationProvider");
  return ctx;
}
