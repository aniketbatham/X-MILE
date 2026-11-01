"use client";

import { useState } from "react";
import PlatformHeader from "@/components/PlatformHeader";
import ConnectedFarmerJourney from "@/components/ConnectedFarmerJourney";
import { WeighmentRecord } from "@/lib/platform-db";

const SEED_WEIGHMENTS: WeighmentRecord[] = [
  {
    id: "wgm-01",
    orderId: "ORD-8821",
    produceName: "Tomato (US-440)",
    grossWeightKg: 5240,
    tareWeightKg: 240,
    netWeightKg: 5000,
    moisturePercent: 11.5,
    qualityGrade: "A",
    collectorName: "Suresh Gowda (Tumakuru Hub Assayer)",
    weighmentDate: "2026-10-31 16:30",
    farmerConfirmed: true,
    buyerConfirmed: true,
  },
  {
    id: "wgm-02",
    orderId: "ORD-8834",
    produceName: "Onion (Nashik Red)",
    grossWeightKg: 8780,
    tareWeightKg: 280,
    netWeightKg: 8500,
    moisturePercent: 13.0,
    qualityGrade: "A",
    collectorName: "K. Venkatesh (APMC Mandi Weighbridge)",
    weighmentDate: "2026-11-01 10:15",
    farmerConfirmed: true,
    buyerConfirmed: false,
  },
];

