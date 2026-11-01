"use client";

import Link from "next/link";
import { useState } from "react";

export type JourneyStepId =
  | "plan"
  | "budget"
  | "prepare"
  | "grow"
  | "harvest"
  | "sell"
  | "move"
  | "recover"
  | "review";

interface JourneyStep {
  id: JourneyStepId;
  number: string;
  name: string;
  phase: string;
  icon: string;
  summary: string;
  routes: { title: string; href: string }[];
  primaryHref: string;
}

export const JOURNEY_STEPS: JourneyStep[] = [
  {
    id: "plan",
    number: "01",
    name: "Plan",
    phase: "PLANNING",
    icon: "🌱",
    summary: "Select farm plot, review soil fertility, and compare high-yield seasonal crops with benchmark assumptions.",
    routes: [
      { title: "My Farm & Plots", href: "/farm-profile" },
      { title: "Crop Planning Assistant", href: "/crop-planner" },
      { title: "Soil Health & Rotation", href: "/soil-health" },
      { title: "Crop Calendar", href: "/calendar" },
    ],
    primaryHref: "/crop-planner",
  },
  {
    id: "budget",
    number: "02",
    name: "Budget",
    phase: "ECONOMICS",
    icon: "🧮",
    summary: "Model seeds, fertilizer, labor, and machinery expenses to calculate break-even price and expected profit margins.",
    routes: [
      { title: "Profit & Break-even Calculator", href: "/profit-calculator" },
      { title: "Cost & Expense Records", href: "/farm-records" },
    ],
    primaryHref: "/profit-calculator",
  },
  {
    id: "prepare",
    number: "03",
    name: "Prepare",
    phase: "FIELD PREP",
    icon: "🚜",
    summary: "Secure government subsidies, consult KVK agronomists, and book precision machinery (tractors, land levelers).",
    routes: [
      { title: "Government Schemes Hub", href: "/schemes" },
      { title: "KVK & Expert Connect", href: "/experts" },
      { title: "Machinery Rental", href: "/machinery" },
      { title: "Agri Input Comparison", href: "/inputs" },
    ],
    primaryHref: "/machinery",
  },
  {
    id: "grow",
    number: "04",
    name: "Grow",
    phase: "CULTIVATION",
    icon: "💧",
    summary: "Log daily irrigation, execute fertigation schedules, track crop stages, and diagnose field pest alerts.",
    routes: [
      { title: "Water & Irrigation Planner", href: "/water-planner" },
      { title: "Crop Issue Photo Triage", href: "/crop-triage" },
      { title: "Cultivation Reminders", href: "/calendar" },
    ],
    primaryHref: "/water-planner",
  },
  {
    id: "harvest",
    number: "05",
    name: "Harvest",
    phase: "HARVESTING",
    icon: "⚖️",
    summary: "Grade produce quality with AI Computer Vision and record verified digital weighment receipts at farm gate.",
    routes: [
      { title: "AI Produce Quality Vision", href: "/quality" },
      { title: "Digital Weighment & Assaying", href: "/weighment" },
      { title: "Harvest Schedule", href: "/calendar" },
    ],
    primaryHref: "/quality",
  },
  {
    id: "sell",
    number: "06",
    name: "Sell",
    phase: "COMMERCE",
    icon: "🏪",
    summary: "List harvest on the open Produce Marketplace or aggregate supply into high-volume FPO lots for bulk premiums.",
    routes: [
      { title: "Produce Marketplace", href: "/marketplace" },
      { title: "FPO Group Aggregation", href: "/fpo" },
      { title: "Crop Surplus Exchange", href: "/marketplace?category=surplus" },
      { title: "Demand Forecasting", href: "/forecast" },
    ],
    primaryHref: "/marketplace",
  },
  {
    id: "move",
    number: "07",
    name: "Move",
    phase: "LOGISTICS",
    icon: "🚚",
    summary: "Book verified commercial multi-stop transporters and discover accredited WDRA cold storage & dry warehouses.",
    routes: [
      { title: "Transport & Logistics", href: "/logistics" },
      { title: "Storage & Cold Chain Discovery", href: "/storage" },
      { title: "Live Transit Tracking", href: "/transaction" },
    ],
    primaryHref: "/logistics",
  },
  {
    id: "recover",
    number: "08",
    name: "Recover",
    phase: "CIRCULAR AGRI",
    icon: "♻️",
    summary: "Monetize crop residues (paddy straw, cotton stalks, bagasse) with bio-pellet and paper buyers to eliminate stubble burning.",
    routes: [
      { title: "AgriCycle Residue Exchange", href: "/agricycle" },
      { title: "Biomass Collection Records", href: "/agricycle#collections" },
    ],
    primaryHref: "/agricycle",
  },
  {
    id: "review",
    number: "09",
    name: "Review",
    phase: "PERFORMANCE",
    icon: "📊",
    summary: "Analyze season profit/loss, download digital farm records, review milestone escrow releases, and access learning guides.",
    routes: [
      { title: "Farm Income & Expense Locker", href: "/farm-records" },
      { title: "Escrow & Settlement Records", href: "/transaction" },
      { title: "Community Learning Hub", href: "/learning" },
    ],
    primaryHref: "/farm-records",
  },
];

