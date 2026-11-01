"use client";

import { useState } from "react";
import PlatformHeader from "@/components/PlatformHeader";
import ConnectedFarmerJourney from "@/components/ConnectedFarmerJourney";
import { PlatformDb, AgriCycleResidue } from "@/lib/platform-db";

export default function AgriCyclePage() {
  const [residues, setResidues] = useState<AgriCycleResidue[]>(PlatformDb.getAgriCycleListings());
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [form, setForm] = useState({
    residueType: "Paddy Straw" as AgriCycleResidue["residueType"],
    cropSource: "Sona Masoori Rice",
    quantityQuintals: 120,
    moisturePercent: 12.0,
    condition: "Baled" as AgriCycleResidue["condition"],
    intendedUse: "Biofuel & Pellets" as AgriCycleResidue["intendedUse"],
    location: "Kunigal Rural Gate",
    district: "Tumakuru",
    pricePerQuintal: 210,
  });

  const totalCO2Saved = residues.reduce((sum, r) => sum + r.co2SavedKg, 0);
  const totalQuintalsListed = residues.reduce((sum, r) => sum + r.quantityQuintals, 0);

  const handleCreateResidue = (e: React.FormEvent) => {
    e.preventDefault();
    const created = PlatformDb.addAgriCycleListing({
      ...form,
      farmerName: "Rameshwar Patel",
      phone: "+91 98765 43210",
    });
    setResidues(PlatformDb.getAgriCycleListings());
    setIsListModalOpen(false);
    setNotice(`✓ AgriCycle listing for ${created.residueType} (${created.quantityQuintals} Quintals) is now live!`);
    setTimeout(() => setNotice(null), 4000);
  };

  return (
    <div className="min-h-screen bg-[#f7faf7] text-[#142319]">
      <PlatformHeader />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <ConnectedFarmerJourney activeStepId="recover" />
        </div>

        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-800">
                Module 07 — Circular Bio-Economy
              </span>
              <span className="text-xs text-gray-500">• Zero Stubble Burning & Clean Biomass Trade</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">
              AgriCycle: Crop Residue & Biomass Exchange
            </h1>
            <p className="text-xs text-gray-600 mt-1 max-w-2xl">
              Turn harvest stalks, straw, and bagasse into supplemental farm income. Connect directly with bio-coal pellet
              factories, paper mills, and mushroom growers while preventing open field burning.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsListModalOpen(true)}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition shrink-0"
          >
            + List Farm Residue
          </button>
        </div>

        {notice && (
          <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-100/90 p-3 text-xs font-bold text-emerald-950">
            {notice}
          </div>
        )}

        {/* Impact Metric Cards */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-5">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Total Biomass Listed</span>
            <p className="text-2xl font-black text-emerald-950 mt-1">{totalQuintalsListed.toLocaleString()} Quintals</p>
            <span className="text-[11px] text-gray-500">{(totalQuintalsListed / 10).toFixed(1)} Metric Tons diverted</span>
          </div>

          <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-5">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">CO2 Emissions Prevented</span>
            <p className="text-2xl font-black text-emerald-950 mt-1">{(totalCO2Saved / 1000).toFixed(1)} MT CO₂e</p>
            <span className="text-[11px] text-gray-500">By avoiding open stubble burning</span>
          </div>

          <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-5">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Avg. Residue Value</span>
            <p className="text-2xl font-black text-emerald-950 mt-1">₹195 / Quintal</p>
            <span className="text-[11px] text-gray-500">Direct gate pickup by verified buyers</span>
          </div>
        </div>

        {/* Listings */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-gray-900">Active Crop Residue Available for Commercial Collection</h2>
            <span className="text-xs font-semibold text-gray-500">{residues.length} active lots</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {residues.map((res) => (
              <div
                key={res.id}
                className="rounded-3xl border border-gray-200 bg-white p-5 shadow-xs hover:border-emerald-400 hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-800">
                        {res.condition}
                      </span>
                      <h3 className="text-lg font-black text-gray-900 mt-1">{res.residueType}</h3>
                      <p className="text-xs text-gray-500">Source: {res.cropSource}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-gray-400">Rate</span>
                      <p className="text-base font-black text-emerald-700">₹{res.pricePerQuintal}/Qtl</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 border-t border-gray-100 pt-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Volume:</span>
                      <span className="font-bold text-gray-900">{res.quantityQuintals} Quintals</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Moisture Level:</span>
                      <span className="font-semibold text-gray-800">{res.moisturePercent}% (Optimum)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Intended Application:</span>
                      <span className="font-bold text-emerald-900">{res.intendedUse}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Pickup Gate:</span>
                      <span className="font-semibold text-gray-700">{res.location}, {res.district}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Est. Total Value:</span>
                      <span className="font-bold text-gray-900">₹{(res.quantityQuintals * res.pricePerQuintal).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Climate Impact:</span>
                      <span className="font-bold text-emerald-700">{res.co2SavedKg} kg CO₂ saved</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      alert(`Collection request dispatched to local bio-aggregator for ${res.farmerName}'s ${res.residueType}. Handover record will be generated upon arrival.`);
                    }}
                    className="w-full rounded-xl bg-emerald-600 px-3 py-2 text-center text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
                  >
                    Request Collection & Pickup 🚜
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal: List Residue */}
        {isListModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 className="text-lg font-black text-gray-900">List Farm Residue for Collection</h3>
                <button
                  type="button"
                  onClick={() => setIsListModalOpen(false)}
                  className="rounded-lg p-1 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateResidue} className="mt-4 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Residue Type</label>
                    <select
                      value={form.residueType}
                      onChange={(e) => setForm({ ...form, residueType: e.target.value as any })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="Paddy Straw">Paddy Straw</option>
                      <option value="Cotton Stalk">Cotton Stalk</option>
                      <option value="Sugarcane Bagasse">Sugarcane Bagasse</option>
                      <option value="Maize Stover">Maize Stover</option>
                      <option value="Mustard Husk">Mustard Husk</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Crop Source</label>
                    <input
                      type="text"
                      required
                      value={form.cropSource}
                      onChange={(e) => setForm({ ...form, cropSource: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Volume (Quintals)</label>
                    <input
                      type="number"
                      required
                      value={form.quantityQuintals}
                      onChange={(e) => setForm({ ...form, quantityQuintals: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Asking Rate (₹/Quintal)</label>
                    <input
                      type="number"
                      required
                      value={form.pricePerQuintal}
                      onChange={(e) => setForm({ ...form, pricePerQuintal: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Condition</label>
                    <select
                      value={form.condition}
                      onChange={(e) => setForm({ ...form, condition: e.target.value as any })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="Baled">Baled (Standard Bundles)</option>
                      <option value="Loose">Loose (Field Heaps)</option>
                      <option value="Chopped">Chopped / Shredded</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Moisture % (approx)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={form.moisturePercent}
                      onChange={(e) => setForm({ ...form, moisturePercent: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Pickup Location Gate</label>
                  <input
                    type="text"
                    required
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsListModalOpen(false)}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
                  >
                    Publish Residue Listing
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
