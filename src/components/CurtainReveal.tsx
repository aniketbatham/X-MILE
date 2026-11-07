"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // 0.0 = fully closed (covering right side), 1.0 = fully swept open
  const [pullProgress, setPullProgress] = useState(0);
  const [isOpened, setIsOpened] = useState(false);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const currentPullRef = useRef(0);
  const targetPullRef = useRef(0);
  const grabPointXRef = useRef(0); // Viewport X of grab point
  const grabPointYRef = useRef(0.5); // Normalized Y grab position (0.5 = center)
  const animFrameRef = useRef<number | null>(null);
  const prefersReducedMotionRef = useRef(false);

  // Synchronize target pull with scroll progress
  useEffect(() => {
    if (scrollProgress > 0.015 && !isOpened) {
      const scrollPull = Math.min(1, scrollProgress / 0.08);
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

  // Pointer interactions with tactile drag tracking
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (isOpened) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clickX = e.clientX - rect.left;
    const curtainEdgeX = rect.width * 0.58;

    // Generous grab area: anywhere from 200px left of the curtain edge up to the right edge
    if (clickX >= curtainEdgeX - 220) {
      isDraggingRef.current = true;
      dragStartXRef.current = e.clientX;
      grabPointXRef.current = e.clientX;
      grabPointYRef.current = Math.min(0.85, Math.max(0.15, (e.clientY - rect.top) / rect.height));
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    }
  }, [isOpened]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current || isOpened) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    grabPointXRef.current = e.clientX;
    grabPointYRef.current = Math.min(0.85, Math.max(0.15, (e.clientY - rect.top) / rect.height));

    const pullDistanceLeft = Math.max(0, dragStartXRef.current - e.clientX);
    const pullDistanceRight = Math.max(0, e.clientX - dragStartXRef.current);

    // If pulled left by more than 30% of screen width, or dragged right past threshold, trigger full open
    if (pullDistanceLeft > rect.width * 0.32 || pullDistanceRight > rect.width * 0.25) {
      targetPullRef.current = 1;
      isDraggingRef.current = false;
      setIsOpened(true);
      onOpenChange?.(true);
    }
  }, [isOpened, onOpenChange]);

  const handlePointerUp = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    const pulledDistance = Math.abs(dragStartXRef.current - grabPointXRef.current);
    if (pulledDistance > 65) {
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

      // Spring / lerp towards target pull
      const diff = targetPullRef.current - currentPullRef.current;
      if (!prefersReducedMotionRef.current) {
        currentPullRef.current += diff * (isDraggingRef.current ? 0.35 : 0.12);
      } else {
        currentPullRef.current = targetPullRef.current;
      }

      setPullProgress(currentPullRef.current);

      ctx.clearRect(0, 0, width, height);

      // If fully open and faded out, stop drawing
      if (currentPullRef.current >= 0.999 && isOpened) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      const p = currentPullRef.current;
      const curtainAlpha = Math.max(0, 1 - Math.max(0, (p - 0.75) / 0.25));

      ctx.save();
      ctx.globalAlpha = curtainAlpha;

      // ────────────────────────────────────────────────────────────
      // 1. NEOCLASSICAL MARBLE PLINTH (Base)
      // ────────────────────────────────────────────────────────────
      const plinthY = height * 0.76;
      const plinthW = width * 0.45;
      const plinthX = width * 0.55 + p * width * 0.35; // Shifts right as pulled

      // Marble cornice gradient
      const marbleGrad = ctx.createLinearGradient(plinthX, plinthY, plinthX, height);
      marbleGrad.addColorStop(0, "#f5f5f4"); // Stone cornice top
      marbleGrad.addColorStop(0.15, "#e7e5e4");
      marbleGrad.addColorStop(0.65, "#d6d3d1");
      marbleGrad.addColorStop(1, "#a8a29e");

      ctx.fillStyle = marbleGrad;
      ctx.beginPath();
      ctx.moveTo(plinthX, plinthY);
      ctx.lineTo(width, plinthY);
      ctx.lineTo(width, height);
      ctx.lineTo(plinthX, height);
      ctx.closePath();
      ctx.fill();

      // Plinth upper architectural molding rim
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(plinthX, plinthY, width - plinthX, 3);
      ctx.fillStyle = "#78716c";
      ctx.fillRect(plinthX, plinthY + 3, width - plinthX, 2);

      // ────────────────────────────────────────────────────────────
      // 2. THE CLASSICAL DRAPED STATUE FIGURE (Neoclassical Guardian)
      // Standing on plinth, facing left, holding curtain edge
      // ────────────────────────────────────────────────────────────
      const figureX = plinthX + plinthW * 0.18 - p * 40;
      const figureY = plinthY;
      const figureScale = Math.min(height * 0.62, 540) / 480;

      ctx.save();
      ctx.translate(figureX, figureY);
      ctx.scale(figureScale, figureScale);

      // Figure drop shadow onto plinth
      ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
      ctx.beginPath();
      ctx.ellipse(25, -2, 55, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Classical flowing white toga (Chiton)
      const togaGrad = ctx.createLinearGradient(-40, -420, 80, 0);
      togaGrad.addColorStop(0, "#ffffff");
      togaGrad.addColorStop(0.4, "#f5f5f4");
      togaGrad.addColorStop(0.75, "#e7e5e4");
      togaGrad.addColorStop(1, "#d6d3d1");

      ctx.fillStyle = togaGrad;
      ctx.beginPath();
      // Flowing drapery silhouette
      ctx.moveTo(10, -420); // Head/neck base
      ctx.bezierCurveTo(45, -400, 65, -340, 55, -200); // Right flank
      ctx.bezierCurveTo(70, -100, 85, -20, 60, 0); // Hem bottom
      ctx.lineTo(-25, 0); // Hem base
      ctx.bezierCurveTo(-50, -120, -45, -280, -35, -390); // Left flank
      ctx.closePath();
      ctx.fill();

      // Deep sculptural drapery fold creases (Chiaroscuro)
      ctx.strokeStyle = "rgba(120, 113, 108, 0.65)";
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";

      // Vertical fluted robe folds
      ctx.beginPath();
      ctx.moveTo(10, -380);
      ctx.quadraticCurveTo(20, -200, 35, 0);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-10, -370);
      ctx.quadraticCurveTo(-15, -190, 5, 0);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-25, -350);
      ctx.quadraticCurveTo(-35, -180, -20, 0);
      ctx.stroke();

      // Rich Crimson / Terracotta Agricultural Sash (Himation across waist & shoulder)
      const sashGrad = ctx.createLinearGradient(-30, -310, 45, -180);
      sashGrad.addColorStop(0, "#b91c1c"); // Radiant crimson
      sashGrad.addColorStop(0.5, "#991b1b");
      sashGrad.addColorStop(1, "#7f1d1d");

      ctx.fillStyle = sashGrad;
      ctx.beginPath();
      ctx.moveTo(-32, -310);
      ctx.bezierCurveTo(0, -290, 35, -260, 45, -200);
      ctx.bezierCurveTo(50, -170, 35, -150, 15, -175);
      ctx.bezierCurveTo(-15, -210, -40, -260, -32, -310);
      ctx.closePath();
      ctx.fill();

      // Neoclassical Head & Laurel Crown Profile
      ctx.fillStyle = "#f5d0b5"; // Warm marble skintone
      ctx.beginPath();
      ctx.arc(8, -445, 22, 0, Math.PI * 2);
      ctx.fill();

      // Golden laurel wreath / head contour
      ctx.fillStyle = "#eab308";
      ctx.beginPath();
      ctx.arc(6, -455, 14, 0, Math.PI * 2);
      ctx.fill();

      // Classical hair curls
      ctx.fillStyle = "#78350f";
      ctx.beginPath();
      ctx.arc(10, -448, 16, Math.PI * 0.4, Math.PI * 1.5);
      ctx.fill();

      // Left Arm extended holding the curtain
      const armPullX = 65 - p * 80;
      const armPullY = -270 + (grabPointYRef.current - 0.5) * 80;

      ctx.strokeStyle = "#f5d0b5";
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(35, -360); // Shoulder
      ctx.quadraticCurveTo(50, -320, armPullX, armPullY); // Arm reaching to curtain
      ctx.stroke();

      // Hand clutching curtain edge
      ctx.fillStyle = "#f5d0b5";
      ctx.beginPath();
      ctx.arc(armPullX, armPullY, 9, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // ────────────────────────────────────────────────────────────
      // 3. HEAVY TEXTURED FABRIC CURTAIN (Cloth Simulation)
      // Folds, shadow channels, and dynamic pulling distortion
      // ────────────────────────────────────────────────────────────
      // Base curtain edge starts at ~58% width, pulled toward the right/left
      const baseEdgeX = width * 0.58;
      const pullOffset = p * (width * 0.85);
      const edgeX = baseEdgeX + pullOffset;
      const grabScreenY = height * grabPointYRef.current;

      // Draw Drapery Fabric Body
      ctx.save();

      // Fabric dark charcoal / heather weave gradient
      const fabricGrad = ctx.createLinearGradient(edgeX, 0, width, 0);
      fabricGrad.addColorStop(0, "#475569"); // Leading edge
      fabricGrad.addColorStop(0.15, "#334155"); // Tubular fold valley
      fabricGrad.addColorStop(0.4, "#64748b"); // Tubular fold ridge
      fabricGrad.addColorStop(0.7, "#1e293b"); // Deep inner fold
      fabricGrad.addColorStop(1, "#0f172a");

      ctx.fillStyle = fabricGrad;
      ctx.beginPath();
      ctx.moveTo(edgeX, 0);

      // Organic tension folds along the curtain edge influenced by the grab point
      let tensionPeakX = edgeX;
      if (isDraggingRef.current) {
        tensionPeakX = Math.min(edgeX, grabPointXRef.current);
      } else {
        tensionPeakX = edgeX - (1 - p) * (p > 0.05 ? 40 : 15);
      }

      ctx.bezierCurveTo(
        edgeX + 25,
        grabScreenY * 0.4,
        tensionPeakX,
        grabScreenY * 0.8,
        tensionPeakX,
        grabScreenY
      );
      ctx.bezierCurveTo(
        tensionPeakX,
        grabScreenY * 1.2,
        edgeX + 15,
        height * 0.8,
        edgeX + 35,
        height
      );
      ctx.lineTo(width, height);
      ctx.lineTo(width, 0);
      ctx.closePath();
      ctx.fill();

      // Three-dimensional vertical tubular cloth folds
      const foldCount = 6;
      for (let f = 1; f <= foldCount; f++) {
        const foldProgress = f / foldCount;
        const fx = edgeX + (width - edgeX) * foldProgress;

        // Shadow trough
        const troughGrad = ctx.createLinearGradient(fx - 18, 0, fx + 18, 0);
        troughGrad.addColorStop(0, "rgba(15, 23, 42, 0.7)");
        troughGrad.addColorStop(0.5, "rgba(15, 23, 42, 0)");
        troughGrad.addColorStop(1, "rgba(255, 255, 255, 0.15)"); // Specular cloth rim

        ctx.fillStyle = troughGrad;
        ctx.beginPath();
        ctx.moveTo(fx - 15, 0);
        ctx.quadraticCurveTo(fx + Math.sin(f + elapsed * 0.001) * 8, height * 0.5, fx - 8, height);
        ctx.lineTo(fx + 18, height);
        ctx.quadraticCurveTo(fx + 25, height * 0.5, fx + 15, 0);
        ctx.closePath();
        ctx.fill();
      }

      // ────────────────────────────────────────────────────────────
      // 4. CHROMATIC DISPERSION & LIQUID LIGHT RIPPLE (Grab Effect)
      // Recreates the vivid spectral refraction seen in the reference!
      // ────────────────────────────────────────────────────────────
      const rippleActive = isDraggingRef.current || (p > 0.05 && p < 0.85);

      if (rippleActive) {
        const rippleX = tensionPeakX;
        const rippleY = grabScreenY;
        const rippleSize = 80 + Math.sin(elapsed * 0.008) * 15;

        // Spectral RGB dispersion fringes
        // Cyan / Blue fringe
        ctx.strokeStyle = "rgba(6, 182, 212, 0.85)";
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        for (let i = -12; i <= 12; i++) {
          const dy = i * 6;
          const dx = Math.sin(i * 0.5 + elapsed * 0.015) * 16;
          ctx.lineTo(rippleX + dx - 3, rippleY + dy);
        }
        ctx.stroke();

        // Magenta / Violet fringe
        ctx.strokeStyle = "rgba(236, 72, 153, 0.85)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = -12; i <= 12; i++) {
          const dy = i * 6;
          const dx = Math.sin(i * 0.5 + elapsed * 0.015 + 1) * 16;
          ctx.lineTo(rippleX + dx + 3, rippleY + dy);
        }
        ctx.stroke();

        // White-hot radiant core
        const coreGlow = ctx.createRadialGradient(rippleX, rippleY, 2, rippleX, rippleY, rippleSize);
        coreGlow.addColorStop(0, "rgba(255, 255, 255, 0.95)");
        coreGlow.addColorStop(0.3, "rgba(251, 191, 36, 0.7)");
        coreGlow.addColorStop(0.65, "rgba(56, 189, 248, 0.35)");
        coreGlow.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.fillStyle = coreGlow;
        ctx.beginPath();
        ctx.arc(rippleX, rippleY, rippleSize, 0, Math.PI * 2);
        ctx.fill();

        // Radiating light rays from pull point
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.65)";
        for (let r = 0; r < 8; r++) {
          const rayAngle = (r * Math.PI) / 4 + elapsed * 0.004;
          ctx.beginPath();
          ctx.moveTo(rippleX, rippleY);
          ctx.lineTo(
            rippleX + Math.cos(rayAngle) * (rippleSize * 1.4),
            rippleY + Math.sin(rayAngle) * (rippleSize * 1.4)
          );
          ctx.stroke();
        }
      }

      ctx.restore(); // Restore drapery

      ctx.restore(); // Restore globalAlpha

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpened]);

  // When completely opened (p >= 0.95), allow underlying elements full pointer events
  const containerPointerEvents = pullProgress >= 0.95 ? "none" : "auto";

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
      {/* 2D Canvas for Curtain, Classical Figure, and Chromatic Light Ripple */}
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        style={{ touchAction: "none" }}
        aria-hidden="true"
      />

      {/* Blueprint / Telemetry Grid Overlay on the Left Side */}
      <div
        className="absolute inset-y-0 left-0 w-full sm:w-[58%] pointer-events-none p-6 sm:p-14 flex flex-col justify-between transition-opacity duration-300"
        style={{ opacity: Math.max(0, 1 - pullProgress * 1.5) }}
      >
        {/* Top Annotation Badge */}
        <div className="pt-20">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#07190e]/85 border border-emerald-400/35 backdrop-blur-md text-[11px] font-mono tracking-widest text-emerald-300 uppercase shadow-lg">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{labels.chapterAnnotation}</span>
          </div>
        </div>

        {/* Central Titles */}
        <div className="max-w-xs sm:max-w-xl space-y-3 sm:space-y-4 my-auto">
          <h1 className="text-4xl sm:text-7xl md:text-8xl font-serif tracking-tight text-white drop-shadow-md">
            THE SEED
          </h1>
          <p className="text-base sm:text-2xl font-light text-stone-200 tracking-wide font-sans">
            &ldquo;Every MILE begins in the soil.&rdquo;
          </p>
          <p className="text-xs sm:text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-amber-200 to-emerald-300 pt-1">
            {labels.tagline}
          </p>
        </div>

        {/* Interactive Drag & Pull Prompt */}
        <div className="pb-6 pointer-events-auto">
          <button
            type="button"
            onClick={handleDirectOpen}
            className="group inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-[#0d2215]/90 hover:bg-[#132f1e] border border-emerald-400/40 text-emerald-300 hover:text-white font-mono text-xs tracking-wider uppercase shadow-xl backdrop-blur-md transition active:scale-[0.98]"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>{labels.pullPrompt}</span>
            <span className="text-base group-hover:translate-x-1.5 transition-transform">
              →
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
