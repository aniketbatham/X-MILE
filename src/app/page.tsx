"use client";

import Link from "next/link";
import { useState } from "react";

const modules = [
  {
    icon: "🌾",
    title: "Farmer Portal",
    description:
      "List your harvest, analyze crop quality, manage inventory, and respond to buyer orders.",
    href: "/farmer",
    label: "Open Farmer Portal",
  },
  {
    icon: "🛒",
    title: "Buyer Portal",
    description:
      "Create requirements, forecast demand, discover supply, select farmers, and organize fulfillment.",
    href: "/buyer",
    label: "Open Buyer Portal",
  },
  {
    icon: "🤖",
    title: "AI Quality",
    description:
      "Use AI-assisted crop analysis to estimate quality indicators and support better decisions.",
    href: "/quality",
    label: "Try AI Quality",
  },
  {
    icon: "📈",
    title: "Demand Forecast",
    description:
      "Explore demand signals and forecasts to understand what buyers may need.",
    href: "/forecast",
    label: "View Forecast",
  },
  {
    icon: "💳",
    title: "Transactions",
    description:
      "Explore the transaction workflow designed around transparent agricultural trade.",
    href: "/transaction",
    label: "View Transactions",
  },
];

const steps = [
  {
    number: "01",
    title: "Farmer lists harvest",
    description: "Farmers add available produce, quantity, location, and harvest details.",
  },
  {
    number: "02",
    title: "AI assists quality",
    description: "Crop information and images can be evaluated through the AI quality workflow.",
  },
  {
    number: "03",
    title: "Buyer creates demand",
    description: "Buyers define what they need, including crop, quantity, and quality requirements.",
  },
  {
    number: "04",
    title: "Supply is aggregated",
    description: "HARVEX can combine supply from multiple farmers to fulfill a larger requirement.",
  },
  {
    number: "05",
    title: "Logistics are organized",
    description: "Orders move into dispatch and shipment tracking for clearer fulfillment.",
  },
  {
    number: "06",
    title: "Transaction is completed",
    description: "The workflow connects procurement, delivery, and transaction visibility.",
  },
];

