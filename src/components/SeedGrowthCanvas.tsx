"use client";

import React, { useEffect, useRef } from "react";

interface SeedGrowthCanvasProps {
  progress: number; // 0.00 to 1.00 normalized scroll progress
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  z: number;
  radius: number;
  speedX: number;
  speedY: number;
  opacity: number;
  hue: number;
}

interface NetworkNode {
  x: number;
  y: number;
  label: string;
  stage: string;
  type: "farmer" | "collection" | "marketplace" | "transport" | "delivery";
}

export default function SeedGrowthCanvas({
  progress,
  className = "",
}: SeedGrowthCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const smoothProgressRef = useRef(progress);
  const particlesRef = useRef<Particle[]>([]);
  const prefersReducedMotionRef = useRef(false);

  // Synchronize target progress
  useEffect(() => {
    smoothProgressRef.current = Math.min(1, Math.max(0, progress));
  }, [progress]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    if (typeof window !== "undefined") {
      prefersReducedMotionRef.current = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
    }

    // Initialize 3D atmospheric particle field
    const particleCount = 55;
    const particles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * 2 - 1,
        y: Math.random() * 2 - 1,
        z: Math.random() * 800 + 100,
        radius: Math.random() * 1.8 + 0.6,
        speedX: (Math.random() - 0.5) * 0.0004,
        speedY: -Math.random() * 0.0005 - 0.0001,
        opacity: Math.random() * 0.5 + 0.25,
        hue: Math.random() > 0.4 ? 42 : 145, // Gold or Botanical Green
      });
    }
    particlesRef.current = particles;

    let width = 0;
    let height = 0;
    let currentP = smoothProgressRef.current;

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

    // ────────────────────────────────────────────────────────────
    // 5 GEOSPATIAL NETWORK NODES (Chapter 05)
    // ────────────────────────────────────────────────────────────
    const networkNodes: NetworkNode[] = [
      { x: 0.22, y: 0.62, label: "Farmer Gate", stage: "ORIGIN", type: "farmer" },
      { x: 0.38, y: 0.44, label: "Collection Hub", stage: "AGGREGATION", type: "collection" },
      { x: 0.50, y: 0.55, label: "X-MILE Market", stage: "MATCHING", type: "marketplace" },
      { x: 0.64, y: 0.40, label: "Rural Logistics", stage: "IN TRANSIT", type: "transport" },
      { x: 0.80, y: 0.58, label: "Commercial Mandi", stage: "DELIVERED", type: "delivery" },
    ];

    // ────────────────────────────────────────────────────────────
    // MAIN RENDERING LOOP (Frame-rate independent 60fps)
    // ────────────────────────────────────────────────────────────
    const render = (now: number) => {
      const elapsed = now - startTime;
      const targetP = smoothProgressRef.current;

      // Smooth interpolation (lerp) with adaptive tracking for large jumps
      if (!prefersReducedMotionRef.current) {
        const diff = Math.abs(targetP - currentP);
        const lerpRate = diff > 0.25 ? 0.28 : 0.085;
        currentP += (targetP - currentP) * lerpRate;
      } else {
        currentP = targetP;
      }

      if (width === 0 || height === 0) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      const cx = width * 0.5;
      const cy = height * 0.5;

      // ────────────────────────────────────────────────────────────
      // 1. DYNAMIC HYBRID BACKGROUND (Atmosphere Transitions)
      // ────────────────────────────────────────────────────────────
      // Chapter 01 (0-18%): Dark void
      // Chapter 02 (18-36%): Deep subterranean soil
      // Chapter 03 (36-54%): Morning dawn into daylight
      // Chapter 04 (54-72%): Golden daylight
      // Chapter 05 (72-88%): Twilight mist / overcast
      // Chapter 06 (88-100%): Dark cinematic void return

      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);

      if (currentP < 0.18) {
        // Ch 1: Nocturnal Void
        bgGrad.addColorStop(0, "#030804");
        bgGrad.addColorStop(0.6, "#061208");
        bgGrad.addColorStop(1, "#020502");
      } else if (currentP < 0.36) {
        // Ch 2: Dark Subterranean Soil
        bgGrad.addColorStop(0, "#08150c");
        bgGrad.addColorStop(0.3, "#100905");
        bgGrad.addColorStop(0.7, "#0d0704");
        bgGrad.addColorStop(1, "#050302");
      } else if (currentP < 0.54) {
        // Ch 3: Transition to Daylight Landscape
        const t = (currentP - 0.36) / 0.18;
        const topR = Math.round(8 + t * (240 - 8));
        const topG = Math.round(20 + t * (244 - 20));
        const topB = Math.round(14 + t * (235 - 14));
        bgGrad.addColorStop(0, `rgb(${topR}, ${topG}, ${topB})`);
        bgGrad.addColorStop(0.65, `rgba(230, 240, 225, ${t})`);
        bgGrad.addColorStop(1, `rgb(${Math.round(10 + t * 210)}, ${Math.round(25 + t * 225)}, ${Math.round(15 + t * 205)})`);
      } else if (currentP < 0.72) {
        // Ch 4: Fullness - Warm Golden Daylight
        bgGrad.addColorStop(0, "#fefbf2");
        bgGrad.addColorStop(0.5, "#f7f2e4");
        bgGrad.addColorStop(1, "#ebe4d0");
      } else if (currentP < 0.88) {
        // Ch 5: Late Afternoon Overcast / Twilight Mist
        const t = (currentP - 0.72) / 0.16;
        const r1 = Math.round(247 - t * 230);
        const g1 = Math.round(242 - t * 222);
        const b1 = Math.round(228 - t * 215);
        bgGrad.addColorStop(0, `rgb(${r1}, ${g1}, ${b1})`);
        bgGrad.addColorStop(0.7, `rgb(${Math.round(230 - t * 215)}, ${Math.round(225 - t * 205)}, ${Math.round(210 - t * 195)})`);
        bgGrad.addColorStop(1, `rgb(${Math.round(200 - t * 190)}, ${Math.round(195 - t * 180)}, ${Math.round(180 - t * 170)})`);
      } else {
        // Ch 6: Return to Dark Cinematic Void
        bgGrad.addColorStop(0, "#020603");
        bgGrad.addColorStop(0.55, "#051108");
        bgGrad.addColorStop(1, "#020402");
      }

      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Atmospheric Volumetric Light Beam (in dark chapters 1, 2, 6)
      if (currentP < 0.36 || currentP > 0.86) {
        const rayAlpha = currentP < 0.18 ? 0.16 : currentP < 0.36 ? 0.08 : 0.14;
        const lightRay = ctx.createRadialGradient(
          cx * 0.75,
          height * 0.1,
          20,
          cx,
          cy,
          width * 0.75
        );
        lightRay.addColorStop(0, `rgba(245, 158, 11, ${rayAlpha})`);
        lightRay.addColorStop(0.5, `rgba(16, 185, 129, ${rayAlpha * 0.5})`);
        lightRay.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = lightRay;
        ctx.fillRect(0, 0, width, height);
      }

      // ────────────────────────────────────────────────────────────
      // 2. AMBIENT PARTICLES (Bokeh & Spores)
      // ────────────────────────────────────────────────────────────
      for (const p of particlesRef.current) {
        if (!prefersReducedMotionRef.current) {
          p.x += p.speedX;
          p.y += p.speedY;
          if (p.y < -1) p.y = 1;
          if (p.x < -1) p.x = 1;
          if (p.x > 1) p.x = -1;
        }

        const screenX = cx + p.x * width * 0.6;
        const screenY = cy + p.y * height * 0.6;
        const isDaylight = currentP >= 0.40 && currentP <= 0.80;

        ctx.fillStyle =
          p.hue === 42
            ? isDaylight
              ? `rgba(217, 119, 6, ${p.opacity * 0.4})`
              : `rgba(245, 158, 11, ${p.opacity * 0.7})`
            : isDaylight
            ? `rgba(22, 101, 52, ${p.opacity * 0.35})`
            : `rgba(52, 211, 153, ${p.opacity * 0.6})`;

        ctx.beginPath();
        ctx.arc(screenX, screenY, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // ────────────────────────────────────────────────────────────
      // 3. CHAPTER 01: THE SEED (0.00 -> 0.18)
      // Photorealistic 3D rotating seed descending toward soil
      // ────────────────────────────────────────────────────────────
      if (currentP <= 0.22) {
        const ch1P = Math.min(1, currentP / 0.18);
        const seedAlpha = currentP < 0.18 ? 1 : Math.max(0, 1 - (currentP - 0.18) / 0.04);
        const floatY = cy - 20 + ch1P * (cy * 0.45);
        const seedBob = !prefersReducedMotionRef.current ? Math.sin(elapsed * 0.002) * 8 * (1 - ch1P) : 0;
        const actualSeedY = floatY + seedBob;

        // 3D rotation angles
        const rotY = !prefersReducedMotionRef.current ? elapsed * 0.0009 + ch1P * 3.5 : ch1P * 2;
        const rotX = 0.22 + Math.sin(elapsed * 0.001) * 0.08;

        ctx.save();
        ctx.globalAlpha = seedAlpha;

        // Golden Atmospheric Aura
        const auraGrad = ctx.createRadialGradient(cx, actualSeedY, 5, cx, actualSeedY, 65);
        auraGrad.addColorStop(0, "rgba(245, 158, 11, 0.45)");
        auraGrad.addColorStop(0.5, "rgba(217, 119, 6, 0.15)");
        auraGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(cx, actualSeedY, 65, 0, Math.PI * 2);
        ctx.fill();

        // Photorealistic 3D Seed Rendering with Dynamic Lighting
        // Width projection modulated by 3D Y-rotation
        const seedScale = 1.15;
        const wFactor = Math.abs(Math.cos(rotY));
        const seedW = (24 + wFactor * 12) * seedScale;
        const seedH = 50 * seedScale;

        // Soft ground shadow when approaching soil
        if (ch1P > 0.4) {
          const shadowT = (ch1P - 0.4) / 0.6;
          ctx.fillStyle = `rgba(0, 0, 0, ${0.45 * shadowT})`;
          ctx.beginPath();
          ctx.ellipse(cx, actualSeedY + seedH * 0.65, seedW * 0.8, 8 * shadowT, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.translate(cx, actualSeedY);
        ctx.rotate(Math.sin(rotY * 0.5) * 0.12 + rotX * 0.3);

        // Seed Shell Gradient with dynamic specular highlight based on light direction
        const lightOffsetX = -seedW * 0.35 * Math.sin(rotY);
        const seedShell = ctx.createRadialGradient(
          lightOffsetX,
          -seedH * 0.25,
          2,
          0,
          0,
          seedH * 0.6
        );
        seedShell.addColorStop(0, "#fef3c7"); // Specular golden embryo highlight
        seedShell.addColorStop(0.25, "#d97706"); // Rich golden amber
        seedShell.addColorStop(0.65, "#92400e"); // Deep organic chestnut
        seedShell.addColorStop(0.9, "#451a03"); // Dark earthen walnut
        seedShell.addColorStop(1, "#1c0a02"); // Crease boundary

        ctx.fillStyle = seedShell;
        ctx.beginPath();
        // True botanical teardrop/almond seed contour
        ctx.moveTo(0, -seedH * 0.5);
        ctx.bezierCurveTo(seedW * 0.85, -seedH * 0.3, seedW, seedH * 0.2, 0, seedH * 0.5);
        ctx.bezierCurveTo(-seedW, seedH * 0.2, -seedW * 0.85, -seedH * 0.3, 0, -seedH * 0.5);
        ctx.closePath();
        ctx.fill();

        // Fine longitudinal surface striations (veins)
        ctx.strokeStyle = "rgba(254, 243, 199, 0.28)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(0, -seedH * 0.45);
        ctx.quadraticCurveTo(seedW * 0.35 * Math.sin(rotY + 0.5), 0, 0, seedH * 0.45);
        ctx.stroke();

        ctx.strokeStyle = "rgba(69, 26, 3, 0.45)";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(0, -seedH * 0.42);
        ctx.quadraticCurveTo(-seedW * 0.3 * Math.sin(rotY - 0.5), 0, 0, seedH * 0.42);
        ctx.stroke();

        // Natural embryonic central seam / hilar scar
        ctx.strokeStyle = "rgba(69, 26, 3, 0.75)";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(0, -seedH * 0.38);
        ctx.lineTo(0, seedH * 0.38);
        ctx.stroke();

        // Specular edge rim
        ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(-seedW * 0.2, -seedH * 0.15, 6, 0, Math.PI);
        ctx.stroke();

        ctx.restore();
      }

      // ────────────────────────────────────────────────────────────
      // 4. CHAPTER 02: ROOT (0.18 -> 0.36)
      // Subterranean soil layers & branching illuminated botanical roots
      // ────────────────────────────────────────────────────────────
      if (currentP >= 0.16 && currentP <= 0.40) {
        const ch2P = Math.min(1, Math.max(0, (currentP - 0.18) / 0.18));
        const rootAlpha =
          currentP < 0.18
            ? (currentP - 0.16) / 0.02
            : currentP > 0.36
            ? Math.max(0, 1 - (currentP - 0.36) / 0.04)
            : 1;

        ctx.save();
        ctx.globalAlpha = rootAlpha;

        // Subterranean Soil Strata (Horizon line at 38% height)
        const soilHorizonY = height * 0.38;
        const soilGrad = ctx.createLinearGradient(0, soilHorizonY, 0, height);
        soilGrad.addColorStop(0, "#1c1109"); // Rich humus
        soilGrad.addColorStop(0.3, "#120a05"); // Organic loam
        soilGrad.addColorStop(0.7, "#0b0502"); // Mineral subsoil
        soilGrad.addColorStop(1, "#040201"); // Deep bedrock

        ctx.fillStyle = soilGrad;
        ctx.beginPath();
        ctx.moveTo(0, soilHorizonY);
        // Natural undulating soil line
        for (let x = 0; x <= width; x += 20) {
          const wave = Math.sin(x * 0.008 + 1.2) * 5 + Math.sin(x * 0.02) * 2;
          ctx.lineTo(x, soilHorizonY + wave);
        }
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fill();

        // Soil texture specks (moisture & mineral granules)
        ctx.fillStyle = "rgba(245, 190, 120, 0.07)";
        for (let i = 0; i < 40; i++) {
          const sx = (i * 157.3) % width;
          const sy = soilHorizonY + 10 + ((i * 83.1) % (height - soilHorizonY - 20));
          ctx.fillRect(sx, sy, 2, 2);
        }

        // Soil boundary golden highlight
        ctx.strokeStyle = "rgba(180, 130, 60, 0.35)";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(0, soilHorizonY);
        for (let x = 0; x <= width; x += 20) {
          const wave = Math.sin(x * 0.008 + 1.2) * 5 + Math.sin(x * 0.02) * 2;
          ctx.lineTo(x, soilHorizonY + wave);
        }
        ctx.stroke();

        // Seed nestled into soil
        const embeddedSeedY = soilHorizonY + 6;
        ctx.save();
        ctx.translate(cx, embeddedSeedY);
        ctx.fillStyle = "#78350f";
        ctx.beginPath();
        ctx.ellipse(0, 0, 12, 18, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Central Taproot Growth (Meandering downward)
        const maxRootDepth = (height - soilHorizonY - 40) * Math.min(1, ch2P * 1.15);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        // Taproot stroke
        ctx.strokeStyle = "rgba(245, 230, 190, 0.95)";
        ctx.lineWidth = Math.max(1.8, 4 * (1 - ch2P * 0.3));
        ctx.beginPath();
        ctx.moveTo(cx, embeddedSeedY + 10);
        ctx.bezierCurveTo(
          cx - 8,
          soilHorizonY + maxRootDepth * 0.35,
          cx + 10,
          soilHorizonY + maxRootDepth * 0.7,
          cx + 2,
          soilHorizonY + maxRootDepth
        );
        ctx.stroke();

        // Luminous growing tip (meristem)
        ctx.fillStyle = "rgba(251, 191, 36, 0.9)";
        ctx.beginPath();
        ctx.arc(cx + 2, soilHorizonY + maxRootDepth, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Staggered Lateral Roots (Symbolizing farmer aggregation & ecosystem connection)
        if (ch2P > 0.15) {
          const latP = (ch2P - 0.15) / 0.85;
          const spread = Math.min(width * 0.35, 220) * latP;

          // Lateral L1
          ctx.lineWidth = 2.2;
          ctx.strokeStyle = "rgba(235, 215, 165, 0.8)";
          ctx.beginPath();
          ctx.moveTo(cx, soilHorizonY + 25);
          ctx.bezierCurveTo(cx - spread * 0.4, soilHorizonY + 45, cx - spread * 0.8, soilHorizonY + 80 * latP, cx - spread, soilHorizonY + 110 * latP);
          ctx.stroke();

          // Lateral R1
          ctx.beginPath();
          ctx.moveTo(cx, soilHorizonY + 30);
          ctx.bezierCurveTo(cx + spread * 0.4, soilHorizonY + 50, cx + spread * 0.8, soilHorizonY + 90 * latP, cx + spread, soilHorizonY + 125 * latP);
          ctx.stroke();

          // Sub-branches & luminous nutrient pulses
          if (latP > 0.35) {
            ctx.lineWidth = 1.4;
            ctx.strokeStyle = "rgba(220, 200, 150, 0.65)";
            // Left sub-branch
            ctx.beginPath();
            ctx.moveTo(cx - spread * 0.45, soilHorizonY + 50);
            ctx.quadraticCurveTo(cx - spread * 0.7, soilHorizonY + 95, cx - spread * 0.85, soilHorizonY + 140 * latP);
            ctx.stroke();

            // Right sub-branch
            ctx.beginPath();
            ctx.moveTo(cx + spread * 0.5, soilHorizonY + 60);
            ctx.quadraticCurveTo(cx + spread * 0.75, soilHorizonY + 110, cx + spread * 0.9, soilHorizonY + 160 * latP);
            ctx.stroke();

            // Luminous pulse traveling along roots
            const pulseT = !prefersReducedMotionRef.current ? (elapsed * 0.002) % 1 : 0.5;
            const pulseLX = cx - spread * pulseT;
            const pulseLY = soilHorizonY + 25 + 85 * pulseT;
            ctx.fillStyle = "rgba(251, 191, 36, 0.85)";
            ctx.beginPath();
            ctx.arc(pulseLX, pulseLY, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }

          // Deep root tier L2 & R2
          if (latP > 0.5) {
            const deepP = (latP - 0.5) / 0.5;
            ctx.lineWidth = 1.6;
            ctx.strokeStyle = "rgba(215, 195, 145, 0.6)";
            ctx.beginPath();
            ctx.moveTo(cx, soilHorizonY + 70);
            ctx.bezierCurveTo(cx - spread * 0.3, soilHorizonY + 110, cx - spread * 0.6, soilHorizonY + 150 * deepP, cx - spread * 0.75, soilHorizonY + 190 * deepP);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(cx, soilHorizonY + 80);
            ctx.bezierCurveTo(cx + spread * 0.3, soilHorizonY + 120, cx + spread * 0.55, soilHorizonY + 165 * deepP, cx + spread * 0.7, soilHorizonY + 205 * deepP);
            ctx.stroke();
          }
        }

        ctx.restore();
      }

      // ────────────────────────────────────────────────────────────
      // 5. CHAPTER 03: UPWARD (0.36 -> 0.54)
      // Shoot emergence, Indian dawn landscape, and AI Quality Triage
      // ────────────────────────────────────────────────────────────
      if (currentP >= 0.34 && currentP <= 0.58) {
        const ch3P = Math.min(1, Math.max(0, (currentP - 0.36) / 0.18));
        const upAlpha =
          currentP < 0.36
            ? (currentP - 0.34) / 0.02
            : currentP > 0.54
            ? Math.max(0, 1 - (currentP - 0.54) / 0.04)
            : 1;

        ctx.save();
        ctx.globalAlpha = upAlpha;

        // Agricultural Terraced Dawn Landscape (Layered Indian hills & mist)
        const horizonY = height * 0.62;
        // Distant Hill 1
        ctx.fillStyle = "rgba(180, 210, 185, 0.65)";
        ctx.beginPath();
        ctx.moveTo(0, horizonY - 60);
        ctx.bezierCurveTo(width * 0.3, horizonY - 110, width * 0.7, horizonY - 40, width, horizonY - 80);
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fill();

        // Mid-ground Hill 2 with morning mist
        ctx.fillStyle = "rgba(130, 185, 140, 0.75)";
        ctx.beginPath();
        ctx.moveTo(0, horizonY - 20);
        ctx.bezierCurveTo(width * 0.4, horizonY - 70, width * 0.8, horizonY, width, horizonY - 35);
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fill();

        // Terraced Farm Foreground
        ctx.fillStyle = "#3f6212";
        ctx.beginPath();
        ctx.moveTo(0, horizonY);
        ctx.lineTo(width, horizonY);
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fill();

        // Sprouting Plant / Stem
        const stemHeight = Math.min(height * 0.32, 190) * ch3P;
        const stemBaseY = horizonY;
        const stemTopY = stemBaseY - stemHeight;
        const windSway = !prefersReducedMotionRef.current ? Math.sin(elapsed * 0.0025) * 6 * ch3P : 0;

        // Stem
        ctx.lineCap = "round";
        const stemGrad = ctx.createLinearGradient(0, stemBaseY, 0, stemTopY);
        stemGrad.addColorStop(0, "#15803d");
        stemGrad.addColorStop(0.6, "#22c55e");
        stemGrad.addColorStop(1, "#86efac");
        ctx.strokeStyle = stemGrad;
        ctx.lineWidth = Math.max(2.5, 4.5 * (1 - ch3P * 0.3));
        ctx.beginPath();
        ctx.moveTo(cx, stemBaseY);
        ctx.quadraticCurveTo(cx - 4 + windSway * 0.5, stemBaseY - stemHeight * 0.5, cx + windSway, stemTopY);
        ctx.stroke();

        // Unfurling Leaves
        if (ch3P > 0.25) {
          const leafP = (ch3P - 0.25) / 0.75;
          const leafLen = 42 * leafP;
          const leafNodeY = stemBaseY - stemHeight * 0.55;

          // Left leaf
          ctx.save();
          ctx.translate(cx + windSway * 0.5, leafNodeY);
          ctx.rotate(-0.6 + windSway * 0.04);
          ctx.fillStyle = "#22c55e";
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(-leafLen * 0.5, -14, -leafLen, 0);
          ctx.quadraticCurveTo(-leafLen * 0.5, 10, 0, 0);
          ctx.fill();
          ctx.restore();

          // Right leaf
          ctx.save();
          ctx.translate(cx + windSway * 0.5, leafNodeY - 4);
          ctx.rotate(0.55 + windSway * 0.04);
          ctx.fillStyle = "#16a34a";
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(leafLen * 0.5, -14, leafLen, 0);
          ctx.quadraticCurveTo(leafLen * 0.5, 10, 0, 0);
          ctx.fill();
          ctx.restore();
        }

        // AI Quality Assessment HUD Reticle (Appears smoothly when plant emerges)
        if (ch3P > 0.4) {
          const hudAlpha = Math.min(1, (ch3P - 0.4) / 0.4);
          ctx.save();
          ctx.globalAlpha = hudAlpha * upAlpha;

          const boxW = Math.min(width * 0.45, 260);
          const boxH = Math.min(height * 0.35, 180);
          const boxX = cx - boxW * 0.5 + windSway * 0.5;
          const boxY = stemTopY - 20;

          // Subtle scanning bounding box
          ctx.strokeStyle = "rgba(16, 185, 129, 0.75)";
          ctx.lineWidth = 1.2;
          ctx.strokeRect(boxX, boxY, boxW, boxH);

          // Corner reticle brackets
          const brLen = 14;
          ctx.lineWidth = 2.4;
          ctx.strokeStyle = "#10b981";

          // Top-left
          ctx.beginPath();
          ctx.moveTo(boxX, boxY + brLen);
          ctx.lineTo(boxX, boxY);
          ctx.lineTo(boxX + brLen, boxY);
          ctx.stroke();
          // Top-right
          ctx.beginPath();
          ctx.moveTo(boxX + boxW - brLen, boxY);
          ctx.lineTo(boxX + boxW, boxY);
          ctx.lineTo(boxX + boxW, boxY + brLen);
          ctx.stroke();
          // Bottom-left
          ctx.beginPath();
          ctx.moveTo(boxX, boxY + boxH - brLen);
          ctx.lineTo(boxX, boxY + boxH);
          ctx.lineTo(boxX + brLen, boxY + boxH);
          ctx.stroke();
          // Bottom-right
          ctx.beginPath();
          ctx.moveTo(boxX + boxW - brLen, boxY + boxH);
          ctx.lineTo(boxX + boxW, boxY + boxH);
          ctx.lineTo(boxX + boxW, boxY + boxH - brLen);
          ctx.stroke();

          // Laser scan beam line
          const scanY = boxY + ((elapsed * 0.08) % boxH);
          ctx.strokeStyle = "rgba(52, 211, 153, 0.4)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(boxX, scanY);
          ctx.lineTo(boxX + boxW, scanY);
          ctx.stroke();

          ctx.restore();
        }

        ctx.restore();
      }

      // ────────────────────────────────────────────────────────────
      // 6. CHAPTER 04: FULLNESS (0.54 -> 0.72)
      // Hero Sunflower with authentic Fibonacci Spiral Seed Disk
      // ────────────────────────────────────────────────────────────
      if (currentP >= 0.52 && currentP <= 0.76) {
        const ch4P = Math.min(1, Math.max(0, (currentP - 0.54) / 0.18));
        const fullAlpha =
          currentP < 0.54
            ? (currentP - 0.52) / 0.02
            : currentP > 0.72
            ? Math.max(0, 1 - (currentP - 0.72) / 0.04)
            : 1;

        ctx.save();
        ctx.globalAlpha = fullAlpha;

        // Camera zoom factor pushes toward the central seed disk
        const zoom = 1 + ch4P * 0.65;
        const flowerCenterY = cy * 0.95 - ch4P * 40;
        const flowerSway = !prefersReducedMotionRef.current ? Math.sin(elapsed * 0.002) * 5 : 0;

        ctx.translate(cx + flowerSway, flowerCenterY);
        ctx.scale(zoom, zoom);

        // Sturdy Sunflower Stalk
        ctx.strokeStyle = "#15803d";
        ctx.lineWidth = 12;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, height * 0.7);
        ctx.stroke();

        // Broad Sunflower Leaves
        ctx.fillStyle = "#16a34a";
        // Left broad leaf
        ctx.beginPath();
        ctx.moveTo(-6, 90);
        ctx.bezierCurveTo(-70, 70, -110, 130, -130, 170);
        ctx.bezierCurveTo(-80, 180, -30, 140, -6, 120);
        ctx.fill();

        // Right broad leaf
        ctx.beginPath();
        ctx.moveTo(6, 110);
        ctx.bezierCurveTo(70, 90, 110, 150, 130, 190);
        ctx.bezierCurveTo(80, 200, 30, 160, 6, 140);
        ctx.fill();

        // Golden Ray Petals (28 Petals fanning outward)
        const petalCount = 28;
        const petalLen = 78;
        const petalW = 18;

        for (let i = 0; i < petalCount; i++) {
          const angle = (i * Math.PI * 2) / petalCount;
          const petalFlutter = !prefersReducedMotionRef.current ? Math.sin(elapsed * 0.003 + i) * 0.04 : 0;

          ctx.save();
          ctx.rotate(angle + petalFlutter);

          const petalGrad = ctx.createLinearGradient(0, 25, 0, petalLen + 25);
          petalGrad.addColorStop(0, "#f59e0b"); // Warm amber base
          petalGrad.addColorStop(0.5, "#fbbf24"); // Radiant gold
          petalGrad.addColorStop(1, "#fef08a"); // Sunlight yellow tip

          ctx.fillStyle = petalGrad;
          ctx.beginPath();
          ctx.moveTo(0, 25);
          ctx.bezierCurveTo(-petalW * 0.5, 45, -petalW * 0.6, petalLen * 0.8, 0, petalLen + 25);
          ctx.bezierCurveTo(petalW * 0.6, petalLen * 0.8, petalW * 0.5, 45, 0, 25);
          ctx.fill();

          // Petal central crease
          ctx.strokeStyle = "rgba(180, 83, 9, 0.4)";
          ctx.lineWidth = 0.9;
          ctx.beginPath();
          ctx.moveTo(0, 30);
          ctx.lineTo(0, petalLen + 15);
          ctx.stroke();

          ctx.restore();
        }

        // CENTRAL SEED DISK: AUTHENTIC FIBONACCI SPIRAL PHYLLOTAXIS
        // Golden Angle = 137.507764 degrees = 2.39996323 rad
        const goldenAngle = 2.39996323;
        const floretCount = 210;
        const cScaling = 3.6;

        // Base disc background
        const discGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, 58);
        discGrad.addColorStop(0, "#1c0a02"); // Dark velvet center
        discGrad.addColorStop(0.65, "#381404");
        discGrad.addColorStop(1, "#78350f"); // Ripe outer florets
        ctx.fillStyle = discGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 56, 0, Math.PI * 2);
        ctx.fill();

        // Fermat's spiral florets (Fibonacci distribution)
        for (let n = 1; n <= floretCount; n++) {
          const r = cScaling * Math.sqrt(n);
          if (r > 52) continue;
          const theta = n * goldenAngle;
          const fx = r * Math.cos(theta);
          const fy = r * Math.sin(theta);

          // Seed floret detachment as ch4P nears 1 (seeds lifting off)
          let seedElevX = 0;
          let seedElevY = 0;
          let floretAlpha = 1;

          if (ch4P > 0.65 && n > 140) {
            const detachP = (ch4P - 0.65) / 0.35;
            seedElevX = Math.cos(theta) * detachP * 35;
            seedElevY = -detachP * (40 + (n % 20) * 2);
            floretAlpha = Math.max(0.2, 1 - detachP * 0.5);
          }

          ctx.fillStyle =
            n < 60
              ? `rgba(245, 158, 11, ${floretAlpha * 0.9})` // Inner golden florets
              : `rgba(69, 26, 3, ${floretAlpha * 0.95})`; // Outer mature seeds

          ctx.beginPath();
          ctx.arc(fx + seedElevX, fy + seedElevY, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      // ────────────────────────────────────────────────────────────
      // 7. CHAPTER 05: RETURN & THE NETWORK (0.72 -> 0.88)
      // Dispersed seeds morph into connected geospatial supply network
      // ────────────────────────────────────────────────────────────
      if (currentP >= 0.70 && currentP <= 0.90) {
        const ch5P = Math.min(1, Math.max(0, (currentP - 0.72) / 0.16));
        const netAlpha =
          currentP < 0.72
            ? (currentP - 0.70) / 0.02
            : currentP > 0.88
            ? Math.max(0, 1 - (currentP - 0.88) / 0.02)
            : 1;

        ctx.save();
        ctx.globalAlpha = netAlpha;

        // Circular transition factor: As ch5P approaches 1, nodes curve into a ring
        const ringT = Math.max(0, (ch5P - 0.65) / 0.35);

        // Map Grid Topography Lines (Subtle geospatial landscape)
        ctx.strokeStyle = "rgba(16, 185, 129, 0.15)";
        ctx.lineWidth = 1;
        for (let g = 0; g < 4; g++) {
          const gy = height * 0.35 + g * 50;
          ctx.beginPath();
          ctx.moveTo(width * 0.1, gy);
          ctx.bezierCurveTo(width * 0.3, gy - 15, width * 0.7, gy + 15, width * 0.9, gy);
          ctx.stroke();
        }

        // Calculate active screen positions of the 5 key supply chain nodes
        const screenNodes = networkNodes.map((node, i) => {
          // Standard map coordinate
          const standardX = node.x * width;
          const standardY = node.y * height;

          // Circular ring coordinate (transitioning to Chapter 06 seed ring)
          const ringAngle = (i * Math.PI * 2) / networkNodes.length - Math.PI * 0.5;
          const ringRadius = Math.min(width, height) * 0.28;
          const ringX = cx + ringRadius * Math.cos(ringAngle);
          const ringY = cy + ringRadius * Math.sin(ringAngle);

          return {
            ...node,
            x: standardX + (ringX - standardX) * ringT,
            y: standardY + (ringY - standardY) * ringT,
          };
        });

        // Draw animated bezier connection vectors (The 5-stage platform journey)
        ctx.lineWidth = 2.2;
        ctx.lineCap = "round";

        for (let i = 0; i < screenNodes.length - 1; i++) {
          const n1 = screenNodes[i];
          const n2 = screenNodes[i + 1];

          // Vector path
          const pathGrad = ctx.createLinearGradient(n1.x, n1.y, n2.x, n2.y);
          pathGrad.addColorStop(0, "#10b981");
          pathGrad.addColorStop(0.5, "#f59e0b");
          pathGrad.addColorStop(1, "#10b981");

          ctx.strokeStyle = pathGrad;
          ctx.beginPath();
          ctx.moveTo(n1.x, n1.y);
          const midX = (n1.x + n2.x) * 0.5;
          const midY = (n1.y + n2.y) * 0.5 - 25 * (1 - ringT);
          ctx.quadraticCurveTo(midX, midY, n2.x, n2.y);
          ctx.stroke();

          // Traveling shipment packet along path
          const pulseT = !prefersReducedMotionRef.current ? ((elapsed * 0.0012 + i * 0.25) % 1) : 0.5;
          const packetX = Math.pow(1 - pulseT, 2) * n1.x + 2 * (1 - pulseT) * pulseT * midX + Math.pow(pulseT, 2) * n2.x;
          const packetY = Math.pow(1 - pulseT, 2) * n1.y + 2 * (1 - pulseT) * pulseT * midY + Math.pow(pulseT, 2) * n2.y;

          ctx.fillStyle = "#ffffff";
          ctx.shadowColor = "#10b981";
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(packetX, packetY, 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        // Draw the 5 illuminated node markers
        for (const n of screenNodes) {
          // Outer halo
          const haloGrad = ctx.createRadialGradient(n.x, n.y, 2, n.x, n.y, 24);
          haloGrad.addColorStop(0, "rgba(16, 185, 129, 0.45)");
          haloGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
          ctx.fillStyle = haloGrad;
          ctx.beginPath();
          ctx.arc(n.x, n.y, 24, 0, Math.PI * 2);
          ctx.fill();

          // Node core
          ctx.fillStyle = n.type === "marketplace" ? "#f59e0b" : "#10b981";
          ctx.beginPath();
          ctx.arc(n.x, n.y, 6.5, 0, Math.PI * 2);
          ctx.fill();

          // Center specular dot
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(n.x, n.y, 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      // ────────────────────────────────────────────────────────────
      // 8. CHAPTER 06: AGAIN // THE GATEWAY (0.88 -> 1.00)
      // Rotating ring of glowing seeds converging into X-MILE gateway
      // ────────────────────────────────────────────────────────────
      if (currentP >= 0.86) {
        const ch6P = Math.min(1, Math.max(0, (currentP - 0.88) / 0.12));
        const gateAlpha = currentP < 0.88 ? (currentP - 0.86) / 0.02 : 1;

        ctx.save();
        ctx.globalAlpha = gateAlpha;

        // Converging radius: ring begins wide and gracefully contracts toward the center
        const maxRadius = Math.min(width, height) * 0.28;
        const currentRadius = maxRadius * (1 - ch6P * 0.55);

        // Ring 3D rotation in perspective
        const ringRot = !prefersReducedMotionRef.current ? elapsed * 0.001 : 0;
        const seedRingCount = 12;

        ctx.translate(cx, cy * 0.82);

        // Central Golden Corona Bloom
        const centerBloom = ctx.createRadialGradient(0, 0, 4, 0, 0, 80 * (1 + ch6P * 0.4));
        centerBloom.addColorStop(0, `rgba(251, 191, 36, ${0.45 * ch6P})`);
        centerBloom.addColorStop(0.5, `rgba(16, 185, 129, ${0.2 * ch6P})`);
        centerBloom.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = centerBloom;
        ctx.beginPath();
        ctx.arc(0, 0, 80 * (1 + ch6P * 0.4), 0, Math.PI * 2);
        ctx.fill();

        // 12 Glowing Seeds in Elliptical 3D Ring
        for (let s = 0; s < seedRingCount; s++) {
          const angle = (s * Math.PI * 2) / seedRingCount + ringRot;
          const sx = currentRadius * Math.cos(angle);
          // Elliptical perspective factor (0.45)
          const sy = currentRadius * Math.sin(angle) * 0.45;

          // Depth scaling
          const zDepth = (Math.sin(angle) + 1) * 0.5; // 0 to 1
          const sScale = 0.7 + zDepth * 0.6;

          ctx.save();
          ctx.translate(sx, sy);
          ctx.scale(sScale, sScale);

          // Seed glow
          const sGlow = ctx.createRadialGradient(0, 0, 1, 0, 0, 18);
          sGlow.addColorStop(0, "rgba(251, 191, 36, 0.8)");
          sGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
          ctx.fillStyle = sGlow;
          ctx.beginPath();
          ctx.arc(0, 0, 18, 0, Math.PI * 2);
          ctx.fill();

          // Seed shape
          ctx.fillStyle = "#f59e0b";
          ctx.beginPath();
          ctx.moveTo(0, -7);
          ctx.bezierCurveTo(4, -4, 5, 3, 0, 7);
          ctx.bezierCurveTo(-5, 3, -4, -4, 0, -7);
          ctx.fill();

          // Bright center
          ctx.fillStyle = "#fef08a";
          ctx.beginPath();
          ctx.arc(0, 0, 2, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        }

        ctx.restore();
      }

      // Next animation frame
      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      <canvas
        ref={canvasRef}
        className="block w-full h-full select-none"
        style={{ touchAction: "none" }}
        aria-hidden="true"
      />
    </div>
  );
}