export default function WeighmentPage() {
  const [weighments, setWeighments] = useState<WeighmentRecord[]>(SEED_WEIGHMENTS);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [form, setForm] = useState({
    orderId: "ORD-8902",
    produceName: "Byadgi Chilli",
    grossWeightKg: 2280,
    tareWeightKg: 80,
    moisturePercent: 9.5,
    qualityGrade: "A" as "A" | "B" | "C",
    collectorName: "Certified APMC Electronic Weighbridge",
  });

  const handleAddWeighment = (e: React.FormEvent) => {
    e.preventDefault();
    const netWeightKg = form.grossWeightKg - form.tareWeightKg;
    const newRecord: WeighmentRecord = {
      id: `wgm-${Date.now()}`,
      orderId: form.orderId,
      produceName: form.produceName,
      grossWeightKg: form.grossWeightKg,
      tareWeightKg: form.tareWeightKg,
      netWeightKg,
      moisturePercent: form.moisturePercent,
      qualityGrade: form.qualityGrade,
      collectorName: form.collectorName,
      weighmentDate: new Date().toISOString().replace("T", " ").substring(0, 16),
      farmerConfirmed: true,
      buyerConfirmed: false,
    };

    setWeighments([newRecord, ...weighments]);
    setIsAddOpen(false);
    setNotice(`✓ Digital weighment receipt of ${netWeightKg.toLocaleString()} kg generated for ${form.orderId}!`);
    setTimeout(() => setNotice(null), 4000);
  };

  const handleConfirmBuyer = (id: string) => {
    setWeighments(
      weighments.map((w) => (w.id === id ? { ...w, buyerConfirmed: true } : w))
    );
    setNotice("✓ Buyer weighment verification confirmed! Funds eligible for escrow milestone release.");
    setTimeout(() => setNotice(null), 4000);
  };

  return (
    <div className="min-h-screen bg-[#f7faf7] text-[#142319]">
      <PlatformHeader />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <ConnectedFarmerJourney activeStepId="harvest" />
        </div>

        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-800">
                Module 20 — Assaying & Quantity Settlement
              </span>
              <span className="text-xs text-gray-500">• Electronic Weighbridge Receipts & Traceability</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">
              Digital Weighment & Quality Assurance
            </h1>
            <p className="text-xs text-gray-600 mt-1 max-w-2xl">
              Lock in gross, tare, and net weights with certified electronic scale timestamps. Both farmer and buyer
              must confirm the measurement to authorize escrow milestone releases.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition shrink-0"
          >
            + Create Weighment Slip ⚖️
          </button>
        </div>

        {notice && (
          <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-100/90 p-3 text-xs font-bold text-emerald-950">
            {notice}
          </div>
        )}

        {/* Weighment Slips Grid */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {weighments.map((w) => (
            <div
              key={w.id}
              className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between pb-3 border-b border-gray-100">
                  <div>
                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-black text-gray-700">
                      Slip #{w.id} • Ref: {w.orderId}
                    </span>
                    <h3 className="text-lg font-black text-gray-900 mt-1">{w.produceName}</h3>
                  </div>
                  <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                    Grade {w.qualityGrade} Assayed
                  </span>
                </div>

                {/* Net Weight Display Box */}
                <div className="mt-4 rounded-2xl bg-emerald-50/70 p-4 border border-emerald-100 text-center">
                  <span className="text-[10px] uppercase font-bold text-gray-500">Certified Net Weight</span>
                  <p className="text-3xl font-black text-emerald-950 mt-1">{w.netWeightKg.toLocaleString()} kg</p>
                  <span className="text-xs font-semibold text-emerald-800">
                    {(w.netWeightKg / 100).toFixed(1)} Quintals ({(w.netWeightKg / 1000).toFixed(2)} MT)
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-xs border-t border-gray-100 pt-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Gross Weight:</span>
                    <span className="font-bold text-gray-900">{w.grossWeightKg.toLocaleString()} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tare (Crates / Vehicle):</span>
                    <span className="font-bold text-gray-700">{w.tareWeightKg.toLocaleString()} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Moisture Level:</span>
                    <span className="font-bold text-blue-700">{w.moisturePercent}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Weighbridge Operator:</span>
                    <span className="font-semibold text-gray-800">{w.collectorName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Timestamp:</span>
                    <span className="font-semibold text-gray-700">{w.weighmentDate}</span>
                  </div>
                </div>

                {/* Mutual Confirmation Badges */}
                <div className="mt-4 grid grid-cols-2 gap-2 pt-3 border-t border-gray-100">
                  <div className={`rounded-xl p-2.5 text-center text-[11px] font-bold ${w.farmerConfirmed ? 'bg-emerald-100 text-emerald-900' : 'bg-gray-100 text-gray-500'}`}>
                    {w.farmerConfirmed ? "✓ Farmer Confirmed" : "Farmer Pending"}
                  </div>
                  <div className={`rounded-xl p-2.5 text-center text-[11px] font-bold ${w.buyerConfirmed ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'}`}>
                    {w.buyerConfirmed ? "✓ Buyer Confirmed" : "Buyer Pending Approval"}
                  </div>
                </div>
              </div>

              {!w.buyerConfirmed && (
                <div className="mt-5 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => handleConfirmBuyer(w.id)}
                    className="w-full rounded-xl bg-emerald-600 px-3 py-2 text-center text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
                  >
                    Confirm Weighment as Buyer ✓
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Modal: Create Slip */}
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-gray-100">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 className="text-base font-black text-gray-900">Issue Electronic Weighment Slip</h3>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="rounded-lg p-1 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddWeighment} className="mt-4 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Order / Lot Reference</label>
                    <input
                      type="text"
                      required
                      value={form.orderId}
                      onChange={(e) => setForm({ ...form, orderId: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Produce Name</label>
                    <input
                      type="text"
                      required
                      value={form.produceName}
                      onChange={(e) => setForm({ ...form, produceName: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Gross Weight (kg)</label>
                    <input
                      type="number"
                      required
                      value={form.grossWeightKg}
                      onChange={(e) => setForm({ ...form, grossWeightKg: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Tare Deduction (kg)</label>
                    <input
                      type="number"
                      required
                      value={form.tareWeightKg}
                      onChange={(e) => setForm({ ...form, tareWeightKg: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none font-bold"
                    />
                  </div>
                </div>

                <div className="rounded-xl bg-emerald-50 p-3 text-[11px] text-emerald-950 font-bold border border-emerald-100">
                  Calculated Net Weight: {(form.grossWeightKg - form.tareWeightKg).toLocaleString()} kg
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Moisture % Check</label>
                    <input
                      type="number"
                      step="0.1"
                      value={form.moisturePercent}
                      onChange={(e) => setForm({ ...form, moisturePercent: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Agreed Grade</label>
                    <select
                      value={form.qualityGrade}
                      onChange={(e) => setForm({ ...form, qualityGrade: e.target.value as any })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="A">Grade A (Premium)</option>
                      <option value="B">Grade B (Standard)</option>
                      <option value="C">Grade C (Processing)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Weighbridge / Assayer Name</label>
                  <input
                    type="text"
                    required
                    value={form.collectorName}
                    onChange={(e) => setForm({ ...form, collectorName: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                  />
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
                    Generate Weighment Record
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