interface ConnectedFarmerJourneyProps {
  activeStepId?: JourneyStepId;
  currentStep?: JourneyStepId;
}

export default function ConnectedFarmerJourney({
  activeStepId,
  currentStep,
}: ConnectedFarmerJourneyProps) {
  const effectiveStep = activeStepId || currentStep || "plan";
  const [selectedStep, setSelectedStep] = useState<JourneyStepId>(effectiveStep);
  const current = JOURNEY_STEPS.find((s) => s.id === selectedStep) || JOURNEY_STEPS[0];

  return (
    <div className="rounded-3xl border border-[#d8e8dc] bg-white p-5 shadow-sm">
      {/* Header Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-800">
              Part C — Integrated Platform Architecture
            </span>
            <span className="text-xs text-gray-400 font-semibold">• 9 Connected Milestones</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-[#172019] mt-1">
            Connected Farmer Journey
          </h2>
          <p className="text-xs text-gray-500">
            Every step connects your farm, crops, inputs, finances, and buyers in one unified traceability workflow.
          </p>
        </div>

        <Link
          href={current.primaryHref}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition shrink-0"
        >
          <span>Continue {current.name}</span>
          <span>→</span>
        </Link>
      </div>

      {/* Stepper Timeline Navigation (Horizontal scroll on mobile) */}
      <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {JOURNEY_STEPS.map((step, idx) => {
          const isSelected = step.id === selectedStep;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => setSelectedStep(step.id)}
              className={`flex shrink-0 items-center gap-2.5 rounded-2xl border px-3.5 py-2 text-left transition ${
                isSelected
                  ? "border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-500/20 text-emerald-950 font-bold"
                  : "border-gray-200 bg-gray-50/60 hover:bg-gray-100 text-gray-700 font-medium"
              }`}
            >
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-xl text-xs font-black ${
                  isSelected ? "bg-emerald-600 text-white" : "bg-white text-gray-500 border border-gray-200"
                }`}
              >
                {step.number}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black">{step.name}</span>
                  <span className="text-[10px]">{step.icon}</span>
                </div>
                <div className="text-[9px] text-gray-400 uppercase tracking-wider">{step.phase}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Step Context Card */}
      <div className="mt-4 rounded-2xl border border-emerald-100 bg-[#f9fcf9] p-4.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
              <span>Step {current.number}</span>
              <span>•</span>
              <span>{current.phase}</span>
            </div>
            <h3 className="text-base font-black text-gray-900 mt-0.5">
              {current.icon} {current.name} Phase
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-gray-600">{current.summary}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {current.routes.map((r) => (
              <Link
                key={r.href}
                href={r.href}
                className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 shadow-2xs hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-900 transition"
              >
                {r.title} →
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
