"use client";

import React, { useState } from "react";
import Link from "next/link";

interface ChapterMeta {
  id: string;
  number: string;
  title: string;
  season: string;
  day: number;
}

interface LifecycleHUDProps {
  currentChapterIndex: number;
  progress: number;
  chapters: ChapterMeta[];
  onSelectChapter: (index: number) => void;
  isSoundOn: boolean;
  onToggleSound: () => void;
  languageSelector: React.ReactNode;
  signInLabel?: string;
}

export default function LifecycleHUD({
  currentChapterIndex,
  progress,
  chapters,
  onSelectChapter,
  isSoundOn,
  onToggleSound,
  languageSelector,
  signInLabel = "Sign In",
}: LifecycleHUDProps) {
  const currentChapter = chapters[currentChapterIndex] || chapters[0];
  const [hoveredChapter, setHoveredChapter] = useState<number | null>(null);

  // Format day counter e.g. "000", "014", "118"
  const formattedDay = String(currentChapter.day).padStart(3, "0");

  return (
    <div className="fixed inset-0 pointer-events-none z-30 flex flex-col justify-between p-4 sm:p-7 md:p-9 font-mono text-xs select-none">
      {/* ────────────────────────────────────────────────────────────
          TOP NAVIGATION BAR
          ──────────────────────────────────────────────────────────── */}
      <header className="w-full flex items-center justify-between pointer-events-auto">
        {/* Top-Left: Biological Agrarian Calendar */}
        <div className="flex items-center space-x-3 text-[#ede7db]/70">
          <div className="flex items-baseline space-x-1.5">
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#ede7db]/50">
              DAY
            </span>
            <span className="font-semibold text-sm text-[#ede7db] tracking-[0.14em]">
              {formattedDay}
            </span>
            <span className="text-[#ede7db]/30 mx-1">·</span>
            <span className="uppercase text-[11px] tracking-[0.18em] text-[#ffb35c]">
              {currentChapter.season}
            </span>
          </div>
          <span className="hidden md:inline-block text-[#ede7db]/20">|</span>
          <span className="hidden md:inline-block text-[10px] tracking-[0.24em] text-[#ede7db]/40">
            N° 06040 // X-MILE
          </span>
        </div>

        {/* Top-Center: Chapter Index Telemetry */}
        <div className="hidden sm:flex items-center space-x-2 bg-black/40 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 text-[11px] text-[#ede7db]/80 tracking-[0.2em]">
          <span className="text-[#ffb35c] font-semibold">{currentChapter.number}</span>
          <span className="text-[#ede7db]/30">/</span>
          <span className="text-[#ede7db]/50">17</span>
        </div>

        {/* Top-Right: Sound Toggle, Language Selector & Auth */}
        <div className="flex items-center space-x-3">
          {/* Sound Toggle Button */}
          <button
            type="button"
            onClick={onToggleSound}
            aria-label={isSoundOn ? "Mute audio" : "Enable sound"}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 hover:border-white/25 text-[#ede7db]/80 hover:text-[#ede7db] transition-all text-[10px] sm:text-[11px] tracking-[0.18em] uppercase"
          >
            <span className="flex space-x-0.5 items-end h-2.5">
              <span
                className={`w-0.5 bg-[#ffb35c] rounded-full transition-all duration-200 ${
                  isSoundOn ? "h-2.5 animate-pulse" : "h-1 opacity-40"
                }`}
              />
              <span
                className={`w-0.5 bg-[#ffb35c] rounded-full transition-all duration-200 ${
                  isSoundOn ? "h-2 animate-pulse [animation-delay:150ms]" : "h-1 opacity-40"
                }`}
              />
              <span
                className={`w-0.5 bg-[#ffb35c] rounded-full transition-all duration-200 ${
                  isSoundOn ? "h-3 animate-pulse [animation-delay:300ms]" : "h-1 opacity-40"
                }`}
              />
              <span
                className={`w-0.5 bg-[#ffb35c] rounded-full transition-all duration-200 ${
                  isSoundOn ? "h-1.5 animate-pulse [animation-delay:450ms]" : "h-1 opacity-40"
                }`}
              />
            </span>
            <span className="hidden xs:inline">{isSoundOn ? "Sound On" : "Sound Off"}</span>
          </button>

          {/* Embedded Language Selector */}
          <div className="relative">{languageSelector}</div>

          {/* Direct Sign-In Shortcut */}
          <Link
            href="/login"
            className="hidden md:inline-flex items-center px-4 py-1.5 rounded-full bg-[#ede7db]/10 hover:bg-[#ede7db]/20 border border-white/15 text-[#ede7db] text-[11px] tracking-[0.18em] uppercase transition-all duration-300"
          >
            {signInLabel}
          </Link>
        </div>
      </header>

      {/* ────────────────────────────────────────────────────────────
          RIGHT-SIDE ORGANIC ROOT RAIL / SCRUBBER
          ──────────────────────────────────────────────────────────── */}
      <aside className="absolute right-3 sm:right-6 md:right-8 top-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-auto select-none">
        {/* Dynamic Vertical Root Stem Rail */}
        <div className="relative flex flex-col items-center py-4">
          {/* Ghost Line */}
          <div className="absolute top-0 bottom-0 w-[1px] bg-[#ede7db]/10" />
          {/* Active Growth Line */}
          <div
            className="absolute top-0 w-[1.5px] bg-[#ffb35c] shadow-[0_0_8px_rgba(255,179,92,0.8)] transition-all duration-150"
            style={{ height: `${Math.min(100, Math.max(0, progress * 100))}%` }}
          />

          {/* 17 Chapter Nodes */}
          <div className="relative flex flex-col justify-between h-[52vh] min-h-[320px] max-h-[500px]">
            {chapters.map((ch, idx) => {
              const isActive = idx === currentChapterIndex;
              const isPast = idx <= currentChapterIndex;
              const isHovered = hoveredChapter === idx;
              const isLeftLeaf = idx % 2 === 0;

              return (
                <div
                  key={ch.id}
                  className="relative flex items-center justify-center cursor-pointer group"
                  onClick={() => onSelectChapter(idx)}
                  onMouseEnter={() => setHoveredChapter(idx)}
                  onMouseLeave={() => setHoveredChapter(null)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Jump to chapter ${ch.number}: ${ch.title}`}
                >
                  {/* Chapter Label Tooltip */}
                  {(isActive || isHovered) && (
                    <div className="absolute right-6 whitespace-nowrap bg-black/85 backdrop-blur-md px-2.5 py-1 rounded border border-[#ffb35c]/30 text-[10px] text-[#ede7db] tracking-[0.16em] uppercase flex items-center space-x-1.5 shadow-lg animate-fadeIn pointer-events-none">
                      <span className="text-[#ffb35c] font-semibold">{ch.number}</span>
                      <span>{ch.title}</span>
                    </div>
                  )}

                  {/* Organic Bud Node */}
                  <div
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      isActive
                        ? "bg-[#ffb35c] scale-150 ring-4 ring-[#ffb35c]/25 shadow-[0_0_10px_#ffb35c]"
                        : isPast
                        ? "bg-[#ede7db]/80 scale-110"
                        : "bg-[#ede7db]/20 group-hover:bg-[#ede7db]/50 scale-90"
                    }`}
                  />

                  {/* Organic Leaf Sprout SVG */}
                  {isPast && (
                    <svg
                      className={`absolute w-3 h-3 text-[#ffb35c]/70 pointer-events-none transition-transform duration-300 ${
                        isLeftLeaf
                          ? "-left-3.5 -scale-x-100"
                          : "-right-3.5"
                      }`}
                      viewBox="0 0 12 12"
                      fill="currentColor"
                    >
                      <path d="M0 6C3 4 8 2 11 0C10 4 8 9 5 11C2 9 0 7 0 6Z" />
                    </svg>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      {/* ────────────────────────────────────────────────────────────
          BOTTOM CUE & BRAND FOOTER
          ──────────────────────────────────────────────────────────── */}
      <footer className="w-full flex items-end justify-between pointer-events-auto">
        <div className="text-[10px] text-[#ede7db]/40 tracking-[0.2em] uppercase font-mono">
          <span>X-MILE</span>
          <span className="mx-2">·</span>
          <span>AGRICULTURAL LIFECYCLE</span>
        </div>

        {/* Dynamic Scroll Cue */}
        <div className="flex items-center space-x-2 text-[#ede7db]/60 text-[10px] tracking-[0.24em] uppercase">
          <span className="hidden sm:inline">SCROLL</span>
          <svg
            className="w-4 h-4 text-[#ffb35c] animate-bounce"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </div>
      </footer>
    </div>
  );
}
