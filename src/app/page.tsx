"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const languages = ["English", "ಕನ್ನಡ", "हिन्दी", "தமிழ்"];

const modules = [
  {
    title: "Farmer Portal",
    description: "Add harvest, manage inventory and respond to buyer orders.",
    href: "/farmer",
    icon: "🌾",
  },
  {
    title: "Buyer Portal",
    description: "Create requirements, match supply and track orders.",
    href: "/buyer",
    icon: "🛒",
  },
  {
    title: "AI Quality",
    description: "Use X-MILE AI Vision to evaluate produce quality.",
    href: "/quality",
    icon: "🤖",
  },
  {
    title: "Demand Forecast",
    description: "Understand demand before making procurement decisions.",
    href: "/forecast",
    icon: "📈",
  },
  {
    title: "Transactions",
    description: "View transparent procurement and transaction activity.",
    href: "/transaction",
    icon: "💳",
  },
];

const processSteps = [
  { number: "01", title: "Farmer", icon: "👨‍🌾" },
  { number: "02", title: "Add Harvest", icon: "🌾" },
  { number: "03", title: "AI Vision", icon: "🤖" },
  { number: "04", title: "Buyer", icon: "🏪" },
  { number: "05", title: "Smart Match", icon: "🔗" },
  { number: "06", title: "Order", icon: "📦" },
  { number: "07", title: "Delivery", icon: "🚚" },
];

const farmers = [
  { name: "Farmer A", quantity: 1500 },
  { name: "Farmer B", quantity: 1200 },
  { name: "Farmer C", quantity: 1300 },
  { name: "Farmer D", quantity: 1000 },
];

