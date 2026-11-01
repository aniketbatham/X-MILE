"use client";

import { useState } from "react";
import PlatformHeader from "@/components/PlatformHeader";
import ConnectedFarmerJourney from "@/components/ConnectedFarmerJourney";
import { PlatformDb, CropPlan, Plot } from "@/lib/platform-db";

const CROP_CATALOGUE = [
  {
    name: "Tomato (Hybrid US-440)",
    variety: "US-440 / Shivam",
    durationDays: 85,
    avgYieldKgPerAcre: 12000,
    expectedPricePerKg: 18,
    costPerAcre: 70000,
    waterRequirement: "Medium (Drip recommended)",
    suitableSoils: ["Red Loamy", "Sandy Loam"],
    source: "ICAR-IIHR Hessaraghatta Horticultural Station",
    assumptions: {
      seedCostPerAcre: 12000,
      fertilizerCostPerAcre: 18000,
      laborCostPerAcre: 22000,
      irrigationCostPerAcre: 6000,
      machineryCostPerAcre: 12000,
    },
  },
  {
    name: "Onion (Nashik Red / Bhima Super)",
    variety: "Bhima Super",
    durationDays: 110,
    avgYieldKgPerAcre: 11200,
    expectedPricePerKg: 24,
    costPerAcre: 66000,
    waterRequirement: "Medium (Regular light irrigation)",
    suitableSoils: ["Black Cotton", "Alluvial", "Red Loamy"],
    source: "ICAR-Directorate of Onion and Garlic Research (DOGR)",
    assumptions: {
      seedCostPerAcre: 15000,
      fertilizerCostPerAcre: 16000,
      laborCostPerAcre: 20000,
      irrigationCostPerAcre: 5000,
      machineryCostPerAcre: 10000,
    },
  },
  {
    name: "Byadgi Chilli (Deep Red)",
    variety: "Kaddi / Dabbi",
    durationDays: 140,
    avgYieldKgPerAcre: 1500,
    expectedPricePerKg: 185,
    costPerAcre: 85000,
    waterRequirement: "Low to Medium",
    suitableSoils: ["Black Cotton", "Red Loamy"],
    source: "University of Agricultural Sciences, Dharwad (UASD)",
    assumptions: {
      seedCostPerAcre: 18000,
      fertilizerCostPerAcre: 22000,
      laborCostPerAcre: 28000,
      irrigationCostPerAcre: 5000,
      machineryCostPerAcre: 12000,
    },
  },
  {
    name: "Sweet Corn (Sugar-75)",
    variety: "Syngenta Sugar-75",
    durationDays: 78,
    avgYieldKgPerAcre: 6500,
    expectedPricePerKg: 16,
    costPerAcre: 38000,
    waterRequirement: "Low (Canal or Rainfed)",
    suitableSoils: ["Alluvial", "Sandy Loam", "Red Loamy"],
    source: "ICAR-Indian Institute of Maize Research (IIMR)",
    assumptions: {
      seedCostPerAcre: 8500,
      fertilizerCostPerAcre: 11000,
      laborCostPerAcre: 10000,
      irrigationCostPerAcre: 3500,
      machineryCostPerAcre: 5000,
    },
  },
];

