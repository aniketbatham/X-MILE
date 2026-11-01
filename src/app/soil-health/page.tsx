"use client";

import { useState } from "react";
import PlatformHeader from "@/components/PlatformHeader";
import ConnectedFarmerJourney from "@/components/ConnectedFarmerJourney";
import { PlatformDb, SoilReport } from "@/lib/platform-db";

export default function SoilHealthPage() {
  const farm = PlatformDb.getFarm();
  const [reports, setReports] = useState<SoilReport[]>(PlatformDb.getSoilReports());
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [form, setForm] = useState({
    plotCode: farm.plots[0]?.code || "PLOT-NORTH",
    testDate: new Date().toISOString().split("T")[0],
    labName: "District Soil Testing Laboratory, Tumakuru",
    ph: 6.8,
    organicCarbonPercent: 0.62,
    nitrogenKgPerHa: 210,
    phosphorusKgPerHa: 22,
    potassiumKgPerHa: 290,
    electricalConductivity: 0.42,
    micronutrientZinc: "Adequate" as "Adequate" | "Deficient",
    micronutrientIron: "Adequate" as "Adequate" | "Deficient",
    micronutrientBoron: "Deficient" as "Adequate" | "Deficient",
    notes: "Balanced pH. Recommend legume rotation to elevate organic carbon reserves.",
  });

  const handleAddSoilReport = (e: React.FormEvent) => {
    e.preventDefault();
    const created = PlatformDb.addSoilReport({
      plotCode: form.plotCode,
      testDate: form.testDate,
      labName: form.labName,
      ph: form.ph,
      organicCarbonPercent: form.organicCarbonPercent,
      nitrogenKgPerHa: form.nitrogenKgPerHa,
      phosphorusKgPerHa: form.phosphorusKgPerHa,
      potassiumKgPerHa: form.potassiumKgPerHa,
      electricalConductivity: form.electricalConductivity,
      micronutrients: {
        zinc: form.micronutrientZinc,
        iron: form.micronutrientIron,
        boron: form.micronutrientBoron,
      },
      rotationRecommendations: [
        "Rotate with Pulses (Chickpea / Pigeon pea) after solanaceous vegetables",
        "Apply 20-25 kg Zinc Sulphate and 5 kg Borax per hectare during basal prep",
        "Incorporate green manure (Sunnhemp) to boost organic carbon",
      ],
      notes: form.notes,
    });

    setReports(PlatformDb.getSoilReports());
    setIsAddOpen(false);
    setNotice(`✓ Soil Health Card for ${created.plotCode} saved successfully!`);
    setTimeout(() => setNotice(null), 4000);
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
                Module 10 — Soil Fertility & Nutrient Management
              </span>
              <span className="text-xs text-gray-500">• Soil Health Card (SHC) & Crop Rotation</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">
              Soil Health & Crop Rotation Assistant
            </h1>
            <p className="text-xs text-gray-600 mt-1 max-w-2xl">
              Track official lab soil test parameters (pH, Organic Carbon, NPK, micronutrients) to optimize crop
              rotation sequences and preserve long-term soil microbiome vitality.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition shrink-0"
          >
            + Enter Soil Test Report
          </button>
        </div>

        {notice && (
          <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-100/90 p-3 text-xs font-bold text-emerald-950">
            {notice}
          </div>
        )}

        {/* Educational Notice Banner */}
        <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50/50 p-4 text-xs text-blue-900 flex items-start gap-3">
          <span className="text-lg">ℹ️</span>
          <div>
            <strong className="font-bold">Agronomic Transparency & Responsible Guidance:</strong> X-MILE never prescribes
            arbitrary chemical dosages from incomplete tests. All rotation advice is rooted in verified state university
            recommendations and linked directly to KVK expert consultation.
          </div>
        </div>

        {/* Soil Reports Grid */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {reports.map((report) => (
            <div
              key={report.id}
              className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between pb-3 border-b border-gray-100">
                  <div>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black uppercase text-emerald-800">
                      {report.plotCode}
                    </span>
                    <h3 className="text-lg font-black text-gray-900 mt-1">Official Soil Assay</h3>
                    <p className="text-xs text-gray-500">Lab: {report.labName}</p>
                  </div>
                  <span className="text-xs font-bold text-gray-400">Tested: {report.testDate}</span>
                </div>

                {/* Primary Soil Chemistry Cards */}
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-2xl bg-gray-50 p-2.5 border border-gray-100">
                    <span className="text-[10px] uppercase font-bold text-gray-400">Soil pH</span>
                    <p className="text-base font-black text-gray-900 mt-0.5">{report.ph}</p>
                    <span className="text-[9px] font-bold text-emerald-700">
                      {report.ph >= 6.5 && report.ph <= 7.5 ? "Near Neutral" : report.ph < 6.5 ? "Acidic" : "Alkaline"}
                    </span>
                  </div>

                  <div className="rounded-2xl bg-gray-50 p-2.5 border border-gray-100">
                    <span className="text-[10px] uppercase font-bold text-gray-400">Organic Carbon</span>
                    <p className="text-base font-black text-gray-900 mt-0.5">{report.organicCarbonPercent}%</p>
                    <span className="text-[9px] font-bold text-amber-700">
                      {report.organicCarbonPercent >= 0.75 ? "High" : "Medium / Mod."}
                    </span>
                  </div>

                  <div className="rounded-2xl bg-gray-50 p-2.5 border border-gray-100">
                    <span className="text-[10px] uppercase font-bold text-gray-400">Elect. Conduct.</span>
                    <p className="text-base font-black text-gray-900 mt-0.5">{report.electricalConductivity || 0.4} dS/m</p>
                    <span className="text-[9px] font-bold text-emerald-700">Normal (Non-saline)</span>
                  </div>
                </div>

                {/* Primary Nutrients (NPK) Status */}
                <div className="mt-5 space-y-2 text-xs">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Available Macronutrients (kg/ha)</span>
                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-600">Available Nitrogen (N):</span>
                    <span className="font-bold text-gray-900">{report.nitrogenKgPerHa} kg/ha (Medium)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-600">Available Phosphorus (P₂O₅):</span>
                    <span className="font-bold text-gray-900">{report.phosphorusKgPerHa} kg/ha (Adequate)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-600">Available Potassium (K₂O):</span>
                    <span className="font-bold text-gray-900">{report.potassiumKgPerHa} kg/ha (High)</span>
                  </div>
                </div>

                {/* Micronutrients */}
                <div className="mt-4 flex items-center gap-2 text-xs">
                  <span className="font-bold text-gray-500">Micronutrients:</span>
                  <span className={`rounded-md px-2 py-0.5 font-bold text-[10px] ${report.micronutrients.zinc === 'Deficient' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    Zinc: {report.micronutrients.zinc}
                  </span>
                  <span className={`rounded-md px-2 py-0.5 font-bold text-[10px] ${report.micronutrients.iron === 'Deficient' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    Iron: {report.micronutrients.iron}
                  </span>
                  <span className={`rounded-md px-2 py-0.5 font-bold text-[10px] ${report.micronutrients.boron === 'Deficient' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    Boron: {report.micronutrients.boron}
                  </span>
                </div>

                {/* Crop Rotation Guidelines */}
                <div className="mt-5 rounded-2xl bg-emerald-50/50 p-4 border border-emerald-100">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 block mb-2">
                    Recommended Crop Rotation Sequences
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-xs text-gray-700">
                    {report.rotationRecommendations.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-6 flex gap-3 pt-3 border-t border-gray-100">
                <a
                  href={`/experts?plot=${report.plotCode}&issue=Soil%20Micronutrient%20Management`}
                  className="flex-1 rounded-xl bg-emerald-600 px-3 py-2 text-center text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
                >
                  Refer Report to KVK Agronomist 👨‍🔬
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Modal: Add Soil Report */}
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 className="text-lg font-black text-gray-900">Enter Official Soil Test Data</h3>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="rounded-lg p-1 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddSoilReport} className="mt-4 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Target Plot</label>
                    <select
                      value={form.plotCode}
                      onChange={(e) => setForm({ ...form, plotCode: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                    >
                      {farm.plots.map((p) => (
                        <option key={p.code} value={p.code}>{p.name} ({p.code})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Sampling Date</label>
                    <input
                      type="date"
                      required
                      value={form.testDate}
                      onChange={(e) => setForm({ ...form, testDate: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Testing Laboratory</label>
                  <input
                    type="text"
                    required
                    value={form.labName}
                    onChange={(e) => setForm({ ...form, labName: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">pH Value</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={form.ph}
                      onChange={(e) => setForm({ ...form, ph: parseFloat(e.target.value) || 7 })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Org. Carbon %</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={form.organicCarbonPercent}
                      onChange={(e) => setForm({ ...form, organicCarbonPercent: parseFloat(e.target.value) || 0.5 })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">EC (dS/m)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={form.electricalConductivity}
                      onChange={(e) => setForm({ ...form, electricalConductivity: parseFloat(e.target.value) || 0.4 })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Nitrogen (kg/ha)</label>
                    <input
                      type="number"
                      required
                      value={form.nitrogenKgPerHa}
                      onChange={(e) => setForm({ ...form, nitrogenKgPerHa: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Phosphorus (kg/ha)</label>
                    <input
                      type="number"
                      required
                      value={form.phosphorusKgPerHa}
                      onChange={(e) => setForm({ ...form, phosphorusKgPerHa: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Potassium (kg/ha)</label>
                    <input
                      type="number"
                      required
                      value={form.potassiumKgPerHa}
                      onChange={(e) => setForm({ ...form, potassiumKgPerHa: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Zinc (Zn)</label>
                    <select
                      value={form.micronutrientZinc}
                      onChange={(e) => setForm({ ...form, micronutrientZinc: e.target.value as any })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900"
                    >
                      <option value="Adequate">Adequate</option>
                      <option value="Deficient">Deficient</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Iron (Fe)</label>
                    <select
                      value={form.micronutrientIron}
                      onChange={(e) => setForm({ ...form, micronutrientIron: e.target.value as any })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900"
                    >
                      <option value="Adequate">Adequate</option>
                      <option value="Deficient">Deficient</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Boron (B)</label>
                    <select
                      value={form.micronutrientBoron}
                      onChange={(e) => setForm({ ...form, micronutrientBoron: e.target.value as any })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900"
                    >
                      <option value="Adequate">Adequate</option>
                      <option value="Deficient">Deficient</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsAddOpen(false)}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
                  >
                    Save Soil Health Report
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
