"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { LocaleCode } from "@/i18n/types";

interface LanguageSelectorProps {
  variant?: "header" | "compact" | "card";
  className?: string;
}

export default function LanguageSelector({
  variant = "header",
  className = "",
}: LanguageSelectorProps) {
  const { locale, setLocale, languages, currentLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const filteredLanguages = useMemo(() => {
    if (!search.trim()) return languages;
    const query = search.toLowerCase().trim();
    return languages.filter(
      (lang) =>
        lang.name.toLowerCase().includes(query) ||
        lang.nativeName.toLowerCase().includes(query) ||
        lang.script.toLowerCase().includes(query) ||
        lang.region.toLowerCase().includes(query)
    );
  }, [languages, search]);

  const handleSelect = (code: LocaleCode) => {
    setLocale(code);
    setIsOpen(false);
    setSearch("");
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label={t("common.selectLanguage")}
        className="flex items-center gap-2 rounded-xl border border-black/10 bg-white/90 px-3.5 py-2 text-xs font-bold text-gray-800 shadow-sm backdrop-blur transition hover:border-emerald-500/40 hover:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
      >
        <span className="text-base">🌐</span>
        <span className="font-semibold text-gray-900">{currentLanguage.nativeName}</span>
        <span className="text-[10px] uppercase tracking-wider text-gray-400">
          ({currentLanguage.code})
        </span>
        <svg
          className={`h-3.5 w-3.5 text-gray-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Modal/Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[92vw] overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150 sm:w-96">
          {/* Header & Search */}
          <div className="border-b border-gray-100 bg-gray-50/80 p-3.5">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-black tracking-wide text-gray-800 uppercase">
                {t("common.selectLanguage")}
              </span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                {t("common.languagesCount")}
              </span>
            </div>

            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("firstVisit.searchPlaceholder")}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                autoFocus
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Language List */}
          <div className="max-h-72 overflow-y-auto p-2 divide-y divide-gray-50">
            {filteredLanguages.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400">
                {t("common.noLanguagesFound")} &ldquo;{search}&rdquo;
              </div>
            ) : (
              filteredLanguages.map((lang) => {
                const isSelected = lang.code === locale;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleSelect(lang.code)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition ${
                      isSelected
                        ? "bg-emerald-50 text-emerald-950 font-bold"
                        : "hover:bg-gray-50 text-gray-700 font-medium"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold">{lang.nativeName}</span>
                      <span className="text-xs text-gray-400">({lang.name})</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-semibold text-gray-500 uppercase">
                        {lang.script}
                      </span>
                      {isSelected && <span className="text-emerald-600 font-bold">✓</span>}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer note */}
          <div className="border-t border-gray-100 bg-gray-50/50 p-2.5 text-center text-[10px] text-gray-500">
            {t("firstVisit.tagline")}
          </div>
        </div>
      )}
    </div>
  );
}
