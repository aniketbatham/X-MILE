"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";

interface CurtainRevealProps {
  onOpenChange?: (isOpen: boolean) => void;
  scrollProgress?: number;
  className?: string;
  labels?: {
    pullPrompt: string;
    tagline: string;
    chapterAnnotation: string;
  };
}

export default function CurtainReveal({
  onOpenChange,
  scrollProgress = 0,
  className = "",
  labels = {
    pullPrompt: "Drag curtain or scroll to enter",
    tagline: "Every MILE Matters, Every FARMER Matters.",
    chapterAnnotation: "AGRICULTURAL LIFECYCLE // 001",
  },
}: CurtainRevealProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 0.0 = closed curtain, 1.0 = fully swept open
  const [pullProgress, setPullProgress] = useState(0);
  const [isOpened, setIsOpened] = useState(false);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const currentPullRef = useRef(0);
  const targetPullRef = useRef(0);
  const grabPointXRef = useRef(0);
  const grabPointYRef = useRef(0.48); // Near statue hand level
  const animFrameRef = useRef<number | null>(null);
  const prefersReducedMotionRef = useRef(false);

  // Synchronize target pull with page scroll progress
  useEffect(() => {
    if (scrollProgress > 0.015 && !isOpened) {
      const scrollPull = Math.min(1, scrollProgress / 0.07);
      targetPullRef.current = Math.max(targetPullRef.current, scrollPull);
      if (scrollPull >= 0.85) {
        const timer = setTimeout(() => {
          setIsOpened(true);
          onOpenChange?.(true);
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [scrollProgress, isOpened, onOpenChange]);

  // Pointer interactions (mouse, trackpad, touch)
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (isOpened) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const clickX = e.clientX - rect.left;
      const curtainStartX = rect.width * 0.45;

      // Allow dragging if clicked anywhere on the right half or near the curtain
      if (clickX >= curtainStartX - 100) {
        isDraggingRef.current = true;
        dragStartXRef.current = e.clientX;
        grabPointXRef.current = e.clientX;
        grabPointYRef.current = Math.min(
          0.85,
          Math.max(0.15, (e.clientY - rect.top) / rect.height)
        );
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      }
    },
    [isOpened]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingRef.current || isOpened) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      grabPointXRef.current = e.clientX;
      grabPointYRef.current = Math.min(
        0.85,
        Math.max(0.15, (e.clientY - rect.top) / rect.height)
      );

      const pullDistance = Math.max(0, dragStartXRef.current - e.clientX);
      const pullFraction = pullDistance / (rect.width * 0.35);
      targetPullRef.current = Math.min(1, Math.max(0, pullFraction));

      // If dragged past threshold, complete the opening
      if (pullFraction >= 0.5) {
        targetPullRef.current = 1;
        isDraggingRef.current = false;
        setIsOpened(true);
        onOpenChange?.(true);
      }
    },
    [isOpened, onOpenChange]
  );

  const handlePointerUp = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    if (targetPullRef.current > 0.2) {
      targetPullRef.current = 1;
      setIsOpened(true);
      onOpenChange?.(true);
    } else {
      targetPullRef.current = 0;
    }
  }, [onOpenChange]);

  const handleDirectOpen = () => {
    targetPullRef.current = 1;
    setIsOpened(true);
    onOpenChange?.(true);
  };

  // Canvas animation for fluid chromatic dispersion, caustic glow, and spectral fringes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    if (typeof window !== "undefined") {
      prefersReducedMotionRef.current = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
    }

    let width = 0;
    let height = 0;

    const handleResize = () => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    const startTime = performance.now();

    const render = (now: number) => {
      const elapsed = now - startTime;

      // Smooth lerp to target pull progress
      const diff = targetPullRef.current - currentPullRef.current;
      if (!prefersReducedMotionRef.current) {
        currentPullRef.current += diff * (isDraggingRef.current ? 0.3 : 0.12);
      } else {
        currentPullRef.current = targetPullRef.current;
      }

      setPullProgress(currentPullRef.current);

      ctx.clearRect(0, 0, width, height);

      const p = currentPullRef.current;

      // Chromatic dispersion and liquid prism ripple effect
      const rippleActive = isDraggingRef.current || (p > 0.02 && p < 0.9);
      if (rippleActive) {
        // Statue hand grab coordinate in viewport space
        const statueHandX = isDraggingRef.current
          ? grabPointXRef.current
          : width * (width < 640 ? 0.58 : 0.68) + p * width * 0.4;
        const statueHandY = height * (width < 640 ? 0.62 : grabPointYRef.current);

        const pulse = Math.sin(elapsed * 0.009);
        const rippleRadius = 75 + pulse * 18 + p * 50;

        ctx.save();

        // 1. Radiant white-hot caustic core
        const coreGradient = ctx.createRadialGradient(
          statueHandX,
          statueHandY,
          2,
          statueHandX,
          statueHandY,
          rippleRadius
        );
        coreGradient.addColorStop(0, "rgba(255, 255, 255, 0.95)");
        coreGradient.addColorStop(0.25, "rgba(253, 224, 71, 0.85)"); // Radiant amber
        coreGradient.addColorStop(0.55, "rgba(6, 182, 212, 0.55)");  // Electric cyan
        coreGradient.addColorStop(0.85, "rgba(236, 72, 153, 0.35)"); // Vivid magenta
        coreGradient.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.fillStyle = coreGradient;
        ctx.beginPath();
        ctx.arc(statueHandX, statueHandY, rippleRadius, 0, Math.PI * 2);
        ctx.fill();

        // 2. Spectral RGB Dispersion Fringes (Horizontal Glitch Aberrations)
        ctx.lineWidth = 3;
        ctx.lineCap = "round";

        // Cyan Fringe Wave
        ctx.strokeStyle = "rgba(6, 182, 212, 0.85)";
        ctx.beginPath();
        for (let i = -14; i <= 14; i++) {
          const dy = i * 7;
          const dx = Math.sin(i * 0.45 + elapsed * 0.015) * 22;
          ctx.lineTo(statueHandX + dx - 4, statueHandY + dy);
        }
        ctx.stroke();

        // Magenta Fringe Wave
        ctx.strokeStyle = "rgba(236, 72, 153, 0.85)";
        ctx.beginPath();
        for (let i = -14; i <= 14; i++) {
          const dy = i * 7;
          const dx = Math.sin(i * 0.45 + elapsed * 0.015 + 1.2) * 22;
          ctx.lineTo(statueHandX + dx + 4, statueHandY + dy);
        }
        ctx.stroke();

        // 3. Radiant Spectral Light Rays
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.65)";
        for (let r = 0; r < 8; r++) {
          const angle = (r * Math.PI) / 4 + elapsed * 0.003;
          ctx.beginPath();
          ctx.moveTo(statueHandX, statueHandY);
          ctx.lineTo(
            statueHandX + Math.cos(angle) * (rippleRadius * 1.5),
            statueHandY + Math.sin(angle) * (rippleRadius * 1.5)
          );
          ctx.stroke();
        }

        ctx.restore();
      }

      // If fully swept open, cease render loop
      if (currentPullRef.current >= 0.99 && isOpened) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpened]);

  // When opened, pass all pointer events through to the underlying page
  const containerPointerEvents = pullProgress >= 0.95 ? "none" : "auto";

  // Curtain sweep translation and scale calculations
  const sweepTranslateX = pullProgress * 110; // Shifts right off-screen
  const sweepOpacity = Math.max(0, 1 - Math.max(0, (pullProgress - 0.7) / 0.3));

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`fixed inset-0 z-40 select-none overflow-hidden cursor-grab active:cursor-grabbing transition-opacity duration-500 ${
        pullProgress >= 0.98 ? "opacity-0 pointer-events-none" : "opacity-100"
      } ${className}`}
      style={{ pointerEvents: containerPointerEvents }}
    >
      {/* ────────────────────────────────────────────────────────────
          STAGE BACKGROUND: DEEP EDITORIAL BOTANICAL GREEN
      ──────────────────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-[#030a05] via-[#05150a] to-[#0a1e12] transition-opacity duration-500"
        style={{ opacity: Math.max(0, 1 - pullProgress * 1.2) }}
      />

      {/* Decorative Technical Grid Overlay */}
      <div
        className="absolute inset-0 opacity-[0.08] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, #4ade80 1px, transparent 1px), linear-gradient(to bottom, #4ade80 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          opacity: Math.max(0, 0.08 * (1 - pullProgress * 1.4)),
        }}
      />

      {/* ────────────────────────────────────────────────────────────
          LEFT SIDE: EDITORIAL TELEMETRY & BRANDING
      ──────────────────────────────────────────────────────────── */}
      <div
        className="absolute inset-y-0 left-0 w-full sm:w-[54%] pointer-events-none p-5 sm:p-14 flex flex-col justify-between transition-opacity duration-300 z-20"
        style={{ opacity: Math.max(0, 1 - pullProgress * 1.5) }}
      >
        {/* Top Annotation Badge */}
        <div className="pt-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-[#081f11]/90 border border-emerald-400/40 backdrop-blur-md text-[10px] sm:text-[11px] font-mono tracking-widest text-emerald-300 uppercase shadow-lg">
            <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{labels.chapterAnnotation}</span>
            <span className="text-emerald-500/70 hidden sm:inline">{"//"} 12.9716° N</span>
          </div>
        </div>

        {/* Central Editorial Typography */}
        <div className="max-w-[42%] sm:max-w-xl space-y-2 sm:space-y-4 my-auto">
          <div className="inline-block">
            <span className="font-mono text-[9px] sm:text-sm tracking-widest text-emerald-400 font-bold uppercase block mb-0.5 sm:mb-1">
              X-MILE PLATFORM
            </span>
            <h1 className="text-2xl sm:text-7xl md:text-8xl font-serif tracking-tight text-white drop-shadow-xl font-normal leading-[0.95]">
              THE SEED
            </h1>
          </div>

          <p className="text-xs sm:text-2xl md:text-3xl font-light text-stone-200 tracking-wide font-serif italic">
            &ldquo;Every MILE begins in the soil.&rdquo;
          </p>

          <p className="text-[10px] sm:text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-amber-200 to-emerald-300 pt-0.5 sm:pt-1 leading-tight">
            {labels.tagline}
          </p>

          <p className="text-xs text-stone-400 font-sans leading-relaxed max-w-sm hidden sm:block">
            Connecting direct farmer harvest inventory, verified commercial buyer bids, and rural transport fleets through a unified sovereign agricultural exchange.
          </p>
        </div>

        {/* Interactive Drag & Pull Prompt Button */}
        <div className="pb-6 pointer-events-auto">
          <button
            type="button"
            onClick={handleDirectOpen}
            className="group inline-flex items-center gap-2 sm:gap-3 px-3.5 sm:px-5 py-2 sm:py-3 rounded-2xl bg-[#0b2414]/90 hover:bg-[#11351e] border border-emerald-400/40 text-emerald-300 hover:text-white font-mono text-[10px] sm:text-xs tracking-wider uppercase shadow-2xl backdrop-blur-md transition active:scale-[0.98]"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="hidden sm:inline">{labels.pullPrompt}</span>
            <span className="sm:hidden">DRAG OR SCROLL</span>
            <span className="text-sm sm:text-base group-hover:translate-x-1.5 transition-transform">
              →
            </span>
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────
          RIGHT SIDE: THE CLASSICAL GUARDIAN & HEAVY DRAPERY VEIL
          (Real Master Classical Oil Artwork from Reference Video 1)
      ──────────────────────────────────────────────────────────── */}
      <div
        className="absolute inset-y-0 right-0 w-[72%] sm:w-[62%] pointer-events-none flex items-end justify-end overflow-hidden transition-transform duration-100 ease-out z-10"
        style={{
          transform: `translateX(${sweepTranslateX}%)`,
          opacity: sweepOpacity,
        }}
      >
        {/* Soft Ambient Spotlight Behind Statue */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full bg-emerald-500/10 blur-[100px] pointer-events-none" />

        {/* The Master Classical Artwork */}
        <div className="relative w-full h-[65vh] sm:h-[94vh] max-w-3xl flex items-end justify-end pr-0 sm:pr-4">
          <Image
            src="/images/guardian_curtain_master.png"
            alt="Classical guardian holding agricultural drapery veil"
            width={570}
            height={730}
            priority
            className="h-full w-auto object-contain object-bottom drop-shadow-[0_25px_50px_rgba(0,0,0,0.85)] filter contrast-[1.05]"
          />
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────
          CANVAS CHROMATIC ABERRATION & PRISM LIGHT RIPPLE LAYER
      ──────────────────────────────────────────────────────────── */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-30"
        style={{ touchAction: "none" }}
        aria-hidden="true"
      />
    </div>
  );
}
