"use client";

import { useState } from "react";
import PlatformHeader from "@/components/PlatformHeader";
import ConnectedFarmerJourney from "@/components/ConnectedFarmerJourney";
import { StorageFacility, SEED_STORAGE } from "@/lib/platform-db";

export default function StoragePage() {
  const [facilities] = useState<StorageFacility[]>(SEED_STORAGE);
  const [selectedFacility, setSelectedFacility] = useState<StorageFacility | null>(null);
  const [enquiryCommodity, setEnquiryCommodity] = useState("Tomato");
  const [enquiryQuantityMt, setEnquiryQuantityMt] = useState(15);
  const [enquiryDurationMonths, setEnquiryDurationMonths] = useState(2);
  const [notice, setNotice] = useState<string | null>(null);

  const handleSendEnquiry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFacility) return;
    setNotice(`✓ Storage space reservation enquiry sent to ${selectedFacility.name} for ${enquiryQuantityMt} MT of ${enquiryCommodity}! Facility manager will confirm.`);
    setSelectedFacility(null);
    setTimeout(() => setNotice(null), 4500);
  };

  return (
    <div className="min-h-screen bg-[#f7faf7] text-[#142319]">
      <PlatformHeader />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <ConnectedFarmerJourney activeStepId="move" />
        </div>

        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-800">
                Module 15 — Post-Harvest Infrastructure
              </span>
              <span className="text-xs text-gray-500">• WDRA Verified Warehouses & Cold Chains</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">
              Storage, Warehousing & Cold Chain Discovery
            </h1>
            <p className="text-xs text-gray-600 mt-1 max-w-2xl">
              Prevent distress distress-selling during peak harvest arrivals. Discover accredited WDRA warehouses and
              controlled atmosphere cold rooms to preserve fresh produce value.
            </p>
          </div>
        </div>

        {notice && (
          <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-100/90 p-3 text-xs font-bold text-emerald-950">
            {notice}
          </div>
        )}

        {/* Facilities Grid */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {facilities.map((fac) => (
            <div
              key={fac.id}
              className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs hover:border-emerald-400 hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-800">
                      {fac.type}
                    </span>
                    <h3 className="text-base font-black text-gray-900 mt-1.5">{fac.name}</h3>
                    <p className="text-xs text-emerald-800 font-semibold mt-0.5">
                      📍 {fac.district}, {fac.state}
                    </p>
                  </div>
                  {fac.isWdraRegistered && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-bold text-blue-800">
                      WDRA Verified
                    </span>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-center rounded-2xl bg-gray-50 p-3 border border-gray-100">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400">Total Capacity</span>
                    <p className="text-sm font-black text-gray-900 mt-0.5">{fac.totalCapacityMt.toLocaleString()} MT</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400">Available Space</span>
                    <p className="text-sm font-black text-emerald-700 mt-0.5">{fac.availableCapacityMt.toLocaleString()} MT</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-xs border-t border-gray-100 pt-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Storage Rate:</span>
                    <span className="font-bold text-gray-900">₹{fac.ratePerMonthQuintal} / month / Quintal</span>
                  </div>
                  {fac.tempRangeCelsius && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Atmosphere:</span>
                      <span className="font-semibold text-blue-700">{fac.tempRangeCelsius}</span>
                    </div>
                  )}
                  <div className="py-1">
                    <span className="text-gray-500 text-[11px] block mb-1 font-semibold">Accepted Commodities:</span>
                    <div className="flex flex-wrap gap-1">
                      {fac.acceptedCommodities.map((c, idx) => (
                        <span key={idx} className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] text-gray-700">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-gray-500">Helpline:</span>
                    <span className="font-semibold text-gray-900">{fac.phone}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setSelectedFacility(fac)}
                  className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
                >
                  Send Storage Space Enquiry 🏬
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Modal: Storage Enquiry */}
        {selectedFacility && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-gray-100">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <h3 className="text-base font-black text-gray-900">Reserve Space Enquiry</h3>
                  <p className="text-[11px] text-gray-500">{selectedFacility.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFacility(null)}
                  className="rounded-lg p-1 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSendEnquiry} className="mt-4 space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Commodity to Store</label>
                  <input
                    type="text"
                    required
                    value={enquiryCommodity}
                    onChange={(e) => setEnquiryCommodity(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Volume (Metric Tons)</label>
                    <input
                      type="number"
                      required
                      value={enquiryQuantityMt}
                      onChange={(e) => setEnquiryQuantityMt(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Storage Period (Months)</label>
                    <input
                      type="number"
                      required
                      value={enquiryDurationMonths}
                      onChange={(e) => setEnquiryDurationMonths(parseFloat(e.target.value) || 1)}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none font-bold"
                    />
                  </div>
                </div>

                <div className="rounded-xl bg-gray-50 p-3 text-[11px] text-gray-600 border border-gray-100">
                  Rate: <strong>₹{selectedFacility.ratePerMonthQuintal}/Qtl/mo</strong>. Estimated storage cost for {enquiryQuantityMt * 10} Quintals: <strong>₹{(enquiryQuantityMt * 10 * selectedFacility.ratePerMonthQuintal * enquiryDurationMonths).toLocaleString()}</strong>.
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setSelectedFacility(null)}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
                  >
                    Submit Booking Enquiry
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
