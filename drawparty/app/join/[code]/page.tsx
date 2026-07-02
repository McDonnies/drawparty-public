"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { joinRoom } from "@/lib/api";
import { useLanguage } from "@/context/LanguageContext";
import { getGuestName } from "@/lib/guestId";
import { GuestNameModal } from "@/components/shared/GuestNameModal";

export default function JoinPage(): React.ReactElement {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { t } = useLanguage();
  const didJoin = useRef(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [readyToJoin, setReadyToJoin] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn && !getGuestName()) {
      setShowNameModal(true);
    } else {
      setReadyToJoin(true);
    }
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    if (!readyToJoin) return;
    if (didJoin.current) return;
    didJoin.current = true;

    async function join(): Promise<void> {
      try {
        const room = await joinRoom(getToken, code);
        const path =
          room.gameMode === "SKRIBBL"
            ? `/skribbl/lobby/${room.id}`
            : `/gartic-phone/lobby/${room.id}`;
        router.replace(path);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (msg === "ROOM_NOT_FOUND") toast.error(t.join.roomNotFound);
        else if (msg === "ROOM_FULL") toast.error(t.join.roomFull);
        else if (msg === "ROOM_NOT_WAITING") toast.error(t.join.gameAlreadyStarted);
        else if (msg === "ROOM_KICKED") toast.error(t.join.wasKicked);
        else toast.error(t.join.couldNotJoin);
        router.replace("/");
      }
    }
    void join();
  }, [readyToJoin, code, getToken, router]);

  if (showNameModal) {
    return (
      <GuestNameModal
        onConfirm={() => {
          setShowNameModal(false);
          setReadyToJoin(true);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0e0b1a] flex items-center justify-center">
      <p className="text-[#7a6f99] text-sm animate-pulse">{t.join.joining}</p>
    </div>
  );
}
