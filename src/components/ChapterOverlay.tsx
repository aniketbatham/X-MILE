"use client";

import React from "react";
import Link from "next/link";

export interface ChapterData {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  annotation: string;
  position: "top-center" | "top-left" | "top-right" | "middle-left" | "bottom-left" | "bottom-right" | "bottom-center" | "middle-center";
  featurePill?: string;
  range: readonly [number, number];
  season: string;
  day: number;
}

interface ChapterOverlayProps {
  currentChapter: ChapterData;
  progress: number;
  langTagline?: string;
  signInLabel?: string;
  signUpLabel?: string;
}

export default function ChapterOverlay({
  currentChapter,
  progress,
  langTagline = "Every MILE Matters, Every FARMER Matters.",
  signInLabel = "Sign In",
  signUpLabel = "Sign Up",
}: ChapterOverlayProps) {
  // Map positioning classes
  const getPositionClasses = (pos: ChapterData["position"]) => {
    switch (pos) {
      case "top-center":
        return "items-center text-center top-24 sm:top-28 inset-x-6 sm:inset-x-16";
      case "top-left":
        return "items-start text-left top-24 sm:top-28 left-6 sm:left-16 max-w-xl";
      case "top-right":
        return "items-end text-right top-24 sm:top-28 right-16 sm:right-28 max-w-xl";
      case "middle-left":
        return "items-start text-left top-1/2 -translate-y-1/2 left-6 sm:left-16 max-w-xl";
      case "middle-center":
        return "items-center text-center top-1/2 -translate-y-1/2 inset-x-6 sm:inset-x-16";
      case "bottom-left":
        return "items-start text-left bottom-20 sm:bottom-24 left-6 sm:left-16 max-w-xl";
      case "bottom-right":
        return "items-end text-right bottom-20 sm:bottom-24 right-16 sm:right-28 max-w-xl";
      case "bottom-center":
      default:
        return "items-center text-center bottom-20 sm:bottom-24 inset-x-6 sm:inset-x-16";
    }
  };

  const isFinalChapter = currentChapter.id === "again" || progress >= 0.94;

  return (
    <div
      key={currentChapter.id}
      className={`fixed pointer-events-none z-20 flex flex-col transition-all duration-700 ease-out select-none animate-fadeIn ${getPositionClasses(
        currentChapter.position
      )}`}
    >
      {/* Chapter Technical Annotation */}
      <div className="flex items-center space-x-2 text-[#ffb35c] font-mono text-[10px] sm:text-[11px] tracking-[0.24em] uppercase mb-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[#ffb35c] inline-block animate-pulse" />
        <span>{currentChapter.annotation}</span>
      </div>

      {/* Large Saol-Style Editorial Serif Heading */}
      <h1 className="font-serif text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-light tracking-tight text-[#ede7db] drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] leading-[1.08] mb-3">
        {currentChapter.title}
      </h1>

      {/* Poetic Subtitle / Agricultural Mission Narrative */}
      <p className="font-sans text-xs sm:text-sm md:text-base text-[#ede7db]/80 font-normal tracking-wide max-w-lg leading-relaxed">
        {currentChapter.subtitle}
      </p>

      {/* Optional Platform Feature Badge */}
      {currentChapter.featurePill && !isFinalChapter && (
        <div className="mt-4 inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-md text-[10px] font-mono tracking-[0.16em] text-[#ede7db]/60 uppercase">
          <span className="text-[#ffb35c] font-bold">X-MILE //</span>
          <span>{currentChapter.featurePill}</span>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────
          FINAL CHAPTER: X-MILE AUTHENTICATION GATEWAY
          ──────────────────────────────────────────────────────────── */}
      {isFinalChapter && (
        <div className="mt-6 sm:mt-8 flex flex-col items-center pointer-events-auto space-y-4 max-w-md mx-auto w-full">
          <p className="text-xs sm:text-sm font-sans text-[#ffb35c] tracking-widest uppercase font-semibold">
            {langTagline}
          </p>

          {/* Role Presentation Cards */}
          <div className="grid grid-cols-3 gap-2 w-full text-left my-2 font-mono text-[10px]">
            <div className="p-2.5 rounded-lg bg-black/50 border border-white/10 backdrop-blur-md">
              <span className="text-[#ffb35c] block font-semibold mb-0.5">FARMER</span>
              <span className="text-[#ede7db]/50 text-[9px] leading-tight block">Plot & crop inventory, AI quality assessment</span>
            </div>
            <div className="p-2.5 rounded-lg bg-black/50 border border-white/10 backdrop-blur-md">
              <span className="text-[#ffb35c] block font-semibold mb-0.5">BUYER</span>
              <span className="text-[#ede7db]/50 text-[9px] leading-tight block">Produce discovery, transparent procurement</span>
            </div>
            <div className="p-2.5 rounded-lg bg-black/50 border border-white/10 backdrop-blur-md">
              <span className="text-[#ffb35c] block font-semibold mb-0.5">TRANSPORT</span>
              <span className="text-[#ede7db]/50 text-[9px] leading-tight block">Job assignment, dispatched delivery tracking</span>
            </div>
          </div>

          {/* Primary Authentication Action Buttons */}
          <div className="flex items-center space-x-3 w-full justify-center pt-2">
            <Link
              href="/login"
              className="px-6 py-2.5 rounded-full bg-[#ffb35c] hover:bg-[#e0a05c] text-black font-semibold text-xs tracking-[0.16em] uppercase transition-all duration-300 shadow-[0_0_20px_rgba(255,179,92,0.35)] hover:shadow-[0_0_25px_rgba(255,179,92,0.6)]"
            >
              {signInLabel}
            </Link>
            <Link
              href="/register"
              className="px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-[#ede7db] font-medium text-xs tracking-[0.16em] uppercase transition-all duration-300 backdrop-blur-md"
            >
              {signUpLabel}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
