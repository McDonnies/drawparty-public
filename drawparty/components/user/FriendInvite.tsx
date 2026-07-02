"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type FriendInviteProps = {
  targetClerkId: string;
  roomId: string;
  disabled: boolean;
  onInvite: () => void;
};

export function FriendInvite({ targetClerkId, roomId, disabled, onInvite }: FriendInviteProps) {
  void targetClerkId; // passed through for parent context, not used in button itself
  void roomId;
  const [invited, setInvited] = useState(false);

  function handleClick() {
    onInvite();
    setInvited(true);
    setTimeout(() => setInvited(false), 2000);
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={disabled || invited}
      onClick={handleClick}
      className="h-7 px-2.5 text-xs text-[#c8ff00] hover:text-[#c8ff00] hover:bg-[#c8ff00]/10 transition-all"
    >
      {invited ? "Invited!" : "Invite"}
    </Button>
  );
}
