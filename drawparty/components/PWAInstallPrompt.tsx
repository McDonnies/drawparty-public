"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X, Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pwa-prompt-dismissed";

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Already installed or user dismissed before
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      localStorage.getItem(DISMISS_KEY)
    ) return;

    const handler = (e: Event) => {
      e.preventDefault();
      if (localStorage.getItem(DISMISS_KEY)) return;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Small delay so it doesn't pop up instantly on page load
      setTimeout(() => setVisible(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setVisible(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, "1");
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Install DrawParty app"
      className="
        fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm
        bg-[#161228] border border-[#211c38] rounded-2xl shadow-2xl
        p-4 flex flex-col gap-3
        animate-in slide-in-from-bottom-4 fade-in duration-300
      "
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <Image
          src="/icons/icon-192x192.png"
          alt="DrawParty icon"
          width={44}
          height={44}
          className="rounded-xl shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm leading-tight">DrawParty</p>
          <p className="text-[#7a6f99] text-xs mt-0.5">Install the app</p>
        </div>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="text-[#7a6f99] hover:text-white transition-colors p-1 -mr-1 shrink-0"
        >
          <X size={16} />
        </button>
      </div>

      {/* Body */}
      <p className="text-sm text-[#b8afd4] leading-snug">
        Add DrawParty to your home screen for a faster, app-like experience.
      </p>

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <button
          onClick={handleDismiss}
          className="
            px-4 py-2 rounded-xl text-sm font-medium text-[#7a6f99]
            hover:text-white hover:bg-[#1e1836] transition-colors
          "
        >
          Not now
        </button>
        <button
          onClick={handleInstall}
          className="
            flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold
            bg-[#7B4FBF] hover:bg-[#9B6FDF] text-white transition-colors
          "
        >
          <Download size={14} />
          Install
        </button>
      </div>
    </div>
  );
}
