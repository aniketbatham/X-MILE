"use client";

import React, { useEffect } from "react";
import Link from "next/link";

export default function HomePage() {
  useEffect(() => {
    // Ensure documentElement has is-loading at startup as expected by seed engine
    document.documentElement.classList.add("is-loading");

    // Load the production WebGL Seed engine script
    const script = document.createElement("script");
    script.type = "module";
    script.crossOrigin = "anonymous";
    script.src = "/_/DenPkkVr.js";
    document.body.appendChild(script);

    return () => {
      // Clean up on unmount
      document.documentElement.classList.remove("is-loading", "is-gating", "has-cursor", "webgl-text", "is-revealing");
      script.remove();
    };
  }, []);

  return (
    <>
      <link rel="stylesheet" href="/_/seed.css" />

      {/* Fullscreen WebGL2 Canvas */}
      <canvas className="webgl" aria-hidden="true" />

      {/* 1100vh Scroll Track */}
      <div className="scroll-track" aria-hidden="true" />

      {/* HUD & Chapter Overlays */}
      <div className="overlay">
        <section className="chapters" data-chapters aria-live="polite" />
        
        <nav className="rail" data-rail aria-label="Chapters">
          <div className="rail__cursor" aria-hidden="true">
            <span data-rail-index>01</span>
          </div>
          <div className="cue" data-cue aria-hidden="true">
            <div className="cue__stem">
              <svg className="cue__root" viewBox="0 0 24 96">
                <path
                  className="cue__line"
                  pathLength={1}
                  d="M12 0 C12 14 10.6 24 11.6 36 C12.6 48 13.4 58 12.2 70 C11.4 78 11.2 86 11.6 94"
                />
                <path className="cue__line cue__line--side" pathLength={1} d="M11.7 40 C13.8 45 16.6 48 19.5 55" />
                <path className="cue__line cue__line--side" pathLength={1} d="M12.6 62 C10.6 66 8.2 69 5.4 74" />
              </svg>
              <i className="cue__tip" />
            </div>
            <span className="cue__label">Scroll</span>
          </div>
        </nav>

        <p className="calendar" data-calendar aria-hidden="true">
          <span className="calendar__day">
            Day <b data-calendar-day>000</b>
          </span>
          <span className="calendar__season" data-calendar-season>
            Spring
          </span>
          <span className="calendar__year" data-calendar-year hidden />
        </p>

        <div className="hud">
          <Link
            href="/login"
            style={{
              color: "var(--ink-dim)",
              textDecoration: "none",
              letterSpacing: "0.14em",
              fontSize: "11px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              pointerEvents: "auto",
              padding: "8px 0"
            }}
            className="hover:text-[var(--ink)] transition-colors"
          >
            <span>PORTAL</span>
            <span style={{ fontSize: "12px" }}>→</span>
          </Link>
          <button className="sound" type="button" data-sound aria-pressed="false">
            <span className="sound__bars" aria-hidden="true">
              <i /><i /><i /><i />
            </span>
            <span data-sound-label>Sound off</span>
          </button>
        </div>

        <div className="fallback" data-fallback hidden>
          <p>This experience needs WebGL 2.</p>
          <p>Try a recent version of Chrome, Safari, Firefox or Edge.</p>
        </div>
      </div>

      {/* SVG Seed Breathing Loader */}
      <div
        className="loader"
        data-loader
        role="progressbar"
        aria-label="Loading"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={0}
      >
        <div className="loader__veil" data-loader-veil />
        <svg className="loader__seed" aria-hidden="true">
          <defs>
            <radialGradient id="loader-glow">
              <stop offset="0" stopColor="#ffb35c" stopOpacity="0.5" />
              <stop offset="0.4" stopColor="#ffb35c" stopOpacity="0.12" />
              <stop offset="1" stopColor="#ffb35c" stopOpacity="0.12" />
            </radialGradient>
          </defs>
          <g className="loader__breath">
            <ellipse
              data-loader-glow
              fill="url(#loader-glow)"
              cx="50%"
              cy="50%"
              rx="22%"
              ry="50%"
              style={{ opacity: 0.18 }}
            />
          </g>
          <path className="loader__outline" data-loader-outline />
          <path className="loader__line" data-loader-line pathLength={1} />
          <path className="loader__line" data-loader-line pathLength={1} />
        </svg>
      </div>

      {/* Gate Overlay Screen */}
      <div className="gate" data-gate hidden>
        <div className="gate__enter">
          <p className="gate__cta">
            <span className="sound__bars" aria-hidden="true">
              <i /><i /><i /><i />
            </span>
            <span data-gate-label>Press and hold the seed</span>
          </p>
          <p className="gate__hint">Sound on · best with headphones</p>
        </div>
        <button className="gate__silent" type="button" data-gate-silent>
          Continue in silence
        </button>
      </div>

      <div className="debug" data-debug hidden />
    </>
  );
}
