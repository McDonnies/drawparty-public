"use client";

import Link from "next/link";
import Image from "next/image";
import { SignedOut } from "@clerk/nextjs";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Footer } from "@/components/layout/Footer";
import { GarticPhoneCard } from "@/components/gartic-phone/GarticPhoneCard";
import { SkribblCard } from "@/components/skribbl/SkribblCard";
import { useLanguage } from "@/context/LanguageContext";

// ---- Main page ----
export default function HomePage() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-[#0e0b1a]">
      <Navbar />

      <main className="pt-0 md:pt-16 pb-20 md:pb-0">

        {/* ---- HERO ---- */}
        <section className="relative min-h-[88vh] flex flex-col items-center justify-center px-5 text-center overflow-hidden">

          {/* Background glows */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#7B4FBF]/10 rounded-full blur-[130px]" />
            <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-[#3AAFD4]/8 rounded-full blur-[110px]" />
            <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] bg-[#F5C518]/5 rounded-full blur-[90px]" />

            {/* Floating doodles */}
            <div className="absolute top-20 left-[8%] text-3xl opacity-20 animate-float hidden md:block">🎨</div>
            <div className="absolute top-32 right-[12%] text-2xl opacity-20 animate-float-delayed hidden md:block">✏️</div>
            <div className="absolute bottom-32 left-[15%] text-2xl opacity-20 animate-drift hidden md:block">🖌️</div>
            <div className="absolute bottom-24 right-[10%] text-3xl opacity-20 animate-float hidden md:block">🎭</div>
            <div className="absolute top-[45%] left-[5%] text-xl opacity-15 animate-wiggle hidden lg:block">⭐</div>
            <div className="absolute top-[55%] right-[6%] text-xl opacity-15 animate-float-delayed hidden lg:block">💡</div>
          </div>

          {/* Hero content */}
          <div className="relative z-10 stagger-children max-w-4xl mx-auto">

            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-[#161228] border border-[#211c38] text-xs text-[#7a6f99] px-4 py-2 rounded-full mb-8 font-medium ">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              {t.home.badge}
            </div>

            {/* Logo image */}
            <div className="flex justify-center mb-6">
              <div className="animate-bounce-soft">
                <Image
                  src="/drawparty_main.png"
                  alt="DrawParty Logo"
                  width={250}
                  height={250}
                  className="drop-shadow-[0_0_40px_rgba(123,79,191,0.5)]"
                  priority
                />
              </div>
            </div>

            {/* Title */}
            <h1 className="font-syne  font-extrabold text-[2.25rem] sm:text-6xl md:text-7xl lg:text-7xl leading-tight tracking-normal mb-6">
              <span className="block">
                <span className="text-gradient-purple">Draw</span>
                <span className="text-gradient-teal">Party</span>
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-[#7a6f99] max-w-xl mx-auto leading-relaxed mb-10">
              {t.home.subtitle}
            </p>

            {/* CTAs */}
            <div className="flex flex-col items-center gap-4 justify-center">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <a href="#games">
                  <></>
                  <button className="w-full sm:w-auto bg-gradient-to-r from-[#7B4FBF] to-[#9B6FDF] text-white font-syne font-bold text-base px-8 py-3.5 rounded-full hover:from-[#8B5FD0] hover:to-[#AB7FEF] transition-all animate-pulse-glow shadow-lg">
                    {t.home.playNow}
                  </button>
                </a>
              </div>
              <SignedOut>
                <p className="text-sm text-[#7a6f99]">
                  {t.home.alreadyHaveAccount}{" "}
                  <Link href="/sign-in" className="text-[#9B6FDF] hover:text-white underline underline-offset-4 transition-colors">
                    {t.home.signInToSave}
                  </Link>
                </p>
              </SignedOut>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-30">
            <div className="w-px h-8 bg-gradient-to-b from-transparent to-white" />
            <span className="text-[10px] uppercase tracking-widest font-medium">{t.home.scroll}</span>
          </div>
        </section>

        {/* ---- GAME MODE SELECTOR ---- */}
        <section id="games" className="px-5 md:px-10 py-16 max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-syne  font-bold text-3xl sm:text-4xl text-white mb-3">
              {t.home.chooseGame}
            </h2>
            <p className="text-[#7a6f99] text-base max-w-md mx-auto">
              {t.home.chooseGameSub}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <GarticPhoneCard />
            <SkribblCard />
          </div>
        </section>

        {/* ---- ABOUT ---- */}
        <section id="about" className="px-5 md:px-10 py-16 border-t border-[#211c38]">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="font-syne font-bold text-3xl sm:text-4xl text-white mb-4">
                  {t.home.aboutTitle}{" "}
                  <br />
                  <span className="text-gradient-teal">{t.home.aboutTitleAccent}</span>
                </h2>
                <p className="text-[#7a6f99] leading-relaxed mb-6">
                  {t.home.aboutDesc}
                </p>
                <div className="space-y-3">
                  {[
                    { icon: "📱", text: t.home.featurePwa },
                    { icon: "⚡", text: t.home.featureRt },
                    { icon: "🤖", text: t.home.featureAi },
                    { icon: "🏆", text: t.home.featureLb },
                  ].map(({ icon, text }) => (
                    <div key={text} className="flex items-center gap-3 text-sm text-[#7a6f99]">
                      <span className="text-base">{icon}</span>
                      {text}
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: "2", label: t.home.statGameModes, color: "#7B4FBF" },
                  { value: "16", label: t.home.statMaxPlayers, color: "#3AAFD4" },
                  { value: "∞", label: t.home.statRounds, color: "#F5C518" },
                  { value: "Free", label: t.home.statFree, color: "#FF6B6B" },
                ].map(({ value, label, color }) => (
                  <div
                    key={label}
                    className="bg-[#161228] border border-[#211c38] rounded-2xl p-5 text-center hover:border-[#7B4FBF]/30 transition-colors"
                  >
                    <p className="font-syne font-extrabold text-3xl" style={{ color }}>
                      {value}
                    </p>
                    <p className="text-xs text-[#7a6f99] mt-1 font-medium">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}