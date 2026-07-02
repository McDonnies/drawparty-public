"use client";

import { useState } from "react";
import type React from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { UserPanel } from "@/components/auth/UserPanel";
import { useNotifications } from "@/context/NotificationContext";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { useLanguage } from "@/context/LanguageContext";

export function Navbar({ children }: { children?: React.ReactNode }) {
  const { isSignedIn, user } = useUser();
  const [panelOpen, setPanelOpen] = useState(false);
  const { hasUnread } = useNotifications();
  const { t } = useLanguage();

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 hidden md:flex items-center justify-between px-5 md:px-10 h-16 border-b border-[#211c38] bg-[#0e0b1a]/85 backdrop-blur-xl">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative w-8 h-8 transition-transform group-hover:scale-110 group-hover:rotate-6">
            <Image
              src="/drawparty.png"
              alt="DrawParty"
              width={32}
              height={32}
              className="rounded-lg object-contain"
            />
          </div>
          <span className="font-syne font-bold text-lg tracking-tight hidden sm:block">
            <span className="text-[#9B6FDF]">Draw</span>
            <span className="text-[#3AAFD4]">Party</span>
          </span>
        </Link>

        {/* Nav links / game HUD slot */}
        <nav className="hidden md:flex items-center gap-8">
          {children}
        </nav>

        {/* Auth */}
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          {isSignedIn ? (
            <button
              onClick={() => setPanelOpen(true)}
              className={`flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-full border border-[#211c38] hover:border-[#7B4FBF]/40 bg-[#161228] hover:bg-[#1e1836] transition-all${hasUnread ? " notification-glow" : ""}`}
            >
              <div className="relative">
                <img
                  src={user.imageUrl}
                  alt={user.username ?? "User"}
                  className="w-7 h-7 rounded-full object-cover"
                />
                <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-400 rounded-full border border-[#0e0b1a]" />
              </div>
              <span className="text-sm font-medium max-w-[80px] truncate">
                {user.username ?? user.firstName ?? "You"}
              </span>
            </button>
          ) : (
            <Link href="/sign-in">
              <Button
                size="sm"
                className="bg-gradient-to-r from-[#7B4FBF] to-[#3AAFD4] text-white font-syne font-bold hover:opacity-90 rounded-full px-5 transition-all hover:shadow-[0_0_20px_rgba(123,79,191,0.5)]"
              >
                {t.nav.getStarted}
              </Button>
            </Link>
          )}
        </div>
      </header>

      <UserPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
    </>
  );
}