"use client";

import { useState } from "react";
import PlatformHeader from "@/components/PlatformHeader";
import ConnectedFarmerJourney from "@/components/ConnectedFarmerJourney";
import { PlatformDb, CalendarEvent } from "@/lib/platform-db";

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>(PlatformDb.getCalendarEvents());
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [notice, setNotice] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    cropName: "Tomato",
    date: new Date().toISOString().split("T")[0],
    type: "HARVEST" as CalendarEvent["type"],
    plotCode: "PLOT-NORTH",
    notes: "",
  });

  const filteredEvents = events.filter((e) => {
    if (filterType === "ALL") return true;
    return e.type === filterType;
  });

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    const created = PlatformDb.addCalendarEvent({
      title: form.title,
      cropName: form.cropName,
      date: form.date,
      type: form.type,
      plotCode: form.plotCode,
      notes: form.notes,
      status: "UPCOMING",
    });

    setEvents(PlatformDb.getCalendarEvents());
    setIsAddEventOpen(false);
    setNotice(`✓ Scheduled event "${created.title}" added to farm calendar!`);
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
                Module 11 — Schedule Synchronization
              </span>
              <span className="text-xs text-gray-500">• Sowing, Irrigation, Harvest & Buyer Demands</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">
              Harvest Window & Buyer Demand Calendar
            </h1>
            <p className="text-xs text-gray-600 mt-1 max-w-2xl">
              Sync on-field agronomic operations with forward procurement timelines posted by verified commercial buyers.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsAddEventOpen(true)}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition shrink-0"
          >
            + Add Event / Harvest Window
          </button>
        </div>

        {notice && (
          <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-100/90 p-3 text-xs font-bold text-emerald-950">
            {notice}
          </div>
        )}

        {/* Filter Pills */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {["ALL", "HARVEST", "BUYER_DEMAND", "IRRIGATION", "FERTILIZER"].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilterType(f)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                filterType === f
                  ? "bg-emerald-600 text-white"
                  : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {f === "ALL"
                ? "All Schedule Items"
                : f === "BUYER_DEMAND"
                ? "🛒 Buyer Demands"
                : f === "HARVEST"
                ? "🌾 Harvest Windows"
                : f === "IRRIGATION"
                ? "💧 Irrigation Dates"
                : "🧪 Fertilizer Runs"}
            </button>
          ))}
        </div>

        {/* Timeline Events List */}
        <div className="mt-6 space-y-4">
          {filteredEvents.map((ev) => (
            <div
              key={ev.id}
              className={`rounded-3xl border p-5 shadow-xs transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                ev.type === "BUYER_DEMAND"
                  ? "border-purple-200 bg-purple-50/40"
                  : ev.type === "HARVEST"
                  ? "border-emerald-200 bg-emerald-50/40"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl shrink-0 ${
                    ev.type === "BUYER_DEMAND"
                      ? "bg-purple-700 text-white"
                      : ev.type === "HARVEST"
                      ? "bg-emerald-700 text-white"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {ev.type === "BUYER_DEMAND" ? "🛒" : ev.type === "HARVEST" ? "🌾" : ev.type === "IRRIGATION" ? "💧" : "🧪"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                        ev.type === "BUYER_DEMAND"
                          ? "bg-purple-200 text-purple-900"
                          : ev.type === "HARVEST"
                          ? "bg-emerald-200 text-emerald-900"
                          : "bg-gray-200 text-gray-800"
                      }`}
                    >
                      {ev.type.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs font-bold text-gray-500">Scheduled: {ev.date}</span>
                  </div>
                  <h3 className="text-base font-black text-gray-900 mt-1">{ev.title}</h3>
                  <p className="text-xs text-gray-600 mt-0.5">{ev.notes}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                {ev.type === "BUYER_DEMAND" && (
                  <a
                    href="/marketplace"
                    className="rounded-xl bg-purple-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-purple-800 transition"
                  >
                    Express Farmer Interest →
                  </a>
                )}
                {ev.type === "HARVEST" && (
                  <a
                    href="/marketplace"
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
                  >
                    Create Forward Listing →
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Modal: Add Event */}
        {isAddEventOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-gray-100">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 className="text-base font-black text-gray-900">Add Crop Schedule Event</h3>
                <button
                  type="button"
                  onClick={() => setIsAddEventOpen(false)}
                  className="rounded-lg p-1 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateEvent} className="mt-4 space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Event Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Second Picking or Forward Harvest"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Event Type</label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="HARVEST">Harvest Window</option>
                      <option value="IRRIGATION">Irrigation Event</option>
                      <option value="FERTILIZER">Fertilizer Run</option>
                      <option value="BUYER_DEMAND">Buyer Procurement Demand</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Target Date</label>
                    <input
                      type="date"
                      required
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Crop Name</label>
                  <input
                    type="text"
                    required
                    value={form.cropName}
                    onChange={(e) => setForm({ ...form, cropName: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Notes / Instructions</label>
                  <textarea
                    rows={2}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsAddEventOpen(false)}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
                  >
                    Save to Calendar
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
