"use client";

import { useState } from "react";
import PlatformHeader from "@/components/PlatformHeader";
import ConnectedFarmerJourney from "@/components/ConnectedFarmerJourney";
import { PlatformDb, WaterLog } from "@/lib/platform-db";

const SEED_WATER_LOGS: WaterLog[] = [
  {
    id: "w-01",
    plotCode: "PLOT-NORTH",
    date: "2026-10-30",
    source: "Drip",
    durationHours: 3.5,
    estLiters: 14000,
    notes: "Morning drip run with 19:19:19 water-soluble fertigation.",
  },
  {
    id: "w-02",
    plotCode: "PLOT-SOUTH",
    date: "2026-10-28",
    source: "Borewell",
    durationHours: 4.0,
    estLiters: 18000,
    notes: "Furrow irrigation for onion bulb expansion.",
  },
];

export default function WaterPlannerPage() {
  const farm = PlatformDb.getFarm();
  const [logs, setLogs] = useState<WaterLog[]>(SEED_WATER_LOGS);
  const [selectedPlot, setSelectedPlot] = useState(farm.plots[0]?.code || "PLOT-NORTH");
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [form, setForm] = useState({
    plotCode: farm.plots[0]?.code || "PLOT-NORTH",
    date: new Date().toISOString().split("T")[0],
    source: "Drip" as WaterLog["source"],
    durationHours: 3.0,
    estLiters: 12000,
    notes: "Routine evening drip cycle.",
  });

  const totalLitersUsed = logs.reduce((sum, l) => sum + (l.estLiters || 0), 0);

  const handleAddWaterLog = (e: React.FormEvent) => {
    e.preventDefault();
    const newLog: WaterLog = {
      id: `w-${Date.now()}`,
      ...form,
    };
    setLogs([newLog, ...logs]);
    setIsLogOpen(false);
    setNotice(`✓ Irrigation run on ${form.plotCode} (${form.durationHours} hrs) logged in farm ledger!`);
    setTimeout(() => setNotice(null), 4000);
  };

  return (
    <div className="min-h-screen bg-[#f7faf7] text-[#142319]">
      <PlatformHeader />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <ConnectedFarmerJourney activeStepId="grow" />
        </div>

        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-800">
                Module 19 — Water Stewardship
              </span>
              <span className="text-xs text-gray-500">• Precision Drip Scheduling & Aquifer Monitoring</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">
              Water & Irrigation Planning Assistant
            </h1>
            <p className="text-xs text-gray-600 mt-1 max-w-2xl">
              Track plot-wise irrigation runs, monitor groundwater pumping hours, and calculate cumulative water discharge
              to avoid over-watering and root rot.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsLogOpen(true)}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition shrink-0"
          >
            + Log Irrigation Run 💧
          </button>
        </div>

        {notice && (
          <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-100/90 p-3 text-xs font-bold text-emerald-950">
            {notice}
          </div>
        )}

        {/* Summary Metrics */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-3xl border border-blue-200 bg-blue-50/50 p-5">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-800">Cumulative Irrigation</span>
            <p className="text-2xl font-black text-blue-950 mt-1">{(totalLitersUsed / 1000).toFixed(0)} Kiloliters</p>
            <span className="text-[11px] text-gray-500">Across {logs.length} recorded pumping cycles</span>
          </div>

          <div className="rounded-3xl border border-emerald-200 bg-emerald-50/50 p-5">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Primary Infrastructure</span>
            <p className="text-2xl font-black text-emerald-950 mt-1">Drip & Micro-Sprinkler</p>
            <span className="text-[11px] text-gray-500">45% water savings compared to flood irrigation</span>
          </div>

          <div className="rounded-3xl border border-amber-200 bg-amber-50/50 p-5">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">Next Scheduled Run</span>
            <p className="text-2xl font-black text-amber-950 mt-1">Tomorrow 06:30 AM</p>
            <span className="text-[11px] text-gray-500">PLOT-NORTH (3.5 Hours Drip fertigation)</span>
          </div>
        </div>

        {/* Logs Table */}
        <div className="mt-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-gray-900">Irrigation Event History</h2>
            <span className="text-xs font-semibold text-gray-500">{logs.length} logged events</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-200 bg-gray-50 text-gray-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3 font-bold">Date</th>
                  <th className="px-4 py-3 font-bold">Plot Code</th>
                  <th className="px-4 py-3 font-bold">Source Method</th>
                  <th className="px-4 py-3 font-bold">Pumping Duration</th>
                  <th className="px-4 py-3 font-bold">Est. Water Volume</th>
                  <th className="px-4 py-3 font-bold">Field Observations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/80 transition">
                    <td className="px-4 py-3.5 font-bold text-gray-900">{log.date}</td>
                    <td className="px-4 py-3.5 text-gray-600 font-mono">{log.plotCode}</td>
                    <td className="px-4 py-3.5">
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                        {log.source}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-gray-900">{log.durationHours} Hours</td>
                    <td className="px-4 py-3.5 text-blue-700 font-bold">{log.estLiters.toLocaleString()} Liters</td>
                    <td className="px-4 py-3.5 text-gray-600">{log.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Add Log */}
        {isLogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-gray-100">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 className="text-base font-black text-gray-900">Record Irrigation Event</h3>
                <button
                  type="button"
                  onClick={() => setIsLogOpen(false)}
                  className="rounded-lg p-1 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddWaterLog} className="mt-4 space-y-4 text-xs">
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
                    <label className="block font-bold text-gray-700 mb-1">Irrigation Date</label>
                    <input
                      type="date"
                      required
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Irrigation Method</label>
                    <select
                      value={form.source}
                      onChange={(e) => setForm({ ...form, source: e.target.value as any })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="Drip">Drip Irrigation</option>
                      <option value="Borewell">Borewell Channel</option>
                      <option value="Canal">Canal</option>
                      <option value="Sprinkler">Micro Sprinkler</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Duration (Hours)</label>
                    <input
                      type="number"
                      step="0.5"
                      required
                      value={form.durationHours}
                      onChange={(e) => {
                        const hrs = parseFloat(e.target.value) || 0;
                        setForm({
                          ...form,
                          durationHours: hrs,
                          estLiters: hrs * 3800, // approx 3,800 L/hr on standard 5HP pump
                        });
                      }}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Field Notes / Fertilizer added</label>
                  <input
                    type="text"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsLogOpen(false)}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
                  >
                    Save Water Log
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