export default function HomePage() {
  const [language, setLanguage] = useState("English");
  const [showLanguages, setShowLanguages] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [poolQuantity, setPoolQuantity] = useState(0);

  useEffect(() => {
    const scanTimer = setTimeout(() => {
      setScanComplete(true);
    }, 4200);

    const resetTimer = setInterval(() => {
      setScanComplete(false);

      setTimeout(() => {
        setScanComplete(true);
      }, 4200);
    }, 9000);

    return () => {
      clearTimeout(scanTimer);
      clearInterval(resetTimer);
    };
  }, []);

  useEffect(() => {
    let current = 0;
    const target = 5000;

    const timer = setInterval(() => {
      current += 100;

      if (current >= target) {
        current = target;
        clearInterval(timer);
      }

      setPoolQuantity(current);
    }, 35);

    return () => clearInterval(timer);
  }, []);

  return (
    <main className="min-h-screen overflow-hidden bg-[#f7faf7] text-[#102218]">
      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes floatSlow {
          0%,
          100% {
            transform: translate(0, 0) rotate(0deg);
          }
          50% {
            transform: translate(10px, -12px) rotate(3deg);
          }
        }

        @keyframes scan {
          0% {
            top: 5%;
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          50% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            top: 92%;
            opacity: 0;
          }
        }

        @keyframes scanGlow {
          0%,
          100% {
            opacity: 0.2;
          }
          50% {
            opacity: 0.8;
          }
        }

        @keyframes pulseDot {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.55;
          }
          50% {
            transform: scale(1.5);
            opacity: 1;
          }
        }

        @keyframes moveParticle {
          0% {
            left: 0%;
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            left: 100%;
            opacity: 0;
          }
        }

        @keyframes drawLine {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }

        @keyframes truckMove {
          0% {
            left: 0%;
          }
          100% {
            left: calc(100% - 42px);
          }
        }

        @keyframes progressFill {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }

        @keyframes reveal {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes blink {
          0%,
          45% {
            opacity: 1;
          }
          50%,
          100% {
            opacity: 0.3;
          }
        }

        .animate-fade-up {
          animation: fadeUp 0.8s ease-out both;
        }

        .animate-fade-in {
          animation: fadeIn 1s ease-out both;
        }

        .float {
          animation: float 4s ease-in-out infinite;
        }

        .float-slow {
          animation: floatSlow 7s ease-in-out infinite;
        }

        .scan-line {
          animation: scan 4.2s ease-in-out infinite;
        }

        .scan-glow {
          animation: scanGlow 2s ease-in-out infinite;
        }

        .pulse-dot {
          animation: pulseDot 2s ease-in-out infinite;
        }

        .particle {
          animation: moveParticle 3.5s linear infinite;
        }

        .truck {
          animation: truckMove 6s ease-in-out infinite alternate;
        }

        .blink {
          animation: blink 1.5s ease-in-out infinite;
        }

        .card-hover {
          transition:
            transform 0.35s ease,
            box-shadow 0.35s ease,
            border-color 0.35s ease;
        }

        .card-hover:hover {
          transform: translateY(-7px);
          box-shadow: 0 22px 50px rgba(16, 34, 24, 0.1);
          border-color: rgba(39, 111, 68, 0.25);
        }

        .button-hover {
          transition:
            transform 0.25s ease,
            box-shadow 0.25s ease,
            background 0.25s ease;
        }

        .button-hover:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 25px rgba(28, 88, 51, 0.18);
        }

        .process-card {
          animation: fadeUp 0.7s ease-out both;
        }
      `}</style>

      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 border-b border-[#dfe9e1]/80 bg-[#f7faf7]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <Link
            href="/"
            className="group flex items-center gap-2"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1f6b3b] text-lg shadow-sm transition-transform duration-300 group-hover:rotate-6">
              🌱
            </div>

            <div>
              <div className="text-lg font-black tracking-tight">
                X-MILE
              </div>
              <div className="hidden text-[9px] font-semibold tracking-[0.14em] text-[#6a7c70] sm:block">
                Every MILE Matters, Every FARMER Matters.
              </div>
            </div>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <a
              href="#how-it-works"
              className="text-sm font-medium text-[#52655a] transition-colors hover:text-[#1f6b3b]"
            >
              How it works
            </a>

            <a
              href="#ai-vision"
              className="text-sm font-medium text-[#52655a] transition-colors hover:text-[#1f6b3b]"
            >
              AI Vision
            </a>

            <a
              href="#harvest-pool"
              className="text-sm font-medium text-[#52655a] transition-colors hover:text-[#1f6b3b]"
            >
              Harvest Pool
            </a>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() =>
                  setShowLanguages(!showLanguages)
                }
                className="rounded-full border border-[#dce7df] bg-white px-4 py-2 text-sm font-medium text-[#3e5146] transition-all hover:border-[#a9c6b1]"
              >
                🌐 {language}
              </button>

              {showLanguages && (
                <div className="absolute right-0 top-12 z-50 w-36 overflow-hidden rounded-2xl border border-[#dfe9e1] bg-white p-1 shadow-xl">
                  {languages.map((item) => (
                    <button
                      key={item}
                      onClick={() => {
                        setLanguage(item);
                        setShowLanguages(false);
                      }}
                      className="w-full rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-[#f0f7f1]"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Link
              href="/buyer"
              className="button-hover hidden rounded-full bg-[#1f6b3b] px-5 py-2.5 text-sm font-bold text-white sm:block"
            >
              Explore Demo →
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative mx-auto max-w-7xl px-5 pb-20 pt-20 lg:px-8 lg:pb-28 lg:pt-28">
        <div className="pointer-events-none absolute -left-24 top-10 h-64 w-64 rounded-full bg-[#dcefdc] opacity-60 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-32 h-80 w-80 rounded-full bg-[#e6f2e7] opacity-70 blur-3xl" />

        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative z-10">
            <div
              className="animate-fade-up mb-6 inline-flex items-center gap-2 rounded-full border border-[#cfe2d2] bg-white px-4 py-2 text-xs font-bold tracking-[0.1em] text-[#327247]"
              style={{ animationDelay: "0.1s" }}
            >
              <span className="h-2 w-2 rounded-full bg-[#3c9656] shadow-[0_0_10px_rgba(60,150,86,0.6)]" />
              Every MILE Matters, Every FARMER Matters.
            </div>

            <h1
              className="animate-fade-up max-w-3xl text-5xl font-black leading-[0.98] tracking-[-0.05em] sm:text-6xl lg:text-7xl"
              style={{ animationDelay: "0.25s" }}
            >
              Your Harvest.
              <br />
              <span className="text-[#277443]">
                Your Value.
              </span>
            </h1>

            <p
              className="animate-fade-up mt-7 max-w-xl text-lg leading-8 text-[#5d6f64] sm:text-xl"
              style={{ animationDelay: "0.4s" }}
            >
              X-MILE connects farmers with trusted
              buyers, AI-assisted quality insights,
              smarter matching and transparent
              delivery.
            </p>

            <div
              className="animate-fade-up mt-9 flex flex-col gap-3 sm:flex-row"
              style={{ animationDelay: "0.55s" }}
            >
              <Link
                href="/farmer"
                className="button-hover rounded-2xl bg-[#1f6b3b] px-7 py-4 text-center font-bold text-white shadow-lg shadow-[#1f6b3b]/15"
              >
                I&apos;m a Farmer →
              </Link>

              <Link
                href="/buyer"
                className="button-hover rounded-2xl border border-[#cadbce] bg-white px-7 py-4 text-center font-bold text-[#244b31]"
              >
                I&apos;m a Buyer →
              </Link>
            </div>

            <div
              className="animate-fade-up mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-[#718178]"
              style={{ animationDelay: "0.7s" }}
            >
              <span>✓ Verified participants</span>
              <span>✓ AI-assisted quality</span>
              <span>✓ Organized logistics</span>
            </div>
          </div>

          {/* HERO AI VISUAL */}
          <div
            className="animate-fade-up relative"
            style={{ animationDelay: "0.35s" }}
          >
            <div className="absolute -right-6 -top-8 h-24 w-24 rounded-full border border-[#cfe3d2] bg-white/70 blur-[1px] float-slow" />
            <div
              className="absolute -bottom-10 -left-8 h-20 w-20 rounded-full bg-[#e1f0e3] float"
              style={{ animationDelay: "1s" }}
            />

            <div
              id="ai-vision"
              className="relative overflow-hidden rounded-[2rem] border border-[#dce8df] bg-white p-4 shadow-[0_30px_80px_rgba(25,70,38,0.10)]"
            >
              <div className="mb-3 flex items-center justify-between px-2">
                <div>
                  <div className="text-xs font-black tracking-[0.18em] text-[#277443]">
                    X-MILE AI VISION
                  </div>
                  <div className="mt-1 text-sm text-[#728078]">
                    Computer vision quality analysis
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-full bg-[#eff8f0] px-3 py-1.5 text-[10px] font-bold text-[#317445]">
                  <span className="blink h-1.5 w-1.5 rounded-full bg-[#3c9656]" />
                  LIVE SCAN
                </div>
              </div>

              <div className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] bg-[#dbead9]">
                {/* Produce illustration */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,#f1f6df_0%,#c7ddc1_40%,#9fbd9d_100%)]" />

                <div className="absolute left-[22%] top-[30%] h-28 w-28 rounded-full bg-[#d7a83d] shadow-[inset_-12px_-14px_25px_rgba(85,58,10,0.15),0_20px_30px_rgba(47,70,39,0.16)] sm:h-36 sm:w-36" />

                <div className="absolute left-[46%] top-[42%] h-32 w-32 rounded-full bg-[#e0b84c] shadow-[inset_-15px_-16px_25px_rgba(85,58,10,0.15),0_20px_30px_rgba(47,70,39,0.16)] sm:h-40 sm:w-40" />

                <div className="absolute left-[33%] top-[55%] h-24 w-24 rounded-full bg-[#c9942e] shadow-[inset_-10px_-12px_20px_rgba(85,58,10,0.18)] sm:h-32 sm:w-32" />

                {/* Leaves */}
                <div className="absolute left-[35%] top-[20%] h-10 w-20 -rotate-25 rounded-full bg-[#4d824e]" />
                <div className="absolute left-[51%] top-[28%] h-9 w-20 rotate-20 rounded-full bg-[#5b8f57]" />

                {/* Detection points */}
                <div className="pulse-dot absolute left-[29%] top-[39%] h-3 w-3 rounded-full border-2 border-white bg-[#24703e] shadow-lg" />
                <div
                  className="pulse-dot absolute left-[56%] top-[48%] h-3 w-3 rounded-full border-2 border-white bg-[#24703e] shadow-lg"
                  style={{ animationDelay: "0.5s" }}
                />
                <div
                  className="pulse-dot absolute left-[43%] top-[63%] h-3 w-3 rounded-full border-2 border-white bg-[#24703e] shadow-lg"
                  style={{ animationDelay: "1s" }}
                />

                {/* Detection labels */}
                <div className="absolute left-[13%] top-[34%] rounded-md bg-[#173523]/85 px-2 py-1 text-[8px] font-bold tracking-wider text-white">
                  COLOR
                </div>

                <div className="absolute right-[10%] top-[43%] rounded-md bg-[#173523]/85 px-2 py-1 text-[8px] font-bold tracking-wider text-white">
                  TEXTURE
                </div>

                <div className="absolute left-[29%] bottom-[14%] rounded-md bg-[#173523]/85 px-2 py-1 text-[8px] font-bold tracking-wider text-white">
                  SIZE
                </div>

                {/* Scan frame */}
                <div className="absolute inset-[9%] rounded-xl border border-white/40">
                  <div className="absolute left-0 top-0 h-7 w-7 border-l-2 border-t-2 border-[#efffec]" />
                  <div className="absolute right-0 top-0 h-7 w-7 border-r-2 border-t-2 border-[#efffec]" />
                  <div className="absolute bottom-0 left-0 h-7 w-7 border-b-2 border-l-2 border-[#efffec]" />
                  <div className="absolute bottom-0 right-0 h-7 w-7 border-b-2 border-r-2 border-[#efffec]" />

                  {/* Scan beam */}
                  <div className="scan-line absolute left-0 right-0 h-[3px] bg-[#f3fff1] shadow-[0_0_18px_6px_rgba(227,255,218,0.7)]">
                    <div className="scan-glow absolute -top-6 h-12 w-full bg-[#e9ffdf]/20 blur-xl" />
                  </div>
                </div>

                {/* Scanning label */}
                <div className="absolute bottom-4 left-4 rounded-xl border border-white/20 bg-[#122a1b]/80 px-4 py-3 text-white backdrop-blur-md">
                  <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.15em]">
                    <span className="blink h-1.5 w-1.5 rounded-full bg-[#b9ed9f]" />
                    ANALYZING HARVEST
                  </div>
                  <div className="mt-1 text-xs text-white/65">
                    {scanComplete
                      ? "Visual indicators detected"
                      : "Scanning produce surface..."}
                  </div>
                </div>
              </div>

              {/* AI result */}
              <div
                className={`mt-3 grid grid-cols-[1fr_auto] items-center rounded-2xl bg-[#f3f8f3] p-4 transition-all duration-700 ${
                  scanComplete
                    ? "opacity-100"
                    : "opacity-60"
                }`}
              >
                <div>
                  <div className="text-[10px] font-bold tracking-[0.16em] text-[#718078]">
                    QUALITY GRADE
                  </div>

                  <div className="mt-1 flex items-center gap-3">
                    <span className="text-4xl font-black text-[#277443]">
                      {scanComplete ? "A" : "—"}
                    </span>

                    <div>
                      <div className="text-xs font-bold text-[#31533c]">
                        {scanComplete
                          ? "Excellent visual quality"
                          : "Processing..."}
                      </div>
                      <div className="mt-2 h-1.5 w-36 overflow-hidden rounded-full bg-[#d9e7da]">
                        <div
                          className="h-full rounded-full bg-[#3f8b51] transition-all duration-1000"
                          style={{
                            width: scanComplete
                              ? "92%"
                              : "35%",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] font-bold tracking-[0.15em] text-[#718078]">
                    CONFIDENCE
                  </div>
                  <div className="mt-1 text-2xl font-black text-[#183c26]">
                    {scanComplete ? "92%" : "..."}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section
        id="how-it-works"
        className="border-y border-[#e1e9e2] bg-white"
      >
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="animate-fade-up text-xs font-black tracking-[0.2em] text-[#34794a]">
              ONE CONNECTED JOURNEY
            </div>

            <h2 className="animate-fade-up mt-3 text-3xl font-black tracking-tight sm:text-4xl">
              From harvest to opportunity.
            </h2>

            <p className="animate-fade-up mt-4 text-[#68776e]">
              X-MILE connects every important step
              into one simple agricultural workflow.
            </p>
          </div>

          <div className="relative mt-14">
            {/* Animated connecting line */}
            <div className="absolute left-[7%] right-[7%] top-9 hidden h-[2px] overflow-hidden bg-[#dce8de] md:block">
              <div
                className="h-full bg-[#4b8e59]"
                style={{
                  animation:
                    "drawLine 4s ease-in-out infinite",
                }}
              />

              <div className="particle absolute top-[-2px] h-1.5 w-1.5 rounded-full bg-[#277443]" />
            </div>

            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:grid-cols-7">
              {processSteps.map((step, index) => (
                <div
                  key={step.number}
                  className="process-card relative text-center"
                  style={{
                    animationDelay: `${index * 0.12}s`,
                  }}
                >
                  <div className="relative z-10 mx-auto flex h-[74px] w-[74px] items-center justify-center rounded-2xl border border-[#dce8df] bg-white text-2xl shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-lg">
                    {step.icon}
                  </div>

                  <div className="mt-3 text-[10px] font-black tracking-widest text-[#8b9b91]">
                    {step.number}
                  </div>

                  <div className="mt-1 text-sm font-bold text-[#294432]">
                    {step.title}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* THREE FEATURE CARDS */}
      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="grid gap-5 md:grid-cols-3">
          <FeatureCard
            icon="🤖"
            label="AI QUALITY"
            title="Computer vision for your harvest."
            description="X-MILE AI Vision analyzes visual quality indicators and generates an easy-to-understand grade."
            href="/quality"
            delay="0s"
          />

          <FeatureCard
            icon="🌾"
            label="SMART HARVEST POOL"
            title="Small farms. One stronger supply."
            description="Combine produce from multiple farmers to fulfill buyer requirements without losing farmer participation."
            href="/buyer"
            delay="0.12s"
          />

          <FeatureCard
            icon="🚚"
            label="TRANSPARENT LOGISTICS"
            title="Know where the order is."
            description="Track order progress from dispatch to delivery with visible shipment status."
            href="/buyer"
            delay="0.24s"
          />
        </div>
      </section>

      {/* HARVEST POOL */}
      <section
        id="harvest-pool"
        className="mx-auto max-w-7xl px-5 pb-20 lg:px-8"
      >
        <div className="overflow-hidden rounded-[2rem] border border-[#dce8df] bg-[#edf6ed]">
          <div className="grid lg:grid-cols-[0.85fr_1.15fr]">
            <div className="relative overflow-hidden p-8 sm:p-10">
              <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-white/50 blur-2xl" />

              <div className="relative">
                <div className="text-xs font-black tracking-[0.18em] text-[#36764a]">
                  SMART HARVEST POOL
                </div>

                <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                  One requirement.
                  <br />
                  Multiple farmers.
                </h2>

                <p className="mt-5 max-w-md leading-7 text-[#627368]">
                  X-MILE aggregates available supply
                  from multiple farmers so buyers can
                  fulfill larger requirements efficiently.
                </p>

                <div className="mt-8 flex items-end gap-2">
                  <span className="text-4xl font-black text-[#1f6b3b]">
                    {poolQuantity.toLocaleString()}
                  </span>
                  <span className="pb-1 text-sm font-bold text-[#6b7b70]">
                    / 5,000 kg
                  </span>
                </div>

                <div className="mt-3 h-3 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-[#327b48] transition-all duration-300"
                    style={{
                      width: `${Math.min(
                        100,
                        (poolQuantity / 5000) * 100
                      )}%`,
                    }}
                  />
                </div>

                <div className="mt-4 flex items-center gap-2 text-sm font-bold text-[#317247]">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white">
                    ✓
                  </span>
                  Requirement Fulfilled
                </div>
              </div>
            </div>

            <div className="bg-white p-6 sm:p-10">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-black tracking-[0.16em] text-[#819087]">
                    BUYER REQUIREMENT
                  </div>
                  <div className="mt-1 text-xl font-black">
                    5,000 kg Onion
                  </div>
                </div>

                <div className="rounded-full bg-[#eef7ef] px-3 py-1 text-xs font-bold text-[#337348]">
                  Matched
                </div>
              </div>

              <div className="space-y-3">
                {farmers.map((farmer, index) => (
                  <div
                    key={farmer.name}
                    className="card-hover flex items-center gap-4 rounded-2xl border border-[#e3ebe4] bg-[#fbfdfb] p-4"
                    style={{
                      animation:
                        "fadeUp 0.6s ease-out both",
                      animationDelay: `${0.2 + index * 0.15}s`,
                    }}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e7f1e8]">
                      👨‍🌾
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold">
                          {farmer.name}
                        </span>
                        <span className="text-sm font-black text-[#2d7044]">
                          {farmer.quantity.toLocaleString()} kg
                        </span>
                      </div>

                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e4ece5]">
                        <div
                          className="h-full rounded-full bg-[#78a77d]"
                          style={{
                            width: `${
                              (farmer.quantity / 1500) *
                              100
                            }%`,
                            animation:
                              "progressFill 1.2s ease-out both",
                            animationDelay: `${
                              0.5 + index * 0.15
                            }s`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl bg-[#f2f7f2] p-4 text-center text-sm font-semibold text-[#4f6256]">
                4 farmers combined to fulfill one
                buyer requirement.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* LOGISTICS */}
      <section className="border-y border-[#e1e9e2] bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <div className="text-xs font-black tracking-[0.18em] text-[#34794a]">
                TRANSPARENT LOGISTICS
              </div>

              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                From farm to buyer,
                <br />
                keep it visible.
              </h2>

              <p className="mt-5 max-w-lg leading-7 text-[#69786e]">
                Once an order is dispatched, X-MILE
                provides a clear shipment status so both
                sides can follow the journey.
              </p>

              <Link
                href="/buyer"
                className="button-hover mt-7 inline-flex rounded-xl bg-[#1f6b3b] px-5 py-3 text-sm font-bold text-white"
              >
                View Buyer Tracking →
              </Link>
            </div>

            <div className="rounded-[2rem] border border-[#dce8df] bg-[#f8fbf8] p-7 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-black tracking-[0.16em] text-[#7b8a81]">
                    SHIPMENT STATUS
                  </div>
                  <div className="mt-1 text-lg font-black">
                    Order in transit
                  </div>
                </div>

                <div className="rounded-full bg-[#e9f5ea] px-3 py-1 text-xs font-bold text-[#327247]">
                  ● LIVE
                </div>
              </div>

              <div className="relative mt-12">
                <div className="h-1 rounded-full bg-[#dbe6dc]" />

                <div
                  className="absolute left-0 top-0 h-1 w-full origin-left rounded-full bg-[#4d8b58]"
                  style={{
                    animation:
                      "drawLine 6s ease-in-out infinite alternate",
                  }}
                />

                <div className="absolute -top-4 left-0 flex h-9 w-9 items-center justify-center rounded-full border-4 border-white bg-[#33794a] text-xs shadow-md">
                  🌾
                </div>

                <div className="truck absolute -top-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border-4 border-white bg-[#f0f6ef] text-xl shadow-lg">
                    🚚
                  </div>
                </div>

                <div className="absolute -top-4 right-0 flex h-9 w-9 items-center justify-center rounded-full border-4 border-white bg-[#33794a] text-xs shadow-md">
                  🏪
                </div>
              </div>

              <div className="mt-10 flex justify-between text-xs font-bold text-[#617167]">
                <span>Tumakuru</span>
                <span>Bengaluru</span>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <StatusBox
                  title="STATUS"
                  value="In Transit"
                />
                <StatusBox
                  title="CURRENT"
                  value="Tumakuru"
                />
                <StatusBox
                  title="VISIBILITY"
                  value="Live"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* EXPLORE MODULES */}
      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="text-center">
          <div className="text-xs font-black tracking-[0.2em] text-[#34794a]">
            EXPLORE X-MILE
          </div>

          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            Everything connected in one platform.
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-[#69786e]">
            Use the actual X-MILE modules below to
            explore the complete procurement workflow.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {modules.map((module, index) => (
            <Link
              key={module.title}
              href={module.href}
              className="card-hover rounded-2xl border border-[#dfe8e1] bg-white p-5"
              style={{
                animation:
                  "fadeUp 0.65s ease-out both",
                animationDelay: `${index * 0.1}s`,
              }}
            >
              <div className="float-slow text-3xl">
                {module.icon}
              </div>

              <div className="mt-5 text-sm font-black">
                {module.title}
              </div>

              <p className="mt-2 text-xs leading-5 text-[#718077]">
                {module.description}
              </p>

              <div className="mt-5 text-xs font-black text-[#317247]">
                Open module →
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="px-5 pb-20 lg:px-8">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-[#173c25] px-7 py-14 text-center text-white sm:px-12">
          <div className="absolute left-10 top-10 h-32 w-32 rounded-full bg-[#5e996a]/10 blur-2xl" />
          <div className="absolute bottom-0 right-10 h-40 w-40 rounded-full bg-[#9bc89f]/10 blur-3xl" />

          <div className="relative">
            <div className="text-3xl font-black tracking-tight sm:text-4xl">
              Better value for farmers.
              <br />
              Better sourcing for buyers.
            </div>

            <p className="mx-auto mt-5 max-w-xl text-sm leading-6 text-white/65">
              Experience the X-MILE procurement workflow
              through the working demo.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/farmer"
                className="button-hover rounded-xl bg-white px-6 py-3 font-bold text-[#173c25]"
              >
                Enter Farmer Portal
              </Link>

              <Link
                href="/buyer"
                className="button-hover rounded-xl border border-white/20 bg-white/10 px-6 py-3 font-bold text-white backdrop-blur"
              >
                Enter Buyer Portal
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#dfe8e1] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-sm text-[#75837a] sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div>
            <span className="font-black text-[#213a29]">
              X-MILE
            </span>{" "}
            — Every MILE Matters, Every FARMER Matters.
          </div>

          <div className="text-xs">
            College Demo • AI • Smart Matching • Logistics
          </div>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({
  icon,
  label,
  title,
  description,
  href,
  delay,
}: {
  icon: string;
  label: string;
  title: string;
  description: string;
  href: string;
  delay: string;
}) {
  return (
    <Link
      href={href}
      className="card-hover animate-fade-up rounded-[1.75rem] border border-[#dfe8e1] bg-white p-7"
      style={{ animationDelay: delay }}
    >
      <div className="flex items-start justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#edf6ee] text-2xl">
          {icon}
        </div>

        <span className="text-xs font-bold text-[#8b998f]">
          →
        </span>
      </div>

      <div className="mt-6 text-[10px] font-black tracking-[0.18em] text-[#4b8358]">
        {label}
      </div>

      <h3 className="mt-2 text-xl font-black tracking-tight">
        {title}
      </h3>

      <p className="mt-3 text-sm leading-6 text-[#6d7c72]">
        {description}
      </p>
    </Link>
  );
}

function StatusBox({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-[#e0e9e1] bg-white p-3">
      <div className="text-[9px] font-black tracking-[0.14em] text-[#8a988f]">
        {title}
      </div>
      <div className="mt-1 text-xs font-bold text-[#294632]">
        {value}
      </div>
    </div>
  );
}