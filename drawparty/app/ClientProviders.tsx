"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { NotificationProvider } from "@/context/NotificationContext";
import { fetchMe } from "@/lib/api";
import { socket } from "@/lib/socket";
import { FriendsProvider } from "@/context/FriendsContext";
import { LanguageProvider } from "@/context/LanguageContext";

// Ensures the signed-in user has a DB row — covers local dev without a Clerk webhook tunnel.
function UserEnsure() {
  const { isSignedIn, getToken } = useAuth();
  const { isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    fetchMe(getToken).catch(() => {});
  }, [isLoaded, isSignedIn, getToken]);

  return null;
}

// Keeps the socket connected throughout the authenticated session so real-time
// social events (friend requests, invites, status) work on every page.
function SocketKeepAlive() {
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    if (!isSignedIn) {
      socket.disconnect();
      return;
    }

    (async () => {
      const token = await getToken();
      if (!token) return;
      const displayName = user?.username ?? user?.fullName ?? user?.firstName ?? undefined;
      socket.auth = { token, displayName };
      // If socket is connected with stale/guest auth, force reconnect with real JWT
      if (socket.connected) socket.disconnect();
      socket.connect();
    })();
  // user?.id keeps effect stable — only re-run on actual user switch or sign-in/out
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, user?.id]);

  return null;
}

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <NotificationProvider>
        <UserEnsure />
        <SocketKeepAlive />
        <FriendsProvider>
          {children}
        </FriendsProvider>
      </NotificationProvider>
    </LanguageProvider>
  );
}