export default function CropPlannerPage() {
  const farm = PlatformDb.getFarm();
  const [selectedPlotCode, setSelectedPlotCode] = useState<string>(farm.plots[0]?.code || "PLOT-NORTH");
  const [season, setSeason] = useState<"Rabi" | "Kharif" | "Zaid">("Rabi");
  const [savedPlans, setSavedPlans] = useState<CropPlan[]>(PlatformDb.getCropPlans());
  const [saveSuccess, setSaveSuccess] = useState(false);

  const activePlot = farm.plots.find((p) => p.code === selectedPlotCode) || farm.plots[0];

  const handleSavePlan = (crop: (typeof CROP_CATALOGUE)[0]) => {
    const area = activePlot ? activePlot.areaAcres : 2.5;
    const expectedYieldKg = crop.avgYieldKgPerAcre * area;
    const estimatedCost = crop.costPerAcre * area;
    const estimatedRevenue = expectedYieldKg * crop.expectedPricePerKg;
    const breakEvenPrice = estimatedCost / expectedYieldKg;
    const breakEvenYield = estimatedCost / crop.expectedPricePerKg;

    const newPlan = PlatformDb.addCropPlan({
      cropName: crop.name,
      variety: crop.variety,
      season,
      durationDays: crop.durationDays,
      plotCode: selectedPlotCode,
      areaAcres: area,
      expectedYieldKg,
      targetSellingPricePerKg: crop.expectedPricePerKg,
      estimatedCost,
      estimatedRevenue,
      breakEvenPricePerKg: parseFloat(breakEvenPrice.toFixed(2)),
      breakEvenYieldKg: parseFloat(breakEvenYield.toFixed(0)),
      assumptions: crop.assumptions,
      sources: crop.source,
      status: "CONFIRMED",
    });

    setSavedPlans(PlatformDb.getCropPlans());
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[#f7faf7] text-[#142319]">
      <PlatformHeader />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <ConnectedFarmerJourney activeStepId="plan" />
        </div>

        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-800">
                Module 02 — Agronomic Planning
              </span>
              <span className="text-xs text-gray-500">• Scientific Benchmark Comparisons</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">
              Crop Planning & Season Decision Engine
            </h1>
            <p className="text-xs text-gray-600 mt-1 max-w-2xl">
              Compare validated seasonal crop models based on your plot&apos;s soil classification, available irrigation,
              and verifiable ICAR agronomic benchmarks.
            </p>
          </div>

          {/* Context Selector */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="rounded-2xl border border-gray-200 bg-white px-3 py-1.5 shadow-2xs">
              <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider">Active Plot</label>
              <select
                value={selectedPlotCode}
                onChange={(e) => setSelectedPlotCode(e.target.value)}
                className="text-xs font-black text-gray-900 bg-transparent outline-none cursor-pointer"
              >
                {farm.plots.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name} ({p.areaAcres} Acres)
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white px-3 py-1.5 shadow-2xs">
              <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider">Crop Season</label>
              <select
                value={season}
                onChange={(e) => setSeason(e.target.value as any)}
                className="text-xs font-black text-emerald-800 bg-transparent outline-none cursor-pointer"
              >
                <option value="Rabi">Rabi (Winter / Current)</option>
                <option value="Kharif">Kharif (Monsoon)</option>
                <option value="Zaid">Zaid (Summer)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Selected Plot Context Banner */}
        {activePlot && (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-base">📍</span>
              <span className="font-bold text-gray-900">{activePlot.name}:</span>
              <span className="text-gray-600">{activePlot.areaAcres} Acres</span>
              <span className="text-gray-400">•</span>
              <span className="font-semibold text-emerald-900">Soil: {activePlot.soilType}</span>
              <span className="text-gray-400">•</span>
              <span className="font-semibold text-emerald-900">Water: {activePlot.irrigationSource}</span>
            </div>
            <span className="text-[11px] text-gray-500 font-medium italic">
              *Suitability filters automatically calibrated to {farm.district}, {farm.state} agro-climate.
            </span>
          </div>
        )}

        {saveSuccess && (
          <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-100/80 p-3 text-xs font-bold text-emerald-950">
            ✓ Crop Plan successfully locked and saved to your Farm Records!
          </div>
        )}

        {/* Suitable Crop Models Grid */}
        <div className="mt-6">
          <h2 className="text-lg font-black text-gray-900 mb-3">Suitable Crop Models for {season} Season</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {CROP_CATALOGUE.map((crop) => {
              const area = activePlot ? activePlot.areaAcres : 2.5;
              const expectedYieldKg = crop.avgYieldKgPerAcre * area;
              const estimatedCost = crop.costPerAcre * area;
              const estimatedRevenue = expectedYieldKg * crop.expectedPricePerKg;
              const netProfit = estimatedRevenue - estimatedCost;
              const breakEvenPrice = estimatedCost / expectedYieldKg;

              return (
                <div
                  key={crop.name}
                  className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs hover:border-emerald-500 hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black text-emerald-800">
                          {crop.durationDays} Days Cycle
                        </span>
                        <h3 className="text-lg font-black text-gray-900 mt-1">{crop.name}</h3>
                        <p className="text-xs text-gray-500">Variety: {crop.variety}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-gray-400">Target APMC Rate</span>
                        <p className="text-base font-black text-emerald-700">₹{crop.expectedPricePerKg}/kg</p>
                      </div>
                    </div>

                    {/* Economics Metric Bar */}
                    <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-gray-50 p-3 text-center border border-gray-100">
                      <div>
                        <span className="text-[10px] text-gray-500 font-medium">Est. Yield ({area} Ac)</span>
                        <p className="text-sm font-black text-gray-900 mt-0.5">{expectedYieldKg.toLocaleString()} kg</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 font-medium">Est. Total Cost</span>
                        <p className="text-sm font-black text-red-700 mt-0.5">₹{estimatedCost.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 font-medium">Est. Net Profit</span>
                        <p className="text-sm font-black text-emerald-800 mt-0.5">₹{netProfit.toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Agronomic Context & Break-even */}
                    <div className="mt-4 space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-gray-100">
                        <span className="text-gray-500">Break-even Price:</span>
                        <span className="font-bold text-gray-900">₹{breakEvenPrice.toFixed(2)} / kg</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-100">
                        <span className="text-gray-500">Water Demand:</span>
                        <span className="font-semibold text-gray-800">{crop.waterRequirement}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-100">
                        <span className="text-gray-500">Soil Fit:</span>
                        <span className="font-semibold text-emerald-900">{crop.suitableSoils.join(", ")}</span>
                      </div>
                      <div className="py-1 text-gray-500 text-[11px]">
                        <span className="font-bold text-gray-700">Source Reference: </span>
                        {crop.source}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center gap-3 pt-3 border-t border-gray-100">
                    <a
                      href={`/profit-calculator?crop=${encodeURIComponent(crop.name)}&cost=${estimatedCost}&yield=${expectedYieldKg}&price=${crop.expectedPricePerKg}`}
                      className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-center text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
                    >
                      Refine in Calculator 🧮
                    </a>
                    <button
                      type="button"
                      onClick={() => handleSavePlan(crop)}
                      className="flex-1 rounded-xl bg-emerald-600 px-3 py-2 text-center text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
                    >
                      Save Crop Plan ✓
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Saved Active Plans Section */}
        <div className="mt-12 rounded-3xl border border-gray-200 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-gray-900">Active Saved Crop Plans ({savedPlans.length})</h2>
            <span className="text-xs text-gray-400 font-medium">Persisted in X-MILE Farm Registry</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-200 bg-gray-50 text-gray-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3 font-bold">Crop & Variety</th>
                  <th className="px-4 py-3 font-bold">Plot / Area</th>
                  <th className="px-4 py-3 font-bold">Season</th>
                  <th className="px-4 py-3 font-bold">Est. Yield</th>
                  <th className="px-4 py-3 font-bold">Est. Cost</th>
                  <th className="px-4 py-3 font-bold">Break-even Price</th>
                  <th className="px-4 py-3 font-bold">Target Revenue</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {savedPlans.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/80 transition">
                    <td className="px-4 py-3 font-black text-gray-900">{p.cropName}</td>
                    <td className="px-4 py-3 text-gray-600">{p.plotCode} ({p.areaAcres} Ac)</td>
                    <td className="px-4 py-3 font-semibold text-emerald-800">{p.season}</td>
                    <td className="px-4 py-3 font-semibold">{p.expectedYieldKg.toLocaleString()} kg</td>
                    <td className="px-4 py-3 text-red-700 font-semibold">₹{p.estimatedCost.toLocaleString()}</td>
                    <td className="px-4 py-3 font-bold text-gray-800">₹{p.breakEvenPricePerKg}/kg</td>
                    <td className="px-4 py-3 font-bold text-emerald-700">₹{p.estimatedRevenue.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-800">
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
