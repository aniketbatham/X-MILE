"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getLanguageInfo, SUPPORTED_LANGUAGES } from "./languages";
import { DICTIONARIES } from "./locales";
import { LanguageInfo, LocaleCode, TextDirection, TranslationDictionary } from "./types";

interface LanguageContextType {
  locale: LocaleCode;
  setLocale: (newLocale: LocaleCode) => void;
  t: (path: string, vars?: Record<string, string | number>) => string;
  dir: TextDirection;
  currentLanguage: LanguageInfo;
  languages: LanguageInfo[];
  formatNumber: (value: number) => string;
  formatCurrency: (value: number) => string;
  formatDate: (value: Date | string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = "xmile_locale";
const COOKIE_KEY = "xmile_locale";

function getInitialLocale(): LocaleCode {
  if (typeof window === "undefined") return "en";
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as LocaleCode;
    if (saved && DICTIONARIES[saved]) {
      return saved;
    }
  } catch {
    // localStorage not accessible
  }
  return "en";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initial = getInitialLocale();
    setLocaleState(initial);
    setMounted(true);
  }, []);

  const currentLanguage = useMemo(() => getLanguageInfo(locale), [locale]);
  const dir = currentLanguage.dir;

  const setLocale = useCallback((newLocale: LocaleCode) => {
    if (!DICTIONARIES[newLocale]) return;
    setLocaleState(newLocale);
    try {
      localStorage.setItem(STORAGE_KEY, newLocale);
      document.cookie = `${COOKIE_KEY}=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      // storage unavailable
    }
  }, []);

  // Synchronize document dir and lang attributes
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
      document.documentElement.dir = dir;
      if (dir === "rtl") {
        document.documentElement.classList.add("rtl");
      } else {
        document.documentElement.classList.remove("rtl");
      }
    }
  }, [locale, dir]);

  // Translation function with deep lookup and fallback to English
  const t = useCallback(
    (keyPath: string, vars?: Record<string, string | number>): string => {
      const activeDict = DICTIONARIES[locale] || DICTIONARIES.en;
      const fallbackDict = DICTIONARIES.en;

      const resolve = (dict: TranslationDictionary, path: string): unknown => {
        const parts = path.split(".");
        let curr: unknown = dict;
        for (const p of parts) {
          if (curr && typeof curr === "object" && p in (curr as Record<string, unknown>)) {
            curr = (curr as Record<string, unknown>)[p];
          } else {
            return undefined;
          }
        }
        return curr;
      };

      let resolved = resolve(activeDict, keyPath);
      if (resolved === undefined || resolved === "") {
        if (process.env.NODE_ENV === "development" && locale !== "en") {
          console.warn(
            `[i18n] Missing translation for key "${keyPath}" in locale "${locale}". Falling back to English.`
          );
        }
        resolved = resolve(fallbackDict, keyPath);
      }

      if (typeof resolved !== "string") {
        if (process.env.NODE_ENV === "development") {
          console.warn(
            `[i18n] Untranslated key "${keyPath}" not found in English fallback dictionary.`
          );
        }
        return keyPath;
      }

      let text = resolved;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        }
      }

      return text;
    },
    [locale]
  );

  const formatNumber = useCallback(
    (val: number): string => {
      try {
        return new Intl.NumberFormat(locale === "en" ? "en-IN" : `${locale}-IN`).format(val);
      } catch {
        return new Intl.NumberFormat("en-IN").format(val);
      }
    },
    [locale]
  );

  const formatCurrency = useCallback(
    (val: number): string => {
      try {
        return new Intl.NumberFormat(locale === "en" ? "en-IN" : `${locale}-IN`, {
          style: "currency",
          currency: "INR",
          maximumFractionDigits: 0,
        }).format(val);
      } catch {
        return `₹${val.toLocaleString("en-IN")}`;
      }
    },
    [locale]
  );

  const formatDate = useCallback(
    (val: Date | string): string => {
      try {
        const date = typeof val === "string" ? new Date(val) : val;
        return new Intl.DateTimeFormat(locale === "en" ? "en-IN" : `${locale}-IN`, {
          dateStyle: "medium",
        }).format(date);
      } catch {
        return new Date(val).toLocaleDateString("en-IN");
      }
    },
    [locale]
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      dir,
      currentLanguage,
      languages: SUPPORTED_LANGUAGES,
      formatNumber,
      formatCurrency,
      formatDate,
    }),
    [locale, setLocale, t, dir, currentLanguage, formatNumber, formatCurrency, formatDate]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
