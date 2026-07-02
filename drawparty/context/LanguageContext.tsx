"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { type Language, getTranslations, type TranslationKeys } from "@/lib/translations";

const STORAGE_KEY = "drawparty_lang";

type LanguageContextValue = {
  lang: Language;
  setLang: (l: Language) => void;
  t: TranslationKeys;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

async function detectLanguage(): Promise<Language> {
  try {
    const res = await fetch("/api/detect-language");
    const data = (await res.json()) as { lang: Language };
    return data.lang;
  } catch {
    return "en";
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>("en");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
    if (stored === "en" || stored === "fr" || stored === "de") {
      setLangState(stored);
    } else {
      detectLanguage().then((detected) => {
        setLangState(detected);
        localStorage.setItem(STORAGE_KEY, detected);
      });
    }
  }, []);

  const setLang = useCallback((l: Language) => {
    setLangState(l);
    localStorage.setItem(STORAGE_KEY, l);
  }, []);

  const t = getTranslations(lang);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
