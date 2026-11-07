"use client";

import React, { useEffect, useRef } from "react";

interface SeedGrowthCanvasProps {
  progress: number; // 0.0 (floating seed) to 1.0 (mature crop)
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  radius: number;
  speedX: number;
  speedY: number;
  opacity: number;
  hue: number;
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

  // Sync target progress
  useEffect(() => {
    smoothProgressRef.current = progress;
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

    // Initialize ambient atmospheric particles
    const particleCount = 45;
    const particles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random(),
        y: Math.random(),
        radius: Math.random() * 1.8 + 0.6,
        speedX: (Math.random() - 0.5) * 0.0003,
        speedY: -Math.random() * 0.0004 - 0.0001,
        opacity: Math.random() * 0.5 + 0.2,
        hue: Math.random() > 0.5 ? 42 : 145, // Gold or soft emerald
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

    const render = (now: number) => {
      const elapsed = now - startTime;
      const targetP = smoothProgressRef.current;

      // Smooth interpolation (lerp) toward target scroll progress
      if (!prefersReducedMotionRef.current) {
        currentP += (targetP - currentP) * 0.085;
      } else {
        currentP = targetP;
      }

      if (width === 0 || height === 0) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      // ──────────────────────────────────────────────────────────
      // 1. SKY / UPPER ATMOSPHERE BACKGROUND
      // ──────────────────────────────────────────────────────────
      // Dynamic color: transitions from dark nocturnal forest to warm morning twilight
      const dawnT = Math.min(1, Math.max(0, (currentP - 0.5) / 0.5));
      
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      // Top color
      const topR = Math.round(5 + dawnT * 18);
      const topG = Math.round(14 + dawnT * 26);
      const topB = Math.round(8 + dawnT * 14);
      // Mid color
      const midR = Math.round(10 + dawnT * 35);
      const midG = Math.round(26 + dawnT * 48);
      const midB = Math.round(16 + dawnT * 22);

      skyGrad.addColorStop(0, `rgb(${topR}, ${topG}, ${topB})`);
      skyGrad.addColorStop(0.55, `rgb(${midR}, ${midG}, ${midB})`);
      skyGrad.addColorStop(1, "#071209");

      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // Soft volumetric dawn rays
      const sunBeam = ctx.createRadialGradient(
        width * 0.5,
        height * 0.15,
        20,
        width * 0.5,
        height * 0.45,
        width * 0.6
      );
      sunBeam.addColorStop(0, `rgba(251, 191, 36, ${0.12 + dawnT * 0.15})`);
      sunBeam.addColorStop(0.5, `rgba(52, 211, 153, ${0.08 + dawnT * 0.08})`);
      sunBeam.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = sunBeam;
      ctx.fillRect(0, 0, width, height);

      // ──────────────────────────────────────────────────────────
      // 2. SOIL HORIZON & RICH EARTHEN STRATA
      // ──────────────────────────────────────────────────────────
      // Soil line is positioned slightly below mid-screen
      const soilY = height * 0.54;

      // Draw subterranean fertile earth
      const soilGrad = ctx.createLinearGradient(0, soilY, 0, height);
      soilGrad.addColorStop(0, "#1c1109"); // Rich topsoil loam
      soilGrad.addColorStop(0.2, "#140b05");
      soilGrad.addColorStop(0.6, "#0c0603");
      soilGrad.addColorStop(1, "#060301"); // Deep mineral bed

      ctx.fillStyle = soilGrad;
      ctx.beginPath();
      ctx.moveTo(0, soilY);

      // Organic undulating soil boundary
      const waveFreq = 0.008;
      for (let x = 0; x <= width; x += 15) {
        const soilWave =
          Math.sin(x * waveFreq + 1.2) * 4 +
          Math.sin(x * waveFreq * 2.3) * 2;
        ctx.lineTo(x, soilY + soilWave);
      }
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fill();

      // Soil texture specks (mineral grains & organic loam)
      ctx.fillStyle = "rgba(255, 230, 180, 0.06)";
      for (let i = 0; i < 35; i++) {
        const sx = ((i * 137.5) % width);
        const sy = soilY + 15 + ((i * 73.1) % (height - soilY - 30));
        ctx.fillRect(sx, sy, 2, 2);
      }

      // Soil surface golden highlight rim
      ctx.strokeStyle = "rgba(180, 130, 60, 0.25)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, soilY);
      for (let x = 0; x <= width; x += 15) {
        const soilWave =
          Math.sin(x * waveFreq + 1.2) * 4 +
          Math.sin(x * waveFreq * 2.3) * 2;
        ctx.lineTo(x, soilY + soilWave);
      }
      ctx.stroke();

      // ──────────────────────────────────────────────────────────
      // 3. DRIFTING PARTICLES / SPORES
      // ──────────────────────────────────────────────────────────
      for (const p of particlesRef.current) {
        if (!prefersReducedMotionRef.current) {
          p.x += p.speedX;
          p.y += p.speedY;
          if (p.y < 0) p.y = 1;
          if (p.x < 0) p.x = 1;
          if (p.x > 1) p.x = 0;
        }

        const px = p.x * width;
        const py = p.y * height;
        ctx.fillStyle =
          p.hue === 42
            ? `rgba(245, 190, 70, ${p.opacity * (1 - currentP * 0.3)})`
            : `rgba(52, 211, 153, ${p.opacity * (0.6 + dawnT * 0.4)})`;
        ctx.beginPath();
        ctx.arc(px, py, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // ──────────────────────────────────────────────────────────
      // 4. THE SEED & ITS DESCENT (Stages 1 - 3, p in [0.0, 0.35])
      // ──────────────────────────────────────────────────────────
      const seedCenterX = width * 0.5;
      const floatingY = soilY - height * 0.26;
      const embeddedY = soilY - 3;

      // Seed descent progress [0 -> 1] within p: [0.0 -> 0.28]
      const descentT = Math.min(1, Math.max(0, currentP / 0.28));
      const easedDescent =
        descentT < 0.5
          ? 2 * descentT * descentT
          : 1 - Math.pow(-2 * descentT + 2, 2) / 2;

      // Hover bobbing when floating
      const bobOffset =
        !prefersReducedMotionRef.current
          ? Math.sin(elapsed * 0.0022) * 7 * (1 - descentT)
          : 0;

      const seedY = floatingY + (embeddedY - floatingY) * easedDescent + bobOffset;

      // Seed opacity & presence: stays visible, becomes germination anchor
      const seedScale = 1 - currentP * 0.15;

      // Golden aura around seed
      const seedAura = ctx.createRadialGradient(
        seedCenterX,
        seedY,
        4,
        seedCenterX,
        seedY,
        45 * seedScale
      );
      seedAura.addColorStop(0, "rgba(245, 158, 11, 0.45)");
      seedAura.addColorStop(0.5, "rgba(217, 119, 6, 0.18)");
      seedAura.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = seedAura;
      ctx.beginPath();
      ctx.arc(seedCenterX, seedY, 45 * seedScale, 0, Math.PI * 2);
      ctx.fill();

      // Draw the Seed (Botanical teardrop / golden almond)
      ctx.save();
      ctx.translate(seedCenterX, seedY);
      ctx.scale(seedScale, seedScale);
      const seedTilt = Math.sin(elapsed * 0.0015) * 0.05 * (1 - descentT);
      ctx.rotate(seedTilt);

      // Seed shadow if near ground
      if (descentT > 0.4) {
        ctx.fillStyle = `rgba(0, 0, 0, ${0.4 * descentT})`;
        ctx.beginPath();
        ctx.ellipse(0, 18, 14 * descentT, 5 * descentT, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Seed shell gradient
      const seedGrad = ctx.createRadialGradient(-4, -6, 2, 0, 0, 18);
      seedGrad.addColorStop(0, "#fde68a"); // Warm golden embryo
      seedGrad.addColorStop(0.4, "#d97706"); // Amber coat
      seedGrad.addColorStop(0.85, "#92400e"); // Rich walnut shell
      seedGrad.addColorStop(1, "#451a03"); // Deep edge

      ctx.fillStyle = seedGrad;
      ctx.beginPath();
      // Teardrop / wheat seed path
      ctx.moveTo(0, -18);
      ctx.bezierCurveTo(11, -12, 14, 5, 0, 18);
      ctx.bezierCurveTo(-14, 5, -11, -12, 0, -18);
      ctx.closePath();
      ctx.fill();

      // Seed central seam / groove
      ctx.strokeStyle = "rgba(69, 26, 3, 0.65)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(0, -15);
      ctx.quadraticCurveTo(2, 0, 0, 15);
      ctx.stroke();

      // Seed highlight rim
      ctx.strokeStyle = "rgba(254, 240, 138, 0.45)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(-3, -5, 6, 0, Math.PI);
      ctx.stroke();

      ctx.restore();

      // ──────────────────────────────────────────────────────────
      // 5. ROOT SYSTEM DEVELOPMENT (Stages 4 - 5, p in [0.22, 0.75])
      // ──────────────────────────────────────────────────────────
      if (currentP > 0.22) {
        const rootProgress = Math.min(1, Math.max(0, (currentP - 0.22) / 0.48));
        const maxRootDepth = (height - soilY - 20) * rootProgress;

        ctx.save();
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        // Primary Taproot (descending vertically with natural meander)
        const tapPulse = Math.sin(elapsed * 0.003) * 0.15 + 0.85;
        ctx.strokeStyle = `rgba(240, 225, 175, ${0.9 * tapPulse})`;
        ctx.lineWidth = Math.max(1, 3.5 * (1 - rootProgress * 0.3));

        ctx.beginPath();
        ctx.moveTo(seedCenterX, soilY + 5);
        const midY1 = soilY + maxRootDepth * 0.35;
        const midY2 = soilY + maxRootDepth * 0.7;
        const endY = soilY + maxRootDepth;
        ctx.bezierCurveTo(
          seedCenterX - 6,
          midY1,
          seedCenterX + 8,
          midY2,
          seedCenterX + 2,
          endY
        );
        ctx.stroke();

        // Glowing root tip (meristem)
        if (rootProgress < 0.98) {
          ctx.fillStyle = "rgba(251, 191, 36, 0.85)";
          ctx.beginPath();
          ctx.arc(seedCenterX + 2, endY, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Secondary Lateral Roots (Left & Right Branches)
        if (rootProgress > 0.15) {
          const latP = (rootProgress - 0.15) / 0.85;
          const latSpread = Math.min(width * 0.32, 180) * latP;

          // Lateral Root L1
          ctx.strokeStyle = "rgba(230, 215, 160, 0.75)";
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(seedCenterX, soilY + 18);
          ctx.bezierCurveTo(
            seedCenterX - latSpread * 0.4,
            soilY + 30,
            seedCenterX - latSpread * 0.8,
            soilY + 50 * latP,
            seedCenterX - latSpread,
            soilY + 70 * latP
          );
          ctx.stroke();

          // Sub-branch L1-a
          if (latP > 0.4) {
            ctx.lineWidth = 1.2;
            ctx.strokeStyle = "rgba(215, 200, 145, 0.55)";
            ctx.beginPath();
            ctx.moveTo(seedCenterX - latSpread * 0.5, soilY + 36);
            ctx.quadraticCurveTo(
              seedCenterX - latSpread * 0.7,
              soilY + 70,
              seedCenterX - latSpread * 0.85,
              soilY + 95 * latP
            );
            ctx.stroke();
          }

          // Lateral Root R1
          ctx.lineWidth = 2.2;
          ctx.strokeStyle = "rgba(230, 215, 160, 0.75)";
          ctx.beginPath();
          ctx.moveTo(seedCenterX, soilY + 22);
          ctx.bezierCurveTo(
            seedCenterX + latSpread * 0.4,
            soilY + 32,
            seedCenterX + latSpread * 0.75,
            soilY + 55 * latP,
            seedCenterX + latSpread * 0.95,
            soilY + 80 * latP
          );
          ctx.stroke();

          // Sub-branch R1-a
          if (latP > 0.45) {
            ctx.lineWidth = 1.2;
            ctx.strokeStyle = "rgba(215, 200, 145, 0.55)";
            ctx.beginPath();
            ctx.moveTo(seedCenterX + latSpread * 0.55, soilY + 42);
            ctx.quadraticCurveTo(
              seedCenterX + latSpread * 0.8,
              soilY + 85,
              seedCenterX + latSpread * 0.9,
              soilY + 115 * latP
            );
            ctx.stroke();
          }

          // Deeper Lateral Root L2
          if (latP > 0.3) {
            const deepP = (latP - 0.3) / 0.7;
            ctx.lineWidth = 1.8;
            ctx.strokeStyle = "rgba(220, 205, 150, 0.65)";
            ctx.beginPath();
            ctx.moveTo(seedCenterX - 3, soilY + 55);
            ctx.bezierCurveTo(
              seedCenterX - latSpread * 0.3,
              soilY + 80,
              seedCenterX - latSpread * 0.6,
              soilY + 120 * deepP,
              seedCenterX - latSpread * 0.7,
              soilY + 150 * deepP
            );
            ctx.stroke();
          }

          // Deeper Lateral Root R2
          if (latP > 0.35) {
            const deepP = (latP - 0.35) / 0.65;
            ctx.lineWidth = 1.8;
            ctx.strokeStyle = "rgba(220, 205, 150, 0.65)";
            ctx.beginPath();
            ctx.moveTo(seedCenterX + 3, soilY + 60);
            ctx.bezierCurveTo(
              seedCenterX + latSpread * 0.3,
              soilY + 85,
              seedCenterX + latSpread * 0.55,
              soilY + 130 * deepP,
              seedCenterX + latSpread * 0.65,
              soilY + 160 * deepP
            );
            ctx.stroke();
          }

          // Fine root hairs (subtle nutrient pulses)
          if (latP > 0.6) {
            ctx.lineWidth = 0.8;
            ctx.strokeStyle = "rgba(245, 235, 195, 0.35)";
            for (let h = 0; h < 8; h++) {
              const hx = seedCenterX - 40 + h * 12;
              const hy = soilY + 45 + h * 10;
              ctx.beginPath();
              ctx.moveTo(hx, hy);
              ctx.lineTo(hx + (h % 2 === 0 ? 8 : -8), hy + 8);
              ctx.stroke();
            }
          }
        }

        ctx.restore();
      }

      // ──────────────────────────────────────────────────────────
      // 6. SPROUT, FOLIAGE & CROP FLOURISHING (Stages 6 - 8, p in [0.42, 1.0])
      // ──────────────────────────────────────────────────────────
      if (currentP > 0.42) {
        const shootProgress = Math.min(1, Math.max(0, (currentP - 0.42) / 0.5));
        const maxStemHeight = Math.min(height * 0.38, 240) * shootProgress;
        const stemTopY = soilY - maxStemHeight;

        // Gentle wind sway
        const windSway =
          !prefersReducedMotionRef.current
            ? Math.sin(elapsed * 0.0025) * 6 * shootProgress
            : 0;

        ctx.save();
        ctx.lineCap = "round";

        // Green Stem
        const stemGrad = ctx.createLinearGradient(0, soilY, 0, stemTopY);
        stemGrad.addColorStop(0, "#15803d"); // Forest green base
        stemGrad.addColorStop(0.5, "#22c55e"); // Bright vibrant green
        stemGrad.addColorStop(1, "#86efac"); // Pale tender green crown

        ctx.strokeStyle = stemGrad;
        ctx.lineWidth = Math.max(2, 4.5 * (1 - shootProgress * 0.35));

        ctx.beginPath();
        ctx.moveTo(seedCenterX, soilY);
        ctx.quadraticCurveTo(
          seedCenterX - 3 + windSway * 0.5,
          soilY - maxStemHeight * 0.5,
          seedCenterX + windSway,
          stemTopY
        );
        ctx.stroke();

        // First Pair of Leaves (Cotyledons) - emerge at shootProgress > 0.18
        if (shootProgress > 0.18) {
          const leaf1P = Math.min(1, (shootProgress - 0.18) / 0.4);
          const leafLen = 32 * leaf1P;
          const leafAttachY = soilY - maxStemHeight * 0.4;

          // Left Leaf
          ctx.save();
          ctx.translate(seedCenterX - 1 + windSway * 0.4, leafAttachY);
          ctx.rotate(-0.65 + windSway * 0.04);
          const leafGradL = ctx.createLinearGradient(0, 0, -leafLen, -10);
          leafGradL.addColorStop(0, "#16a34a");
          leafGradL.addColorStop(1, "#4ade80");
          ctx.fillStyle = leafGradL;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(-leafLen * 0.5, -12, -leafLen, 0);
          ctx.quadraticCurveTo(-leafLen * 0.5, 8, 0, 0);
          ctx.fill();
          // Leaf vein
          ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-leafLen * 0.85, 0);
          ctx.stroke();
          ctx.restore();

          // Right Leaf
          ctx.save();
          ctx.translate(seedCenterX + 1 + windSway * 0.4, leafAttachY - 3);
          ctx.rotate(0.55 + windSway * 0.04);
          const leafGradR = ctx.createLinearGradient(0, 0, leafLen, -10);
          leafGradR.addColorStop(0, "#16a34a");
          leafGradR.addColorStop(1, "#4ade80");
          ctx.fillStyle = leafGradR;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(leafLen * 0.5, -12, leafLen, 0);
          ctx.quadraticCurveTo(leafLen * 0.5, 8, 0, 0);
          ctx.fill();
          // Leaf vein
          ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(leafLen * 0.85, 0);
          ctx.stroke();
          ctx.restore();
        }

        // Secondary Mature Foliage (Nodes higher up) - emerge at shootProgress > 0.48
        if (shootProgress > 0.48) {
          const leaf2P = Math.min(1, (shootProgress - 0.48) / 0.45);
          const leafLen2 = 38 * leaf2P;
          const leafAttachY2 = soilY - maxStemHeight * 0.72;

          // Upper Left Leaf
          ctx.save();
          ctx.translate(seedCenterX - 1 + windSway * 0.75, leafAttachY2);
          ctx.rotate(-0.45 + windSway * 0.05);
          ctx.fillStyle = "#22c55e";
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(-leafLen2 * 0.6, -14, -leafLen2, -3);
          ctx.quadraticCurveTo(-leafLen2 * 0.5, 10, 0, 0);
          ctx.fill();
          ctx.restore();

          // Upper Right Leaf
          ctx.save();
          ctx.translate(seedCenterX + 1 + windSway * 0.75, leafAttachY2 - 4);
          ctx.rotate(0.48 + windSway * 0.05);
          ctx.fillStyle = "#22c55e";
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(leafLen2 * 0.6, -14, leafLen2, -3);
          ctx.quadraticCurveTo(leafLen2 * 0.5, 10, 0, 0);
          ctx.fill();
          ctx.restore();
        }

        // Crown: Golden Grain / Fruit Spikelets - emerge at shootProgress > 0.75
        if (shootProgress > 0.75) {
          const grainP = Math.min(1, (shootProgress - 0.75) / 0.25);
          const grainY = stemTopY - 2;

          ctx.save();
          ctx.translate(seedCenterX + windSway, grainY);
          ctx.rotate(windSway * 0.06);

          // Golden Ear of Grain Spikelets
          for (let g = 0; g < 7; g++) {
            const gy = -g * 7 * grainP;
            const side = g % 2 === 0 ? 1 : -1;
            ctx.fillStyle = "#fbbf24"; // Radiant golden wheat
            ctx.beginPath();
            ctx.ellipse(
              side * 5 * grainP,
              gy,
              4.5 * grainP,
              2.5 * grainP,
              side * 0.4,
              0,
              Math.PI * 2
            );
            ctx.fill();

            // Awn (fine whisker)
            ctx.strokeStyle = "rgba(251, 191, 36, 0.7)";
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(side * 7 * grainP, gy);
            ctx.lineTo(side * 14 * grainP, gy - 6);
            ctx.stroke();
          }

          // Golden Crown Ambient Glow
          const crownGlow = ctx.createRadialGradient(0, -25, 2, 0, -25, 35);
          crownGlow.addColorStop(0, "rgba(251, 191, 36, 0.4)");
          crownGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
          ctx.fillStyle = crownGlow;
          ctx.beginPath();
          ctx.arc(0, -25, 35, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        }

        ctx.restore();
      }

      // Continue render loop
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
