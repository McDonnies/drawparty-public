"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Home, User } from "lucide-react";
import { UserPanel } from "@/components/auth/UserPanel";
import { useLanguage } from "@/context/LanguageContext";

export function BottomNav() {
  const pathname = usePathname();
  const { isSignedIn, user } = useUser();
  const [panelOpen, setPanelOpen] = useState(false);
  const { t } = useLanguage();

  const tabs = [
    { href: "/", icon: Home, label: t.nav.home }
  ];

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0e0b1a]/95 backdrop-blur-xl border-t border-[#211c38] pb-safe">
        <div className="flex items-center justify-around h-16 px-2">
          {tabs.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
                  isActive ? "text-[#9B6FDF]" : "text-[#7a6f99] hover:text-white"
                }`}
              >
                <Icon size={20} />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}

          <button
            onClick={() => setPanelOpen(true)}
            className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl text-[#7a6f99] hover:text-white transition-all"
          >
            {isSignedIn ? (
              <div className="relative">
                <img
                  src={user.imageUrl}
                  alt="profile"
                  className="w-5 h-5 rounded-full object-cover"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full border border-[#0e0b1a]" />
              </div>
            ) : (
              <User size={20} />
            )}
            <span className="text-[10px] font-medium">
              {isSignedIn ? t.nav.profile : t.nav.signIn}
            </span>
          </button>
        </div>
      </nav>

      <UserPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
    </>
  );
}