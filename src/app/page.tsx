"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import LanguageSelector from "@/components/LanguageSelector";
import ConnectedFarmerJourney from "@/components/ConnectedFarmerJourney";

const ROLE_PORTALS: Record<string, string> = {
  FARMER: "/farmer",
  BUYER: "/buyer",
  ADMIN: "/admin",
  TRANSPORT_PROVIDER: "/logistics",
  LOGISTICS: "/logistics",
  FPO_ADMIN: "/fpo",
  MACHINERY_PROVIDER: "/machinery",
  STORAGE_PROVIDER: "/storage",
  EXPERT: "/experts",
};

export default function HomePage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Role-based automatic redirection for returning authenticated users
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      const destination = ROLE_PORTALS[user.role] || "/farmer";
      const timer = setTimeout(() => {
        setIsRedirecting(true);
        router.replace(destination);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isLoading, isAuthenticated, user, router]);

  const roleExperiences = [
    {
      role: "Farmer / किसान",
      icon: "🌾",
      title: "Farmer-First Experience",
      description: "Sell harvests at fair prices, get instant photo-based AI crop grading, and receive guaranteed escrow payouts to your bank.",
      href: "/farmer",
      cta: "Open Farmer Portal →",
      accent: "bg-emerald-600 text-white",
      badge: "Highest Priority",
    },
    {
      role: "Buyer / खरीदार",
      icon: "🛒",
      title: "Commercial Buyer Hub",
      description: "Procure verified quality produce directly from farm gates, negotiate transparent counter-offers, and manage multi-stop pooling.",
      href: "/buyer",
      cta: "Open Buyer Hub →",
      accent: "bg-stone-900 text-white",
      badge: "Direct Procurement",
    },
    {
      role: "Transporter / ट्रांसपोर्टर",
      icon: "🚚",
      title: "Rural Logistics & Haulage",
      description: "Discover open farm freight jobs, accept assignments, optimize multi-farm pickup routes, and track verified mileage earnings.",
      href: "/logistics",
      cta: "Open Transporter Portal →",
      accent: "bg-amber-600 text-white",
      badge: "Fleet Dispatch",
    },
    {
      role: "Administrator / प्रशासक",
      icon: "🛡️",
      title: "Admin Integrity Console",
      description: "Participant KYC verification, electronic weighbridge variance monitoring, escrow audit trails, and platform governance.",
      href: "/admin",
      cta: "Open Admin Console →",
      accent: "bg-purple-800 text-white",
      badge: "Invitation Only",
    },
  ];

  const fourSteps = [
    {
      number: "1",
      icon: "📸",
      title: "Take Crop Photo",
      desc: "Instant AI checks color, size, and defects for honest Grade A/B/C.",
    },
    {
      number: "2",
      icon: "🤝",
      title: "Fair Direct Offers",
      desc: "Verified buyers make transparent offers with zero broker cuts.",
    },
    {
      number: "3",
      icon: "🚚",
      title: "Farm-Gate Pickup",
      desc: "Scheduled trucks pick up produce right from your farm gate.",
    },
    {
      number: "4",
      icon: "💰",
      title: "Guaranteed Payout",
      desc: "Electronic weighment confirms weight and releases instant payment.",
    },
  ];

  const modules = [
    { title: "Live Marketplace", href: "/marketplace", icon: "🏪", desc: "Browse harvests & instant procurement offers." },
    { title: "AI Quality Grading", href: "/quality", icon: "🤖", desc: "Instant computer vision crop inspection." },
    { title: "Crop Planner", href: "/crop-planner", icon: "🌱", desc: "Season, soil, and yield planner for smallholders." },
    { title: "Profit Calculator", href: "/profit-calculator", icon: "🧮", desc: "Break-even price, yield, and unit economics." },
    { title: "FPO Aggregation", href: "/fpo", icon: "👥", desc: "Farmer group bulk pooling and collective sales." },
    { title: "Machinery Hire", href: "/machinery", icon: "🚜", desc: "Rent tractors, drone sprayers, and harvesters." },
    { title: "AgriCycle Residue", href: "/agricycle", icon: "♻️", desc: "Monetize straw and stalks without burning." },
    { title: "Soil Health Advisory", href: "/soil-health", icon: "🧪", desc: "Soil test analysis and KVK scientist consults." },
    { title: "Logistics & Fleet", href: "/logistics", icon: "🚚", desc: "Farm-to-mandi freight and temperature transit." },
    { title: "Government Schemes", href: "/schemes", icon: "🏛️", desc: "PM-KISAN, PMFBY, and solar scheme guides." },
    { title: "Farm Records", href: "/farm-records", icon: "📒", desc: "Track costs, revenues, and export statements." },
    { title: "Storage & Cold Rooms", href: "/storage", icon: "🏬", desc: "WDRA-verified godowns and cold storage." },
    { title: "Certified Agri-Inputs", href: "/inputs", icon: "📦", desc: "Quality seeds, bio-fertilizers, and tools." },
    { title: "Crop Health Triage", href: "/crop-triage", icon: "🔬", desc: "Photo-based pest triage and treatment." },
    { title: "Water Planner", href: "/water-planner", icon: "💧", desc: "Borewell runtime and drip irrigation plan." },
    { title: "Digital Weighbridge", href: "/weighment", icon: "⚖️", desc: "Verified tare/gross receipts to avoid cheating." },
    { title: "Agricultural Learning", href: "/learning", icon: "📚", desc: "Best farming practices and crop guides." },
    { title: "Market Forecasts", href: "/forecast", icon: "📈", desc: "Historical price benchmarks and demand forecasts." },
    { title: "Escrow & Settlements", href: "/transaction", icon: "💳", desc: "Milestone escrow receipts and settlement." },
    { title: "My Farm Profile", href: "/farm-profile", icon: "🏡", desc: "Survey numbers, geo-plots, and crop stages." },
  ];

  // If authenticated, show a welcoming redirection screen
  if (isRedirecting && user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8f5] p-6 text-center">
        <div className="max-w-md rounded-3xl border border-stone-200 bg-white p-8 shadow-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-3xl text-white shadow-md">
            🌱
          </div>
          <h1 className="mt-4 text-2xl font-black text-stone-900">
            Welcome back, {user.fullName}!
          </h1>
          <p className="mt-2 text-sm text-stone-600">
            Redirecting you to your verified <span className="font-bold text-emerald-800">{user.role}</span> dashboard...
          </p>
          <div className="mt-6 flex justify-center">
            <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7faf7] text-[#142319]">
      {/* PUBLIC WELCOMING NAVBAR */}
      <nav className="sticky top-0 z-50 border-b border-stone-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          {/* Logo & Tagline */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-700 text-2xl text-white shadow-sm">
              🌱
            </div>
            <div>
              <div className="text-xl font-black tracking-tight text-stone-900">X-MILE</div>
              <div className="text-[10px] font-bold tracking-wider text-emerald-800">
                Every MILE Matters, Every FARMER Matters.
              </div>
            </div>
          </Link>

          {/* Quick Language Selector & Auth CTAs */}
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSelector />

            <Link
              href="/login"
              className="rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-bold text-stone-700 shadow-2xs hover:bg-stone-50 transition"
            >
              Sign In
            </Link>

            <Link
              href="/register"
              className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-emerald-800 transition"
            >
              Register
            </Link>
          </div>
        </div>
      </nav>

      {/* PUBLIC HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50/70 via-white to-[#f7faf7] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-100/60 px-4 py-1.5 text-xs font-black text-emerald-900">
            <span>🌾</span>
            <span>Zero Middlemen • Fair Price • Guaranteed Escrow</span>
          </div>

          <h1 className="mt-6 text-4xl font-black tracking-tight text-stone-900 sm:text-5xl lg:text-6xl leading-[1.12]">
            Fair Agricultural Market for <br className="hidden sm:inline" />
            <span className="text-emerald-700">Every Indian Farmer</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-stone-600 sm:text-lg">
            X-MILE connects hardworking farmers directly with verified buyers and local transporters.
            Get instant AI quality grading from a smartphone photo, agree on honest prices, and track pickup to your bank account.
          </p>

          {/* High-Contrast Role Entry CTAs */}
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Link
              href="/farmer"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-8 py-4 text-base font-black text-white shadow-lg shadow-emerald-700/20 hover:bg-emerald-800 sm:w-auto transition transform hover:-translate-y-0.5"
            >
              <span className="text-xl">🌾</span>
              <span>I am a Farmer (किसान पोर्टल)</span>
            </Link>

            <Link
              href="/buyer"
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-stone-800 bg-white px-8 py-4 text-base font-black text-stone-900 shadow-sm hover:bg-stone-50 sm:w-auto transition transform hover:-translate-y-0.5"
            >
              <span className="text-xl">🛒</span>
              <span>I am a Buyer (खरीदार पोर्टल)</span>
            </Link>

            <Link
              href="/logistics"
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-stone-300 bg-white px-6 py-4 text-sm font-bold text-stone-700 shadow-2xs hover:bg-stone-50 sm:w-auto transition"
            >
              <span className="text-lg">🚚</span>
              <span>Transporters</span>
            </Link>
          </div>

          {/* Quick Highlights */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs font-bold text-stone-500">
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-600">✓</span> 22 Indian Languages Supported
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-600">✓</span> Spoken Voice Guidance
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-600">✓</span> Electronic Weighbridge Integration
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-600">✓</span> Instant Milestone Escrow
            </span>
          </div>
        </div>
      </section>

      {/* 4-STEP SIMPLE VISUAL FLOW */}
      <section className="border-y border-stone-200 bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-800">
              Simple 4-Step Process
            </span>
            <h2 className="mt-2 text-2xl font-black text-stone-900 sm:text-3xl">
              How X-MILE Works For You
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-stone-600">
              No complicated paperwork. No hidden cuts. Everything happens transparently.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {fourSteps.map((step) => (
              <div
                key={step.number}
                className="relative rounded-3xl border border-stone-200 bg-stone-50/50 p-6 text-center hover:border-emerald-300 hover:bg-emerald-50/30 transition"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm border border-stone-200">
                  {step.icon}
                </div>
                <div className="mt-4 text-xs font-black text-emerald-800">
                  STEP {step.number}
                </div>
                <h3 className="mt-1 text-base font-black text-stone-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-stone-600">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4 DISTINCT ROLE EXPERIENCES */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-800">
              Tailored Portals
            </span>
            <h2 className="mt-2 text-2xl font-black text-stone-900 sm:text-3xl">
              Four Connected Roles. One Unified Platform.
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-stone-600 max-w-xl mx-auto">
              Every participant gets their own dedicated dashboard, simple controls, and authorized operations.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {roleExperiences.map((exp) => (
              <div
                key={exp.role}
                className="flex flex-col justify-between rounded-3xl border border-stone-200 bg-white p-6 shadow-sm hover:shadow-md transition"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-3xl">{exp.icon}</span>
                    <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[10px] font-bold text-stone-700">
                      {exp.badge}
                    </span>
                  </div>
                  <div className="text-xs font-black text-emerald-800">{exp.role}</div>
                  <h3 className="mt-1 text-lg font-black text-stone-900">{exp.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-stone-600">{exp.description}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-stone-100">
                  <Link
                    href={exp.href}
                    className={`block w-full rounded-xl py-3 text-center text-xs font-black shadow-xs transition hover:opacity-90 ${exp.accent}`}
                  >
                    {exp.cta}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9-STEP CONNECTED FARMER JOURNEY */}
      <section className="border-t border-stone-200 bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                Complete Data Continuity
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-stone-900 mt-1">
                The 9-Step Connected Farmer Journey
              </h2>
            </div>
            <p className="text-xs text-stone-500 max-w-md">
              From initial pre-season soil tests to milestone escrow payouts, all phases share authoritative data.
            </p>
          </div>
          <ConnectedFarmerJourney currentStep="plan" />
        </div>
      </section>

      {/* ALL 21 AGRICULTURAL MODULES DIRECTORY */}
      <section className="border-t border-stone-200 bg-[#f7faf7] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-10">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-800">
              Complete Agricultural Directory
            </span>
            <h2 className="mt-2 text-2xl font-black text-stone-900 sm:text-3xl">
              Explore All Platform Modules
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-stone-600">
              Access agronomic planning, equipment hire, government schemes, residue trading, and digital records.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {modules.map((m) => (
              <Link
                key={m.title}
                href={m.href}
                className="group flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-4 shadow-2xs hover:border-emerald-300 hover:bg-emerald-50/20 transition"
              >
                <div>
                  <span className="text-2xl">{m.icon}</span>
                  <div className="mt-2 text-xs font-bold text-stone-900 group-hover:text-emerald-800">
                    {m.title}
                  </div>
                  <p className="mt-1 text-[11px] leading-snug text-stone-500 line-clamp-2">
                    {m.desc}
                  </p>
                </div>
                <span className="mt-3 text-[10px] font-black text-emerald-700">Open →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* PUBLIC FOOTER */}
      <footer className="border-t border-stone-200 bg-white px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="text-lg">🌱</span>
              <span className="font-black text-stone-900">X-MILE</span>
              <span className="text-xs text-stone-500">| Digital Agriculture Platform</span>
            </div>
            <div className="text-xs font-semibold text-stone-500 mt-1">
              Every MILE Matters, Every FARMER Matters.
            </div>
          </div>

          <div className="text-xs text-stone-500">
            © {new Date().getFullYear()} X-MILE. Built for Indian Smallholders. {t("common.allRightsReserved")}
          </div>
        </div>
      </footer>
    </main>
  );
}
