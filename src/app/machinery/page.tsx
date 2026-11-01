"use client";

import { useState } from "react";
import PlatformHeader from "@/components/PlatformHeader";
import ConnectedFarmerJourney from "@/components/ConnectedFarmerJourney";
import { PlatformDb, MachineryItem, MachineryBooking } from "@/lib/platform-db";

export default function MachineryPage() {
  const [equipmentList] = useState<MachineryItem[]>(PlatformDb.getMachinery());
  const [bookings, setBookings] = useState<MachineryBooking[]>(PlatformDb.getMachineryBookings());
  const [selectedItemForBooking, setSelectedItemForBooking] = useState<MachineryItem | null>(null);
  const [bookingUnits, setBookingUnits] = useState(4);
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split("T")[0]);
  const [notice, setNotice] = useState<string | null>(null);

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForBooking) return;

    const totalCost = bookingUnits * selectedItemForBooking.rateAmount;
    const newBooking = PlatformDb.bookMachinery({
      equipmentId: selectedItemForBooking.id,
      equipmentName: `${selectedItemForBooking.equipmentType} (${selectedItemForBooking.brandModel})`,
      farmerName: "Rameshwar Patel",
      bookingDate,
      durationUnits: bookingUnits,
      rateBasis: selectedItemForBooking.rateBasis,
      totalCost,
    });

    setBookings(PlatformDb.getMachineryBookings());
    setSelectedItemForBooking(null);
    setNotice(`✓ Machinery booking confirmed for ${newBooking.equipmentName} on ${newBooking.bookingDate}! Provider notified.`);
    setTimeout(() => setNotice(null), 4000);
  };

  return (
    <div className="min-h-screen bg-[#f7faf7] text-[#142319]">
      <PlatformHeader />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <ConnectedFarmerJourney activeStepId="prepare" />
        </div>

        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-800">
                Module 09 — Farm Mechanization
              </span>
              <span className="text-xs text-gray-500">• Custom Hiring Centers (CHC) & Verified Providers</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">
              Agricultural Machinery & Drone Rental
            </h1>
            <p className="text-xs text-gray-600 mt-1 max-w-2xl">
              Book high-efficiency tractors, laser levelers, rotavators, and precision drone spraying services without
              heavy capital equipment investment.
            </p>
          </div>
        </div>

        {notice && (
          <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-100/90 p-3 text-xs font-bold text-emerald-950">
            {notice}
          </div>
        )}

        {/* Equipment Grid */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-gray-900">Locally Available Equipment for Hire</h2>
            <span className="text-xs font-semibold text-gray-500">Tumakuru & Neighboring Taluks</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {equipmentList.map((item) => (
              <div
                key={item.id}
                className="rounded-3xl border border-gray-200 bg-white p-5 shadow-xs hover:border-emerald-400 hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-800">
                        {item.equipmentType}
                      </span>
                      <h3 className="text-base font-black text-gray-900 mt-1">{item.brandModel}</h3>
                      <p className="text-xs text-gray-500">{item.providerName}</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl bg-gray-50 p-3 border border-gray-100 text-center">
                    <span className="text-[10px] uppercase font-bold text-gray-400">Rental Tariff</span>
                    <p className="text-xl font-black text-emerald-800 mt-0.5">
                      ₹{item.rateAmount} <span className="text-xs font-medium text-gray-500">/ {item.rateBasis}</span>
                    </p>
                  </div>

                  <div className="mt-4 space-y-1.5 text-xs border-t border-gray-100 pt-3">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Service Area:</span>
                      <span className="font-semibold text-gray-700">{item.serviceLocation}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Operator:</span>
                      <span className={`font-bold ${item.operatorIncluded ? "text-emerald-700" : "text-gray-500"}`}>
                        {item.operatorIncluded ? "✓ Included" : "Self-operated"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Diesel / Fuel:</span>
                      <span className={`font-bold ${item.fuelIncluded ? "text-emerald-700" : "text-amber-700"}`}>
                        {item.fuelIncluded ? "✓ Included" : "By Farmer"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Contact:</span>
                      <span className="font-semibold text-gray-800">{item.phone}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedItemForBooking(item);
                      setBookingUnits(item.rateBasis === "Hourly" ? 4 : 2);
                    }}
                    className="w-full rounded-xl bg-emerald-600 px-3 py-2 text-center text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
                  >
                    Book Machinery 🚜
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Confirmed Bookings Section */}
        {bookings.length > 0 && (
          <div className="mt-12 rounded-3xl border border-gray-200 bg-white p-6 shadow-xs">
            <h2 className="text-lg font-black text-gray-900 mb-3">Your Equipment Bookings ({bookings.length})</h2>
            <div className="space-y-3">
              {bookings.map((b) => (
                <div
                  key={b.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 text-xs"
                >
                  <div>
                    <h3 className="text-sm font-black text-gray-900">{b.equipmentName}</h3>
                    <p className="text-gray-500 mt-0.5">
                      Scheduled Date: <strong>{b.bookingDate}</strong> • Duration: {b.durationUnits} {b.rateBasis}s
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-gray-400">Total Tariff</span>
                      <p className="text-sm font-black text-emerald-800">₹{b.totalCost.toLocaleString()}</p>
                    </div>
                    <span className="rounded-full bg-emerald-200 px-2.5 py-1 text-[10px] font-bold text-emerald-900">
                      {b.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal: Book Equipment */}
        {selectedItemForBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-gray-100">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <h3 className="text-base font-black text-gray-900">
                    Book {selectedItemForBooking.brandModel}
                  </h3>
                  <p className="text-[11px] text-gray-500">{selectedItemForBooking.providerName}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedItemForBooking(null)}
                  className="rounded-lg p-1 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleBookingSubmit} className="mt-4 space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Required Booking Date</label>
                  <input
                    type="date"
                    required
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Duration ({selectedItemForBooking.rateBasis === "Hourly" ? "Hours" : "Acres"})
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={bookingUnits}
                    onChange={(e) => setBookingUnits(parseFloat(e.target.value) || 1)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none font-bold"
                  />
                </div>

                <div className="rounded-xl bg-gray-50 p-3 text-[11px] text-gray-600 border border-gray-100 space-y-1">
                  <div className="flex justify-between">
                    <span>Rate:</span>
                    <span className="font-bold">₹{selectedItemForBooking.rateAmount} / {selectedItemForBooking.rateBasis}</span>
                  </div>
                  <div className="flex justify-between text-base font-black text-emerald-800 pt-1 border-t border-gray-200">
                    <span>Estimated Cost:</span>
                    <span>₹{(bookingUnits * selectedItemForBooking.rateAmount).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setSelectedItemForBooking(null)}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
                  >
                    Confirm Booking Request
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
