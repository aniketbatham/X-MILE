"use client";

import React, { useEffect, useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { LocaleCode } from "@/i18n/types";

const VISITED_KEY = "xmile_has_visited";

export default function FirstVisitModal() {
  const { locale, setLocale, languages, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<LocaleCode>(locale);
  const [search, setSearch] = useState("");

  useEffect(() => {
    try {
      const hasVisited = localStorage.getItem(VISITED_KEY);
      if (!hasVisited) {
        setIsOpen(true);
      }
    } catch {
      // storage unavailable
    }
  }, []);

  const handleConfirm = () => {
    setLocale(selected);
    try {
      localStorage.setItem(VISITED_KEY, "true");
    } catch {
      // storage unavailable
    }
    setIsOpen(false);
  };

  const filtered = languages.filter((lang) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      lang.name.toLowerCase().includes(q) ||
      lang.nativeName.toLowerCase().includes(q) ||
      lang.script.toLowerCase().includes(q) ||
      lang.region.toLowerCase().includes(q)
    );
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-gray-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-100 bg-gradient-to-br from-[#172019] to-[#25382b] p-6 text-white text-center relative">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 border border-emerald-400/30 text-2xl">
            🌱
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">{t("firstVisit.title")}</h2>
          <p className="mt-1 text-xs sm:text-sm text-gray-300 font-medium">
            {t("firstVisit.subtitle")}
          </p>
          <p className="mt-2 text-[11px] font-bold uppercase tracking-wider text-emerald-400">
            {t("firstVisit.tagline")}
          </p>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("firstVisit.searchPlaceholder")}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Language Grid */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {filtered.map((lang) => {
            const isChosen = lang.code === selected;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => setSelected(lang.code)}
                className={`flex items-center justify-between p-3 rounded-2xl border text-left transition ${
                  isChosen
                    ? "border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-500/20 text-emerald-950 font-bold"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-800"
                }`}
              >
                <div>
                  <div className="text-sm font-bold">{lang.nativeName}</div>
                  <div className="text-[11px] text-gray-400 font-medium">{lang.name}</div>
                </div>
                <div className="text-right">
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-semibold text-gray-500 uppercase">
                    {lang.script}
                  </span>
                  {isChosen && <div className="text-emerald-600 text-xs font-bold mt-1">✓</div>}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 bg-gray-50 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-gray-500 text-center sm:text-left">
            {t("firstVisit.changeAnytime")}
          </p>

          <button
            type="button"
            onClick={handleConfirm}
            className="w-full sm:w-auto rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition"
          >
            {t("firstVisit.continueButton")}
          </button>
        </div>
      </div>
    </div>
  );
}