export default function HomePage() {
  const [language, setLanguage] = useState("English");
  const [showDemo, setShowDemo] = useState(false);

  return (
    <main className="min-h-screen bg-[#f7f8f3] text-slate-900">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 border-b border-slate-200/70 bg-[#f7f8f3]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-xl text-white shadow-sm">
              🌱
            </div>

            <div>
              <div className="text-xl font-black tracking-tight">HARVEX</div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Agri Connect
              </div>
            </div>
          </Link>

          <div className="hidden items-center gap-7 text-sm font-medium text-slate-600 lg:flex">
            <a href="#how-it-works" className="transition hover:text-emerald-700">
              How It Works
            </a>
            <a href="#farmers" className="transition hover:text-emerald-700">
              For Farmers
            </a>
            <a href="#buyers" className="transition hover:text-emerald-700">
              For Buyers
            </a>
            <a href="#modules" className="transition hover:text-emerald-700">
              Marketplace
            </a>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="hidden rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium outline-none transition focus:border-emerald-500 sm:block"
            >
              <option>English</option>
              <option>ಕನ್ನಡ</option>
              <option>हिन्दी</option>
              <option>தமிழ்</option>
            </select>

            <button
              onClick={() => setShowDemo(true)}
              className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800"
            >
              Explore Demo
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-200/30 blur-3xl" />
        <div className="absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-lime-200/30 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 pb-20 pt-16 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:pb-28 lg:pt-24">
          <div className="flex flex-col justify-center">
            <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-600" />
              Farmer-first digital marketplace
            </div>

            <h1 className="max-w-3xl text-5xl font-black leading-[0.98] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
              Your Harvest.
              <br />
              <span className="text-emerald-700">Your Value.</span>
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
              HARVEX connects farmers with buyers through smarter quality
              insights, organized supply aggregation, transparent transactions,
              and logistics visibility.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/farmer"
                className="rounded-xl bg-emerald-700 px-6 py-3.5 text-center text-sm font-bold text-white shadow-lg shadow-emerald-900/10 transition hover:-translate-y-0.5 hover:bg-emerald-800"
              >
                Sell My Harvest →
              </Link>

              <Link
                href="/buyer"
                className="rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-center text-sm font-bold text-slate-800 transition hover:-translate-y-0.5 hover:border-emerald-400 hover:text-emerald-700"
              >
                Buy in Bulk →
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <div className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200">
                ✓ AI-assisted quality
              </div>
              <div className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200">
                ✓ Supply aggregation
              </div>
              <div className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200">
                ✓ Organized logistics
              </div>
            </div>
          </div>

          {/* HERO VISUAL */}
          <div className="flex items-center justify-center">
            <div className="relative w-full max-w-lg">
              <div className="absolute inset-4 rounded-[2rem] bg-emerald-700/10 blur-2xl" />

              <div className="relative overflow-hidden rounded-[2rem] border border-white bg-white p-5 shadow-2xl shadow-slate-900/10">
                <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                      HARVEX Network
                    </p>
                    <h2 className="mt-1 text-lg font-black">
                      Connected Agriculture
                    </h2>
                  </div>

                  <div className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                    ● Active
                  </div>
                </div>

                <div className="mt-5 rounded-2xl bg-slate-50 p-5">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-400">
                        SAMPLE SMART HARVEST POOL
                      </p>
                      <p className="mt-1 text-2xl font-black">
                        5,000 kg Onion
                      </p>
                    </div>

                    <div className="rounded-xl bg-emerald-100 px-3 py-2 text-center">
                      <div className="text-lg font-black text-emerald-700">
                        A
                      </div>
                      <div className="text-[9px] font-bold uppercase text-emerald-700">
                        Grade
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {[
                      ["Farmer A", "1,500 kg"],
                      ["Farmer B", "1,200 kg"],
                      ["Farmer C", "1,300 kg"],
                      ["Farmer D", "1,000 kg"],
                    ].map(([name, quantity]) => (
                      <div
                        key={name}
                        className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-sm">
                            🌾
                          </div>
                          <span className="text-sm font-semibold">
                            {name}
                          </span>
                        </div>

                        <span className="text-sm font-bold text-slate-700">
                          {quantity}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 rounded-xl bg-emerald-700 p-4 text-white">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold">Requirement fulfilled</span>
                      <span className="font-black">100%</span>
                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-emerald-900/40">
                      <div className="h-full w-full rounded-full bg-white" />
                    </div>

                    <p className="mt-2 text-xs text-emerald-100">
                      Matched across 4 farmers
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-slate-100 p-3">
                    <div className="text-lg">🤖</div>
                    <p className="mt-1 text-[11px] font-bold">AI Quality</p>
                  </div>

                  <div className="rounded-xl border border-slate-100 p-3">
                    <div className="text-lg">📦</div>
                    <p className="mt-1 text-[11px] font-bold">Aggregation</p>
                  </div>

                  <div className="rounded-xl border border-slate-100 p-3">
                    <div className="text-lg">🚚</div>
                    <p className="mt-1 text-[11px] font-bold">Logistics</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VALUE STRIP */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 px-5 py-7 sm:grid-cols-4 lg:px-8">
          {[
            ["🌱", "Farmer-first", "Designed around farmer participation"],
            ["🤖", "AI-assisted", "Quality and demand intelligence"],
            ["🔗", "Connected", "One workflow from harvest to delivery"],
            ["📍", "Transparent", "Better visibility across the chain"],
          ].map(([icon, title, description]) => (
            <div
              key={title}
              className="border-slate-200 px-4 py-4 sm:border-r last:border-r-0"
            >
              <div className="text-2xl">{icon}</div>
              <h3 className="mt-2 text-sm font-black">{title}</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
            One connected journey
          </p>

          <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
            From harvest to opportunity.
          </h2>

          <p className="mt-5 text-lg leading-8 text-slate-600">
            HARVEX brings the important parts of agricultural procurement into
            one connected workflow.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.number}
              className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:border-emerald-300 hover:shadow-lg"
            >
              <div className="flex items-center justify-between">
                <span className="text-3xl font-black text-emerald-100 transition group-hover:text-emerald-200">
                  {step.number}
                </span>

                <div className="h-2 w-2 rounded-full bg-emerald-600" />
              </div>

              <h3 className="mt-5 text-lg font-black">{step.title}</h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* FARMER / BUYER */}
      <section id="farmers" className="bg-slate-900 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-20 lg:grid-cols-2 lg:px-8">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 sm:p-10">
            <div className="text-4xl">🌾</div>

            <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
              For Farmers
            </p>

            <h2 className="mt-3 text-3xl font-black sm:text-4xl">
              Turn available harvest into better opportunities.
            </h2>

            <p className="mt-5 leading-7 text-slate-300">
              List your produce, understand its quality, manage inventory,
              respond to orders, and follow the fulfillment journey.
            </p>

            <Link
              href="/farmer"
              className="mt-8 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-900 transition hover:bg-emerald-50"
            >
              Open Farmer Portal →
            </Link>
          </div>

          <div
            id="buyers"
            className="rounded-3xl border border-white/10 bg-emerald-700 p-8 sm:p-10"
          >
            <div className="text-4xl">🛒</div>

            <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-emerald-100">
              For Buyers
            </p>

            <h2 className="mt-3 text-3xl font-black sm:text-4xl">
              Source the quantity you need.
            </h2>

            <p className="mt-5 leading-7 text-emerald-50">
              Create requirements, understand demand, discover available
              supply, combine farmers, and move orders into organized
              fulfillment.
            </p>

            <Link
              href="/buyer"
              className="mt-8 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50"
            >
              Open Buyer Portal →
            </Link>
          </div>
        </div>
      </section>

      {/* SMART HARVEST POOL */}
      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
              HARVEX signature feature
            </p>

            <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
              Smart Harvest Pool
            </h2>

            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
              A buyer does not always need one farmer. HARVEX can intelligently
              combine available supply from multiple farmers to fulfill a
              larger requirement.
            </p>

            <div className="mt-7 space-y-3">
              {[
                "One buyer requirement",
                "Multiple available farmers",
                "Aggregated quantity",
                "One organized fulfillment plan",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-sm text-emerald-700">
                    ✓
                  </div>
                  <span className="text-sm font-bold text-slate-700">
                    {item}
                  </span>
                </div>
              ))}
            </div>

            <Link
              href="/buyer"
              className="mt-8 inline-flex rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-800"
            >
              See Supply Aggregation →
            </Link>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5">
            <div className="rounded-2xl bg-slate-50 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Buyer Requirement
                  </p>
                  <h3 className="mt-2 text-2xl font-black">
                    5,000 kg Onion
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Grade A · Karnataka
                  </p>
                </div>

                <div className="rounded-xl bg-emerald-100 px-3 py-2 text-xs font-black text-emerald-700">
                  MATCHED
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {[
                  ["Farmer A", "1,500 kg", "30%"],
                  ["Farmer B", "1,200 kg", "24%"],
                  ["Farmer C", "1,300 kg", "26%"],
                  ["Farmer D", "1,000 kg", "20%"],
                ].map(([farmer, quantity, percentage]) => (
                  <div
                    key={farmer}
                    className="rounded-xl bg-white p-4 ring-1 ring-slate-100"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold">{farmer}</span>
                      <span className="text-sm font-black text-emerald-700">
                        {quantity}
                      </span>
                    </div>

                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-emerald-600"
                        style={{ width: percentage }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between rounded-xl bg-emerald-700 px-4 py-4 text-white">
                <span className="text-sm font-bold">Total matched</span>
                <span className="text-lg font-black">5,000 kg</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MODULES */}
      <section id="modules" className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <div className="text-center">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
              Explore the platform
            </p>

            <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
              Everything HARVEX connects.
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              Jump directly into the working modules of the HARVEX demo.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((module) => (
              <div
                key={module.title}
                className="flex flex-col rounded-2xl border border-slate-200 bg-[#f7f8f3] p-6 transition hover:-translate-y-1 hover:border-emerald-300 hover:shadow-xl"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-2xl shadow-sm ring-1 ring-slate-100">
                  {module.icon}
                </div>

                <h3 className="mt-5 text-xl font-black">{module.title}</h3>

                <p className="mt-2 flex-1 text-sm leading-6 text-slate-500">
                  {module.description}
                </p>

                <Link
                  href={module.href}
                  className="mt-6 text-sm font-black text-emerald-700 hover:text-emerald-800"
                >
                  {module.label} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI QUALITY */}
      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="overflow-hidden rounded-[2rem] bg-emerald-50">
          <div className="grid items-center lg:grid-cols-2">
            <div className="p-8 sm:p-12">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
                AI Quality Engine
              </p>

              <h2 className="mt-3 text-4xl font-black tracking-tight">
                A clearer first look at every crop.
              </h2>

              <p className="mt-5 leading-7 text-slate-600">
                The HARVEX quality workflow uses AI-assisted analysis to
                provide useful indicators such as estimated grade, freshness,
                damage, size consistency, and confidence.
              </p>

              <Link
                href="/quality"
                className="mt-8 inline-flex rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-800"
              >
                Try AI Quality →
              </Link>
            </div>

            <div className="p-8 sm:p-12">
              <div className="rounded-3xl bg-white p-6 shadow-xl shadow-emerald-900/5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Sample Analysis
                    </p>
                    <h3 className="mt-1 text-xl font-black">Tomato</h3>
                  </div>

                  <div className="rounded-2xl bg-emerald-100 px-5 py-3 text-center">
                    <div className="text-2xl font-black text-emerald-700">
                      A
                    </div>
                    <div className="text-[9px] font-bold uppercase text-emerald-700">
                      Grade
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  {[
                    ["Freshness", "High"],
                    ["Damage", "Low"],
                    ["Size consistency", "Strong"],
                    ["Confidence", "92%"],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-xl bg-slate-50 p-4"
                    >
                      <p className="text-xs font-medium text-slate-400">
                        {label}
                      </p>
                      <p className="mt-1 text-sm font-black text-slate-800">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-xs leading-5 text-emerald-800">
                  AI-assisted result. Final quality decisions should consider
                  physical inspection and applicable standards.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DEMO CTA */}
      <section className="px-5 pb-20 lg:px-8">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-slate-900 px-6 py-14 text-center text-white sm:px-12">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
            College Demo
          </p>

          <h2 className="mx-auto mt-4 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">
            See the agricultural supply chain as one connected system.
          </h2>

          <p className="mx-auto mt-5 max-w-2xl leading-7 text-slate-300">
            Explore the farmer workflow, buyer procurement, AI quality,
            demand forecasting, transactions, and shipment tracking.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              onClick={() => setShowDemo(true)}
              className="rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-500"
            >
              Start Demo →
            </button>

            <Link
              href="/buyer"
              className="rounded-xl border border-white/20 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/10"
            >
              Open Full Procurement Flow
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🌱</span>
              <span className="font-black">HARVEX</span>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Connecting harvests to opportunities.
            </p>
          </div>

          <div className="flex flex-wrap gap-5 text-sm font-semibold text-slate-500">
            <Link href="/farmer" className="hover:text-emerald-700">
              Farmer
            </Link>
            <Link href="/buyer" className="hover:text-emerald-700">
              Buyer
            </Link>
            <Link href="/quality" className="hover:text-emerald-700">
              AI Quality
            </Link>
            <Link href="/forecast" className="hover:text-emerald-700">
              Forecast
            </Link>
            <Link href="/transaction" className="hover:text-emerald-700">
              Transactions
            </Link>
          </div>
        </div>

        <div className="border-t border-slate-100 py-5 text-center text-xs text-slate-400">
          HARVEX · Agricultural Supply Network · College Demo
        </div>
      </footer>

      {/* DEMO MODAL */}
      {showDemo && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-5 backdrop-blur-sm"
          onClick={() => setShowDemo(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
                  HARVEX Demo
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  Choose a workflow
                </h2>
              </div>

              <button
                onClick={() => setShowDemo(false)}
                className="rounded-lg px-3 py-2 text-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              This is a demo navigation panel, not a real authentication
              system. Choose the part of HARVEX you want to demonstrate.
            </p>

            <div className="mt-6 space-y-3">
              <Link
                href="/farmer"
                onClick={() => setShowDemo(false)}
                className="flex items-center gap-4 rounded-2xl border border-slate-200 p-4 transition hover:border-emerald-300 hover:bg-emerald-50"
              >
                <span className="text-2xl">🌾</span>
                <div>
                  <div className="font-black">Farmer Workflow</div>
                  <div className="text-xs text-slate-500">
                    Harvest, quality, inventory & orders
                  </div>
                </div>
              </Link>

              <Link
                href="/buyer"
                onClick={() => setShowDemo(false)}
                className="flex items-center gap-4 rounded-2xl border border-slate-200 p-4 transition hover:border-emerald-300 hover:bg-emerald-50"
              >
                <span className="text-2xl">🛒</span>
                <div>
                  <div className="font-black">Buyer Workflow</div>
                  <div className="text-xs text-slate-500">
                    Demand, aggregation, orders & logistics
                  </div>
                </div>
              </Link>

              <Link
                href="/quality"
                onClick={() => setShowDemo(false)}
                className="flex items-center gap-4 rounded-2xl border border-slate-200 p-4 transition hover:border-emerald-300 hover:bg-emerald-50"
              >
                <span className="text-2xl">🤖</span>
                <div>
                  <div className="font-black">AI Quality</div>
                  <div className="text-xs text-slate-500">
                    AI-assisted crop quality analysis
                  </div>
                </div>
              </Link>

              <Link
                href="/forecast"
                onClick={() => setShowDemo(false)}
                className="flex items-center gap-4 rounded-2xl border border-slate-200 p-4 transition hover:border-emerald-300 hover:bg-emerald-50"
              >
                <span className="text-2xl">📈</span>
                <div>
                  <div className="font-black">Demand Forecast</div>
                  <div className="text-xs text-slate-500">
                    Explore demand intelligence
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}