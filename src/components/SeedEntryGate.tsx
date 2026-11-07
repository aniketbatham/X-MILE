"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { audioEngine } from "./SeedAudioEngine";

interface SeedEntryGateProps {
  onEnter: (soundOn: boolean) => void;
  brandTagline?: string;
}

export default function SeedEntryGate({
  onEnter,
  brandTagline = "Every MILE Matters, Every FARMER Matters.",
}: SeedEntryGateProps) {
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [isDissolving, setIsDissolving] = useState(false);
  const holdStartRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const hasTriggeredRef = useRef(false);

  // Complete entrance sequence
  const completeGate = useCallback(
    (soundOn: boolean) => {
      if (hasTriggeredRef.current) return;
      hasTriggeredRef.current = true;
      setIsDissolving(true);

      if (soundOn) {
        audioEngine.setMuted(false);
        audioEngine.triggerEntryChime();
      } else {
        audioEngine.setMuted(true);
      }

      setTimeout(() => {
        onEnter(soundOn);
      }, 700);
    },
    [onEnter]
  );

  const handlePointerDown = () => {
    if (hasTriggeredRef.current) return;
    audioEngine.init();
    audioEngine.setMuted(false);
    setIsHolding(true);
    const startTime = performance.now();
    holdStartRef.current = startTime;

    const tick = () => {
      if (!holdStartRef.current) return;
      const elapsed = performance.now() - startTime;
      const targetDuration = 1100; // 1.1s smooth hold
      const progress = Math.min(1, elapsed / targetDuration);

      setHoldProgress(progress);
      audioEngine.setHoldProgress(progress);

      if (progress >= 1) {
        completeGate(true);
        return;
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
  };

  const handlePointerUp = () => {
    if (hasTriggeredRef.current) return;
    setIsHolding(false);
    holdStartRef.current = null;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    setHoldProgress(0);
    audioEngine.setHoldProgress(0);
  };

  // Keyboard accessibility (Space or Enter to hold/enter)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (!isHolding) {
        handlePointerDown();
      }
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      handlePointerUp();
    }
  };

  useEffect(() => {
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  const circumference = 2 * Math.PI * 46;
  const strokeDashoffset = circumference - holdProgress * circumference;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-between p-6 sm:p-10 select-none transition-opacity duration-700 bg-[#050608] ${
        isDissolving ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="X-MILE Entry Gate"
    >
      {/* Top Branding */}
      <div className="w-full flex items-center justify-between text-[#ede7db]/50 text-[10px] tracking-[0.22em] uppercase font-mono">
        <span className="font-semibold text-[#ede7db] tracking-[0.28em]">
          X-MILE
        </span>
        <span className="hidden sm:inline-block tracking-[0.16em]">
          {brandTagline}
        </span>
        <span>SEED // 01</span>
      </div>

      {/* Center Interactive Seed Awakening Zone */}
      <div className="flex flex-col items-center justify-center my-auto">
        <div
          role="button"
          tabIndex={0}
          aria-label="Press and hold the seed to awaken with audio"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          className="relative w-36 h-36 sm:w-44 sm:h-44 flex items-center justify-center cursor-pointer group outline-none"
        >
          {/* Radial breathing glow */}
          <div
            className={`absolute inset-0 rounded-full bg-[#ffb35c]/10 filter blur-xl transition-all duration-500 ${
              isHolding ? "scale-125 opacity-70 bg-[#ffb35c]/25" : "scale-95 opacity-30 animate-pulse"
            }`}
          />

          {/* SVG Progress Ring */}
          <svg
            className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
            viewBox="0 0 100 100"
          >
            {/* Background Track */}
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="#ede7db"
              strokeOpacity="0.08"
              strokeWidth="1.5"
            />
            {/* Interactive Progress Indicator */}
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="#ffb35c"
              strokeWidth="2.5"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-[stroke-dashoffset] duration-75 ease-out"
            />
          </svg>

          {/* Center Organic Seed Icon */}
          <div
            className={`relative z-10 transition-transform duration-300 ease-out ${
              isHolding ? "scale-90 text-[#ffb35c]" : "scale-100 text-[#ede7db]"
            }`}
          >
            <svg
              className="w-14 h-14 sm:w-16 sm:h-16 drop-shadow-[0_0_15px_rgba(255,179,92,0.4)]"
              viewBox="0 0 48 64"
              fill="none"
            >
              {/* Outer Tapered Seed Shell */}
              <path
                d="M24 2C24 2 44 26 44 42C44 53.0457 35.0457 62 24 62C12.9543 62 4 53.0457 4 42C4 26 24 2 24 2Z"
                stroke="currentColor"
                strokeWidth="1.75"
                fill="currentColor"
                fillOpacity={isHolding ? "0.2" : "0.05"}
              />
              {/* Internal Embryo / Vascular Seam */}
              <path
                d="M24 14V50M24 24C27.5 27 31 32 31 38M24 30C20.5 33 17 38 17 44"
                stroke="#ffb35c"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeOpacity={isHolding ? "0.95" : "0.4"}
              />
            </svg>
          </div>
        </div>

        {/* CTA Label */}
        <div className="mt-8 flex flex-col items-center text-center space-y-2 pointer-events-none">
          <div className="flex items-center space-x-2 text-[#ede7db] font-mono text-[11px] sm:text-xs tracking-[0.2em] uppercase font-medium">
            <span className="flex space-x-0.5 items-end h-3">
              <span className={`w-0.5 bg-[#ffb35c] rounded-full transition-all duration-300 ${isHolding ? "h-3 animate-bounce" : "h-1.5"}`} />
              <span className={`w-0.5 bg-[#ffb35c] rounded-full transition-all duration-300 ${isHolding ? "h-2.5 animate-bounce [animation-delay:100ms]" : "h-2.5"}`} />
              <span className={`w-0.5 bg-[#ffb35c] rounded-full transition-all duration-300 ${isHolding ? "h-3 animate-bounce [animation-delay:200ms]" : "h-1"}`} />
              <span className={`w-0.5 bg-[#ffb35c] rounded-full transition-all duration-300 ${isHolding ? "h-2 animate-bounce [animation-delay:300ms]" : "h-2"}`} />
            </span>
            <span>Press and hold the seed</span>
          </div>
          <p className="text-[#ede7db]/40 text-[10px] tracking-[0.16em] uppercase font-mono">
            Sound on · best with headphones
          </p>
        </div>
      </div>

      {/* Accessible Silent Continuation Button */}
      <div className="w-full flex justify-center pb-2">
        <button
          type="button"
          onClick={() => completeGate(false)}
          className="text-[#ede7db]/50 hover:text-[#ede7db] text-[11px] font-mono tracking-[0.18em] uppercase px-5 py-2.5 rounded-full border border-white/10 hover:border-white/25 transition-all duration-300 hover:bg-white/[0.03] focus:outline-none focus:ring-1 focus:ring-[#ffb35c]"
        >
          Continue in silence
        </button>
      </div>
    </div>
  );
}
