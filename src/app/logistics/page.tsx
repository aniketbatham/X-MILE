"use client";

import { useState } from "react";
import PlatformHeader from "@/components/PlatformHeader";
import ConnectedFarmerJourney from "@/components/ConnectedFarmerJourney";

const TRANSPORTERS = [
  {
    id: "trn-01",
    name: "Kisan Express Multi-Axle Logistics",
    vehicleType: "Canter (5 Ton Capacity)",
    locationHub: "Tumakuru By-Pass Hub",
    rating: 4.8,
    ratePerKm: 34,
    minCharges: 2500,
    phone: "+91 98800 55667",
    isColdChain: false,
  },
  {
    id: "trn-02",
    name: "FreshMove Refrigerated Agro Transit",
    vehicleType: "Reefer Cold Van (3.5 Ton)",
    locationHub: "Nelamangala Highway Terminal",
    rating: 4.9,
    ratePerKm: 52,
    minCharges: 4200,
    phone: "+91 97411 88990",
    isColdChain: true,
  },
  {
    id: "trn-03",
    name: "Sahyadri Rural Mini-Truck Fleet",
    vehicleType: "Pickup (1.5 Ton Capacity)",
    locationHub: "Kunigal Town Hub",
    rating: 4.7,
    ratePerKm: 22,
    minCharges: 1400,
    phone: "+91 99011 22334",
    isColdChain: false,
  },
];

export default function LogisticsPage() {
  const [pickupCity, setPickupCity] = useState("Tumakuru Farm Gate");
  const [destinationCity, setDestinationCity] = useState("Bengaluru APMC Mandi");
  const [distanceKm, setDistanceKm] = useState(72);
  const [produceType, setProduceType] = useState("Tomato (Fresh Produce)");
  const [weightKg, setWeightKg] = useState(3500);
  const [vehicleChoice, setVehicleChoice] = useState("Canter (5 Ton Capacity)");
  const [activeBooking, setActiveBooking] = useState<{
    transporterName: string;
    totalQuote: number;
    status: string;
  } | null>(null);

  const selectedTransporter = TRANSPORTERS.find((t) => t.vehicleType === vehicleChoice) || TRANSPORTERS[0];
  const transitCost = Math.max(distanceKm * selectedTransporter.ratePerKm, selectedTransporter.minCharges);
  const loadingCharges = 650;
  const tollAndPermit = 380;
  const totalItemizedQuote = transitCost + loadingCharges + tollAndPermit;

  const handleBookTransport = (transporterName: string) => {
    setActiveBooking({
      transporterName,
      totalQuote: totalItemizedQuote,
      status: "CONFIRMED_PICKUP_ASSIGNED",
    });
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
                Module 06 — Logistics & Freight
              </span>
              <span className="text-xs text-gray-500">• Multi-Stop Farm-to-City Freight</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">
              Transport Quotation & Fleet Booking
            </h1>
            <p className="text-xs text-gray-600 mt-1 max-w-2xl">
              Discover verified rural agricultural freight carriers, generate itemized distance-based quotations,
              and coordinate multi-farm pooling pickups.
            </p>
          </div>
        </div>

        {activeBooking && (
          <div className="mt-6 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-black text-emerald-950 text-sm">
                  🚚 Transport Booking Confirmed: {activeBooking.transporterName}
                </span>
                <p className="text-gray-600 mt-0.5">
                  Vehicle allocated for pickup from {pickupCity} to {destinationCity}. Total itemized freight: ₹{activeBooking.totalQuote.toLocaleString()}
                </p>
              </div>
              <span className="rounded-full bg-emerald-200 px-3 py-1 text-[10px] font-black text-emerald-900">
                {activeBooking.status}
              </span>
            </div>
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Freight Requirements Form */}
          <div className="lg:col-span-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-xs space-y-4 text-xs">
            <h2 className="text-base font-black text-gray-900 pb-2 border-b border-gray-100">
              1. Load & Route Specifications
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Pickup Origin</label>
                <input
                  type="text"
                  value={pickupCity}
                  onChange={(e) => setPickupCity(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Delivery Destination</label>
                <input
                  type="text"
                  value={destinationCity}
                  onChange={(e) => setDestinationCity(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Estimated Route Distance (km)</label>
                <input
                  type="number"
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Total Cargo Weight (kg)</label>
                <input
                  type="number"
                  value={weightKg}
                  onChange={(e) => setWeightKg(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Produce Category</label>
              <input
                type="text"
                value={produceType}
                onChange={(e) => setProduceType(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Required Vehicle Capacity</label>
              <select
                value={vehicleChoice}
                onChange={(e) => setVehicleChoice(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
              >
                {TRANSPORTERS.map((t) => (
                  <option key={t.id} value={t.vehicleType}>
                    {t.vehicleType} • ₹{t.ratePerKm}/km ({t.isColdChain ? "Cold Chain" : "Standard"})
                  </option>
                ))}
              </select>
            </div>

            {/* Itemized Calculation */}
            <div className="mt-4 rounded-2xl bg-gray-50 p-4 border border-gray-100 space-y-2">
              <span className="text-[10px] uppercase font-bold text-gray-400">Itemized Freight Breakdown</span>
              <div className="flex justify-between text-gray-600">
                <span>Distance Transit ({distanceKm} km @ ₹{selectedTransporter.ratePerKm}/km):</span>
                <span className="font-bold text-gray-900">₹{transitCost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Loading & Hamali Handling:</span>
                <span className="font-bold text-gray-900">₹{loadingCharges.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tollway & Entry Green Cess:</span>
                <span className="font-bold text-gray-900">₹{tollAndPermit.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-base font-black text-emerald-800 pt-2 border-t border-gray-200">
                <span>Total Guaranteed Freight:</span>
                <span>₹{totalItemizedQuote.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Transporter Carriers List */}
          <div className="lg:col-span-6 space-y-4">
            <h2 className="text-base font-black text-gray-900">2. Available Fleet Operators in {pickupCity}</h2>

            {TRANSPORTERS.map((t) => (
              <div
                key={t.id}
                className="rounded-3xl border border-gray-200 bg-white p-5 shadow-xs hover:border-emerald-400 transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-gray-900">{t.name}</h3>
                      {t.isColdChain && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-bold text-blue-800">
                          ❄️ Cold Chain
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">Vehicle: {t.vehicleType}</p>
                    <p className="text-xs text-gray-400">Depot: {t.locationHub}</p>
                  </div>
                  <div className="text-right">
                    <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800">
                      ★ {t.rating}
                    </span>
                    <p className="text-sm font-black text-emerald-800 mt-1">₹{t.ratePerKm}/km</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between pt-3 border-t border-gray-100 text-xs">
                  <span className="text-gray-500">Contact: {t.phone}</span>
                  <button
                    type="button"
                    onClick={() => handleBookTransport(t.name)}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
                  >
                    Select & Book Fleet →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
