"use client";

import { useState } from "react";
import PlatformHeader from "@/components/PlatformHeader";
import ConnectedFarmerJourney from "@/components/ConnectedFarmerJourney";
import { PlatformDb, FarmProfile, Plot } from "@/lib/platform-db";

export default function FarmProfilePage() {
  const [farm, setFarm] = useState<FarmProfile>(PlatformDb.getFarm());
  const [user, setUser] = useState(PlatformDb.getUser());
  const [isAddPlotOpen, setIsAddPlotOpen] = useState(false);
  const [plotForm, setPlotForm] = useState({
    code: "",
    name: "",
    areaAcres: 1.5,
    soilType: "Red Loamy" as Plot["soilType"],
    irrigationSource: "Drip Irrigation" as Plot["irrigationSource"],
    currentCrop: "",
    cropStage: "Sowing" as Plot["cropStage"],
    sowingDate: new Date().toISOString().split("T")[0],
    expectedHarvestDate: "",
  });

  const handleAddPlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plotForm.code || !plotForm.name || !plotForm.currentCrop) {
      alert("Please enter plot code, name, and current crop.");
      return;
    }
    const newPlot = PlatformDb.addPlot(plotForm);
    setFarm(PlatformDb.getFarm());
    setIsAddPlotOpen(false);
    setPlotForm({
      code: "",
      name: "",
      areaAcres: 1.5,
      soilType: "Red Loamy",
      irrigationSource: "Drip Irrigation",
      currentCrop: "",
      cropStage: "Sowing",
      sowingDate: new Date().toISOString().split("T")[0],
      expectedHarvestDate: "",
    });
  };

  return (
    <div className="min-h-screen bg-[#f7faf7] text-[#142319]">
      <PlatformHeader />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Breadcrumb & Journey */}
        <div className="mb-6">
          <ConnectedFarmerJourney activeStepId="plan" />
        </div>

        {/* Farmer & Farm Overview Hero */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* User Profile Card */}
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-700 text-2xl font-black text-white shadow-sm">
                👨‍🌾
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black text-gray-900">{user.name}</h1>
                  {user.isVerified && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      ✓ Verified Farmer
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">{user.phone} • {user.email}</p>
                <p className="text-xs font-semibold text-emerald-800 mt-0.5">
                  📍 {user.village}, {user.district}, {user.state}
                </p>
              </div>
            </div>

            <div className="mt-6 border-t border-gray-100 pt-4 space-y-2 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Total Registered Land:</span>
                <span className="font-bold text-gray-900">{farm.totalAreaAcres} Acres</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Active Cultivated Plots:</span>
                <span className="font-bold text-gray-900">{farm.plots.length} Plots</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Land Survey / RTC Number:</span>
                <span className="font-bold text-gray-900">{farm.surveyNumber}</span>
              </div>
            </div>
          </div>

          {/* Farm Infrastructure Card */}
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs lg:col-span-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    Module 01 — Land & Agronomic Registry
                  </span>
                  <h2 className="text-lg font-black text-gray-900">{farm.farmName}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddPlotOpen(true)}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
                >
                  + Add New Plot
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="rounded-2xl bg-emerald-50/60 p-3 border border-emerald-100">
                  <span className="text-xs text-gray-500 font-medium">Plots Count</span>
                  <p className="text-xl font-black text-emerald-950 mt-1">{farm.plots.length}</p>
                </div>
                <div className="rounded-2xl bg-emerald-50/60 p-3 border border-emerald-100">
                  <span className="text-xs text-gray-500 font-medium">Soil Types</span>
                  <p className="text-xl font-black text-emerald-950 mt-1">2 Classes</p>
                </div>
                <div className="rounded-2xl bg-emerald-50/60 p-3 border border-emerald-100">
                  <span className="text-xs text-gray-500 font-medium">Irrigation</span>
                  <p className="text-xl font-black text-emerald-950 mt-1">Drip / Well</p>
                </div>
                <div className="rounded-2xl bg-emerald-50/60 p-3 border border-emerald-100">
                  <span className="text-xs text-gray-500 font-medium">Crop Varieties</span>
                  <p className="text-xl font-black text-emerald-950 mt-1">3 Active</p>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-400 mt-4">
              *Shared plot data is automatically synced across Crop Planner, Water Logging, and Harvest Calendar.
            </p>
          </div>
        </div>

        {/* Plots List */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-gray-900">Registered Farm Plots & Active Crops</h2>
            <span className="text-xs font-semibold text-gray-500">Showing {farm.plots.length} plots</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {farm.plots.map((plot) => (
              <div
                key={plot.id}
                className="rounded-3xl border border-gray-200 bg-white p-5 shadow-xs hover:border-emerald-400 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="rounded-lg bg-gray-100 px-2 py-0.5 text-[10px] font-black text-gray-600">
                      {plot.code}
                    </span>
                    <h3 className="text-base font-black text-gray-900 mt-1">{plot.name}</h3>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-800">
                    {plot.areaAcres} Acres
                  </span>
                </div>

                <div className="mt-4 space-y-2 border-t border-gray-100 pt-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Current Crop:</span>
                    <span className="font-bold text-gray-900">{plot.currentCrop}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Growth Stage:</span>
                    <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                      {plot.cropStage}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Soil Type:</span>
                    <span className="font-semibold text-gray-700">{plot.soilType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Irrigation:</span>
                    <span className="font-semibold text-gray-700">{plot.irrigationSource}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Sown Date:</span>
                    <span className="font-semibold text-gray-700">{plot.sowingDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Est. Harvest:</span>
                    <span className="font-bold text-emerald-700">{plot.expectedHarvestDate || "Nov 2026"}</span>
                  </div>
                </div>

                <div className="mt-5 flex gap-2">
                  <a
                    href={`/crop-planner?plot=${plot.code}`}
                    className="flex-1 rounded-xl bg-emerald-50 px-3 py-2 text-center text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition"
                  >
                    Crop Plan
                  </a>
                  <a
                    href={`/soil-health?plot=${plot.code}`}
                    className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-center text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
                  >
                    Soil Card
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal: Add Plot Form */}
        {isAddPlotOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 className="text-lg font-black text-gray-900">Add New Cultivation Plot</h3>
                <button
                  type="button"
                  onClick={() => setIsAddPlotOpen(false)}
                  className="rounded-lg p-1 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddPlot} className="mt-4 space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Plot Identification Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PLOT-WEST-02"
                    value={plotForm.code}
                    onChange={(e) => setPlotForm({ ...plotForm, code: e.target.value.toUpperCase() })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Plot Familiar Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. West Borewell Plot"
                    value={plotForm.name}
                    onChange={(e) => setPlotForm({ ...plotForm, name: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Area (Acres)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={plotForm.areaAcres}
                      onChange={(e) => setPlotForm({ ...plotForm, areaAcres: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Soil Type</label>
                    <select
                      value={plotForm.soilType}
                      onChange={(e) => setPlotForm({ ...plotForm, soilType: e.target.value as any })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="Red Loamy">Red Loamy</option>
                      <option value="Black Cotton">Black Cotton</option>
                      <option value="Alluvial">Alluvial</option>
                      <option value="Sandy Loam">Sandy Loam</option>
                      <option value="Laterite">Laterite</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Irrigation Source</label>
                    <select
                      value={plotForm.irrigationSource}
                      onChange={(e) => setPlotForm({ ...plotForm, irrigationSource: e.target.value as any })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="Drip Irrigation">Drip Irrigation</option>
                      <option value="Borewell">Borewell</option>
                      <option value="Canal">Canal</option>
                      <option value="Sprinkler">Sprinkler</option>
                      <option value="Rainfed">Rainfed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Current Crop</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Maize / Tomato"
                      value={plotForm.currentCrop}
                      onChange={(e) => setPlotForm({ ...plotForm, currentCrop: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Sowing Date</label>
                    <input
                      type="date"
                      value={plotForm.sowingDate}
                      onChange={(e) => setPlotForm({ ...plotForm, sowingDate: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Expected Harvest Date</label>
                    <input
                      type="date"
                      value={plotForm.expectedHarvestDate}
                      onChange={(e) => setPlotForm({ ...plotForm, expectedHarvestDate: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsAddPlotOpen(false)}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
                  >
                    Save Plot to Farm Profile
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
