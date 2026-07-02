"use client";

import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { SUPPORTED_LANGUAGES, type Language } from "@/lib/translations";

export function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = SUPPORTED_LANGUAGES.find((l) => l.code === lang) ?? SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function select(code: Language) {
    setLang(code);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#211c38] bg-[#161228] hover:border-[#7B4FBF]/40 hover:bg-[#1e1836] transition-all text-sm text-[#c4b5e8]"
        aria-label="Change language"
      >
        <span className="text-base leading-none" suppressHydrationWarning>{current.flag}</span>
        <span className="hidden sm:inline font-medium text-xs" suppressHydrationWarning>{current.code.toUpperCase()}</span>
        <svg width="10" height="6" viewBox="0 0 10 6" className={`transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-36 rounded-xl border border-[#211c38] bg-[#13131e] shadow-xl z-[200] overflow-hidden">
          {SUPPORTED_LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => select(l.code)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors ${
                l.code === lang
                  ? "bg-[#7B4FBF]/20 text-white"
                  : "text-[#c4b5e8] hover:bg-[#1e1836] hover:text-white"
              }`}
            >
              <span className="text-base">{l.flag}</span>
              <span className="font-medium">{l.label}</span>
              {l.code === lang && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#7B4FBF]" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
