"use client";

import Image from "next/image";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[#0d0d14] flex flex-col items-center justify-center gap-6 px-4 text-center">
      <Image
        src="/drawparty_main.png"
        alt="DrawParty"
        width={180}
        height={60}
        className="opacity-80"
      />
      <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-syne-loaded)" }}>
        You&apos;re offline
      </h1>
      <p className="text-[#a0a0c0] max-w-xs">
        DrawParty needs an internet connection to play. Check your connection and try again.
      </p>
      <button
        onClick={() => window.location.replace("/")}

        className="mt-2 px-6 py-3 rounded-xl bg-[#7B4FBF] text-white font-semibold hover:bg-[#6a3faa] transition-colors"
      >
        Retry
      </button>
    </div>
  );
}
