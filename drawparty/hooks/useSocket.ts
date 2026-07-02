"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { socket } from "@/lib/socket";
import type { Socket } from "socket.io-client";
import type { ServerToClientEvents, ClientToServerEvents } from "@/types/socket";
import { toast } from "sonner";

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function useSocket(): { socket: AppSocket; isConnected: boolean } {
  const { getToken, isLoaded } = useAuth();
  const { user } = useUser();

  const [isConnected, setIsConnected] = useState<boolean>(socket.connected);
  // wasConnected — skip "Reconnected!" toast on initial connect
  const wasConnected = useRef<boolean>(socket.connected);

  const handleConnect = useCallback((): void => {
    if (wasConnected.current) {
      toast.dismiss("conn-status");
      toast.success("Reconnected!");
    }
    wasConnected.current = true;
    setIsConnected(true);
  }, []);

  const handleDisconnect = useCallback((): void => {
    toast.warning("Connection lost. Reconnecting...", {
      id: "conn-status",
      duration: Infinity,
    });
    setIsConnected(false);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    (async (): Promise<void> => {
      const token = await getToken();
      if (token) {
        const displayName =
          user?.username ?? user?.fullName ?? user?.firstName ?? undefined;
        socket.auth = { token, displayName };
      } else {
        const { getOrCreateGuestId, getGuestName } = await import("@/lib/guestId");
        socket.auth = { guestId: getOrCreateGuestId(), guestName: getGuestName() ?? undefined };
      }
      socket.connect();
    })();

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    return (): void => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      // Do NOT disconnect here — SocketKeepAlive in ClientProviders owns the
      // connection lifecycle so social events work on all pages.
    };
  }, [getToken, handleConnect, handleDisconnect, isLoaded]);

  return { socket, isConnected };
}
