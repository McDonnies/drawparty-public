"use client";

import { useCallback, useRef } from "react";

export type SoundName =
  | "correct_guess"
  | "give_title_gartic_phone"
  | "joined_lobby_or_game"
  | "leave_lobby_or_game"
  | "lost_game_ai_judge"
  | "lost_heart_ai_judge"
  | "notification"
  | "transition_new_word";

export function useSound() {
  const audioRefs = useRef<Partial<Record<SoundName, HTMLAudioElement>>>({});

  const play = useCallback((name: SoundName) => {
    if (typeof window === "undefined") return;
    let audio = audioRefs.current[name];
    if (!audio) {
      audio = new Audio(`/sounds/${name}.mp3`);
      audioRefs.current[name] = audio;
    }
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }, []);

  return { play };
}
