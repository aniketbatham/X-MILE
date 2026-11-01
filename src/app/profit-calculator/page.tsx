"use client";

import { useState } from "react";
import PlatformHeader from "@/components/PlatformHeader";
import ConnectedFarmerJourney from "@/components/ConnectedFarmerJourney";
import { PlatformDb } from "@/lib/platform-db";

export default function ProfitCalculatorPage() {
  const [cropName, setCropName] = useState("Tomato (Shivam Hybrid)");
  const [plotCode, setPlotCode] = useState("PLOT-NORTH");
  const [areaAcres, setAreaAcres] = useState(3.5);

  // Expense breakdown
  const [expenses, setExpenses] = useState({
    seeds: 42000,
    fertilizers: 58000,
    pesticides: 26000,
    labor: 72000,
    machinery: 38000,
    irrigation: 18000,
    transportPackaging: 25000,
    miscellaneous: 12000,
  });

  // Harvest & Market Price
  const [expectedYieldKg, setExpectedYieldKg] = useState(42000);
  const [expectedPricePerKg, setExpectedPricePerKg] = useState(19.0);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Calculations
  const totalCost = Object.values(expenses).reduce((a, b) => a + Number(b || 0), 0);
  const totalRevenue = expectedYieldKg * expectedPricePerKg;
  const netProfit = totalRevenue - totalCost;
  const costPerKg = expectedYieldKg > 0 ? totalCost / expectedYieldKg : 0;
  const breakEvenPrice = costPerKg;
  const breakEvenYieldKg = expectedPricePerKg > 0 ? totalCost / expectedPricePerKg : 0;
  const roiPercent = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;

  // Scenarios
  const scenarios = [
    {
      name: "Pessimistic Market (-25% Price)",
      price: expectedPricePerKg * 0.75,
      revenue: expectedYieldKg * (expectedPricePerKg * 0.75),
      profit: expectedYieldKg * (expectedPricePerKg * 0.75) - totalCost,
    },
    {
      name: "Baseline Expectation",
      price: expectedPricePerKg,
      revenue: totalRevenue,
      profit: netProfit,
    },
    {
      name: "Optimistic Market (+25% Price)",
      price: expectedPricePerKg * 1.25,
      revenue: expectedYieldKg * (expectedPricePerKg * 1.25),
      profit: expectedYieldKg * (expectedPricePerKg * 1.25) - totalCost,
    },
  ];

  const handleSaveToRecords = () => {
    PlatformDb.addFarmRecord({
      type: "EXPENSE",
      category: "Seeds",
      amount: totalCost,
      date: new Date().toISOString().split("T")[0],
      plotCode,
      description: `Budget forecast for ${cropName} on ${plotCode} (${areaAcres} Acres). Break-even: ₹${breakEvenPrice.toFixed(2)}/kg`,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[#f7faf7] text-[#142319]">
      <PlatformHeader />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <ConnectedFarmerJourney activeStepId="budget" />
        </div>

        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-800">
                Module 03 — Farm Economics
              </span>
              <span className="text-xs text-gray-500">• Precision Cost Modeling & Break-Even</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">
              Farm Profit & Break-Even Calculator
            </h1>
            <p className="text-xs text-gray-600 mt-1 max-w-2xl">
              Model your input expenses, identify your cost per kilogram, and stress-test market price scenarios before sowing.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSaveToRecords}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition shrink-0"
          >
            Save Budget to Farm Records ✓
          </button>
        </div>

        {savedSuccess && (
          <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-100/90 p-3 text-xs font-bold text-emerald-950">
            ✓ Season budget calculation recorded in Farm Records!
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Cost Input Fields */}
          <div className="lg:col-span-7 space-y-6">
            {/* General Info */}
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs">
              <h2 className="text-base font-black text-gray-900 mb-3">1. Crop & Plot Context</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Crop Name</label>
                  <input
                    type="text"
                    value={cropName}
                    onChange={(e) => setCropName(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Plot Reference</label>
                  <input
                    type="text"
                    value={plotCode}
                    onChange={(e) => setPlotCode(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Cultivated Area (Acres)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={areaAcres}
                    onChange={(e) => setAreaAcres(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Itemized Expenses */}
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-black text-gray-900">2. Itemized Production Expenses (₹)</h2>
                <span className="text-xs font-bold text-red-700">Total: ₹{totalCost.toLocaleString()}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-gray-600 mb-1">Seeds / Seedlings (₹)</label>
                  <input
                    type="number"
                    value={expenses.seeds}
                    onChange={(e) => setExpenses({ ...expenses, seeds: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-600 mb-1">Fertilizers & FYM (₹)</label>
                  <input
                    type="number"
                    value={expenses.fertilizers}
                    onChange={(e) => setExpenses({ ...expenses, fertilizers: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-600 mb-1">Crop Protection / Sprays (₹)</label>
                  <input
                    type="number"
                    value={expenses.pesticides}
                    onChange={(e) => setExpenses({ ...expenses, pesticides: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-600 mb-1">Hired Farm Labor (₹)</label>
                  <input
                    type="number"
                    value={expenses.labor}
                    onChange={(e) => setExpenses({ ...expenses, labor: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-600 mb-1">Machinery & Diesel (₹)</label>
                  <input
                    type="number"
                    value={expenses.machinery}
                    onChange={(e) => setExpenses({ ...expenses, machinery: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-600 mb-1">Electricity / Irrigation (₹)</label>
                  <input
                    type="number"
                    value={expenses.irrigation}
                    onChange={(e) => setExpenses({ ...expenses, irrigation: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-600 mb-1">Packaging, Crates & Transport (₹)</label>
                  <input
                    type="number"
                    value={expenses.transportPackaging}
                    onChange={(e) => setExpenses({ ...expenses, transportPackaging: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-600 mb-1">Miscellaneous Buffer (₹)</label>
                  <input
                    type="number"
                    value={expenses.miscellaneous}
                    onChange={(e) => setExpenses({ ...expenses, miscellaneous: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Harvest & Market Assumption */}
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs">
              <h2 className="text-base font-black text-gray-900 mb-3">3. Harvest & Selling Price Expectations</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Expected Harvest Yield (Kilograms)</label>
                  <input
                    type="number"
                    value={expectedYieldKg}
                    onChange={(e) => setExpectedYieldKg(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none font-bold"
                  />
                  <span className="text-[10px] text-gray-400 mt-1 block">
                    = {(expectedYieldKg / 100).toFixed(1)} Quintals ({areaAcres > 0 ? (expectedYieldKg / areaAcres).toFixed(0) : 0} kg/acre)
                  </span>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Estimated APMC / Buyer Price (₹/kg)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={expectedPricePerKg}
                    onChange={(e) => setExpectedPricePerKg(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none font-bold"
                  />
                  <span className="text-[10px] text-gray-400 mt-1 block">
                    = ₹{(expectedPricePerKg * 100).toFixed(0)} per Quintal
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Break-even & KPI Dashboard */}
          <div className="lg:col-span-5 space-y-6">
            {/* KPI Summary Card */}
            <div className="rounded-3xl border border-emerald-300 bg-gradient-to-br from-[#173b2a] to-[#25523a] p-6 text-white shadow-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                Calculated Farm Economics
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <div>
                  <span className="text-xs text-emerald-100">Expected Net Margin</span>
                  <h3 className={`text-3xl font-black ${netProfit >= 0 ? "text-emerald-300" : "text-red-400"}`}>
                    ₹{netProfit.toLocaleString()}
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-xs text-emerald-100">Estimated ROI</span>
                  <p className="text-xl font-black text-white">{roiPercent.toFixed(1)}%</p>
                </div>
              </div>

              {/* Break-even Metrics */}
              <div className="mt-6 border-t border-white/10 pt-4 grid grid-cols-2 gap-3 text-center">
                <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-xs">
                  <span className="text-[10px] uppercase font-bold text-emerald-200">Break-Even Price</span>
                  <p className="text-lg font-black text-white mt-1">₹{breakEvenPrice.toFixed(2)} / kg</p>
                  <span className="text-[9px] text-emerald-300">Minimum price to avoid loss</span>
                </div>
                <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-xs">
                  <span className="text-[10px] uppercase font-bold text-emerald-200">Break-Even Harvest</span>
                  <p className="text-lg font-black text-white mt-1">{breakEvenYieldKg.toFixed(0)} kg</p>
                  <span className="text-[9px] text-emerald-300">At ₹{expectedPricePerKg}/kg</span>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-xs border-t border-white/10 pt-4">
                <div className="flex justify-between text-emerald-100">
                  <span>Gross Projected Revenue:</span>
                  <span className="font-bold text-white">₹{totalRevenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-emerald-100">
                  <span>Total Season Outflow:</span>
                  <span className="font-bold text-red-300">₹{totalCost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-emerald-100">
                  <span>Cost of Production:</span>
                  <span className="font-bold text-white">₹{costPerKg.toFixed(2)} per kg</span>
                </div>
              </div>
            </div>

            {/* Scenario Stress-Testing Comparison */}
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs">
              <h3 className="text-sm font-black text-gray-900 mb-3">Market Price Stress Test Scenarios</h3>
              <div className="space-y-3">
                {scenarios.map((sc, idx) => (
                  <div
                    key={sc.name}
                    className={`rounded-2xl border p-3.5 text-xs transition ${
                      idx === 1
                        ? "border-emerald-300 bg-emerald-50/60"
                        : "border-gray-200 bg-gray-50/60"
                    }`}
                  >
                    <div className="flex justify-between font-bold">
                      <span className="text-gray-800">{sc.name}</span>
                      <span className="text-emerald-800">₹{sc.price.toFixed(1)}/kg</span>
                    </div>
                    <div className="mt-2 flex justify-between text-[11px] text-gray-500">
                      <span>Revenue: ₹{sc.revenue.toLocaleString()}</span>
                      <span className={`font-black ${sc.profit >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                        Net: ₹{sc.profit.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
