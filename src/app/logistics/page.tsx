"use client";

import { useState, useEffect, useCallback } from "react";
import PlatformHeader from "@/components/PlatformHeader";
import ConnectedFarmerJourney from "@/components/ConnectedFarmerJourney";
import { useAuth } from "@/context/AuthContext";

interface TransportJob {
  id: string;
  order_id: string;
  origin_hub: string;
  destination_hub: string;
  produce_category: string;
  weight_kg: number;
  quoted_amount: number;
  status: string;
  created_at: string;
}

interface AssignedShipment {
  id: string;
  order_id: string;
  origin: string;
  destination: string;
  status: string;
  estimated_distance_km?: number;
  total_quantity_kg?: number;
  created_at: string;
}

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
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<"jobs" | "assigned" | "calculator" | "earnings">("jobs");

  // Transporter state
  const [openJobs, setOpenJobs] = useState<TransportJob[]>([]);
  const [assignedShipments, setAssignedShipments] = useState<AssignedShipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Freight Calculator State
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

  const loadTransporterData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      // 1. Open Transport Jobs
      const jobsRes = await fetch("/api/platform/transport?status=OPEN", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (jobsRes.ok) {
        const d = await jobsRes.json();
        if (d.success && Array.isArray(d.requests)) setOpenJobs(d.requests);
      }

      // 2. Assigned Shipments
      const shipRes = await fetch("/api/shipments", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (shipRes.ok) {
        const d = await shipRes.json();
        if (d.success && Array.isArray(d.shipments)) setAssignedShipments(d.shipments);
      }
    } catch (e) {
      console.warn("Failed to load transport jobs:", e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      if (token) {
        loadTransporterData();
      }
    });
    return () => {
      active = false;
    };
  }, [token, loadTransporterData]);

  const handleAcceptAssignment = async (jobId: string, quoteAmount: number) => {
    if (!token) {
      alert("Please sign in as a Transporter to accept assignments.");
      return;
    }
    try {
      const res = await fetch("/api/platform/transport", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          requestId: jobId,
          quotedAmount: quoteAmount || 3200,
          transporterName: user?.fullName || "Verified Transporter",
          transporterPhone: user?.phone || "+91 98800 00000",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to assign job.");
      setActionNotice("✓ Transport job assigned successfully! Dispatch manifests created.");
      setTimeout(() => setActionNotice(null), 5000);
      await loadTransporterData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to accept job.");
    }
  };

  const handleUpdateShipment = async (shipmentId: string, status: string) => {
    if (!token) return;
    try {
      const res = await fetch("/api/shipments", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: shipmentId, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update delivery.");
      setActionNotice(`✓ Delivery status updated to ${status}!`);
      setTimeout(() => setActionNotice(null), 4000);
      await loadTransporterData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Update failed.");
    }
  };

  const handleBookTransport = (transporterName: string) => {
    setActiveBooking({
      transporterName,
      totalQuote: totalItemizedQuote,
      status: "CONFIRMED_PICKUP_ASSIGNED",
    });
  };

  return (
    <div className="min-h-screen bg-[#f7faf7] text-[#142319] flex flex-col">
      <PlatformHeader />

      <main className="flex-1 mx-auto max-w-7xl px-4 py-8 sm:px-6 w-full">
        <div className="mb-6">
          <ConnectedFarmerJourney currentStep="move" />
        </div>

        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-900">
                Logistics & Transporter Hub • परिवहन पोर्टल
              </span>
              <span className="text-xs text-gray-500">• Rural Agricultural Freight</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">
              Transport Jobs & Fleet Dispatch
            </h1>
            <p className="text-xs text-gray-600 mt-1 max-w-2xl">
              Discover verified rural agricultural freight loads, accept assignments, update delivery milestones,
              and calculate itemized route tariffs.
            </p>
          </div>

          {/* Role Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-stone-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTab("jobs")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                activeTab === "jobs"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-stone-700 hover:bg-stone-50"
              }`}
            >
              Available Jobs ({openJobs.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("assigned")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                activeTab === "assigned"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-stone-700 hover:bg-stone-50"
              }`}
            >
              My Deliveries ({assignedShipments.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("calculator")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                activeTab === "calculator"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-stone-700 hover:bg-stone-50"
              }`}
            >
              Rate Calculator
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("earnings")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                activeTab === "earnings"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-stone-700 hover:bg-stone-50"
              }`}
            >
              Earnings
            </button>
          </div>
        </div>

        {actionNotice && (
          <div className="mt-4 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-bold text-emerald-900 shadow-2xs">
            {actionNotice}
          </div>
        )}

        {/* TAB 1: AVAILABLE TRANSPORT JOBS */}
        {activeTab === "jobs" && (
          <section className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-stone-900">
                Open Freight Assignments ({openJobs.length})
              </h2>
              {loading && <span className="text-xs text-stone-400">Loading open jobs...</span>}
            </div>

            {openJobs.length === 0 ? (
              <div className="rounded-3xl border border-stone-200 bg-white p-12 text-center">
                <span className="text-4xl">🚚</span>
                <div className="mt-2 text-sm font-bold text-stone-800">No Open Freight Requests Right Now</div>
                <p className="mt-1 text-xs text-stone-500 max-w-sm mx-auto">
                  When buyers accept farmer offers, required farm-to-mandi transport jobs appear here for assignment.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {openJobs.map((job) => (
                  <div key={job.id} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                      <div>
                        <span className="text-sm font-black text-stone-900">{job.produce_category}</span>
                        <div className="text-xs text-stone-500 mt-0.5">{job.weight_kg} kg Cargo</div>
                      </div>
                      <span className="text-sm font-black text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full">
                        ₹{job.quoted_amount?.toLocaleString() || 3500}
                      </span>
                    </div>

                    <div className="mt-3 text-xs text-stone-600 space-y-1">
                      <div>📍 Origin: <span className="font-bold text-stone-800">{job.origin_hub}</span></div>
                      <div>🏁 Destination: <span className="font-bold text-stone-800">{job.destination_hub}</span></div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                      <span className="text-[11px] text-stone-400">Status: {job.status}</span>
                      <button
                        type="button"
                        onClick={() => handleAcceptAssignment(job.id, job.quoted_amount || 3200)}
                        className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-amber-700 transition"
                      >
                        Accept Assignment (स्वीकार करें) →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* TAB 2: MY ASSIGNED DELIVERIES */}
        {activeTab === "assigned" && (
          <section className="mt-6 space-y-4">
            <h2 className="text-base font-black text-stone-900">
              My Active Deliveries ({assignedShipments.length})
            </h2>

            {assignedShipments.length === 0 ? (
              <div className="rounded-3xl border border-stone-200 bg-white p-12 text-center">
                <span className="text-4xl">📦</span>
                <div className="mt-2 text-sm font-bold text-stone-800">No Active Deliveries Assigned</div>
                <p className="mt-1 text-xs text-stone-500 max-w-sm mx-auto">
                  Accept an open load from the &ldquo;Available Jobs&rdquo; tab to dispatch vehicles.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {assignedShipments.map((s) => (
                  <div key={s.id} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-stone-900">
                            {s.origin} $\to$ {s.destination}
                          </span>
                          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-900">
                            {s.status}
                          </span>
                        </div>
                        <div className="text-xs text-stone-500 mt-1">
                          Cargo: {s.total_quantity_kg || 3500} kg • Distance: {s.estimated_distance_km || 72} km
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {s.status === "PENDING_PICKUP" && (
                          <button
                            type="button"
                            onClick={() => handleUpdateShipment(s.id, "IN_TRANSIT")}
                            className="rounded-xl bg-stone-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-black transition"
                          >
                            Mark In Transit 🚚
                          </button>
                        )}
                        {s.status === "IN_TRANSIT" && (
                          <button
                            type="button"
                            onClick={() => handleUpdateShipment(s.id, "DELIVERED")}
                            className="rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-800 transition"
                          >
                            Mark Delivered ✓
                          </button>
                        )}
                        {s.status === "DELIVERED" && (
                          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full">
                            ✓ Trip Completed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* TAB 3: FREIGHT CALCULATOR */}
        {activeTab === "calculator" && (
          <section className="mt-6">
            {activeBooking && (
              <div className="mb-6 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-xs">
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

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Form */}
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
                <h2 className="text-base font-black text-gray-900">2. Fleet Operators in {pickupCity}</h2>

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
          </section>
        )}

        {/* TAB 4: TRANSPORTER EARNINGS */}
        {activeTab === "earnings" && (
          <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-stone-900">💰 Transporter Earnings (भाड़ा कमाई)</h2>
            <p className="text-xs text-stone-600 mt-1">
              Mileage payouts for completed agricultural freight trips.
            </p>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-emerald-300 bg-emerald-50/60 p-5">
                <div className="text-xs font-black uppercase text-emerald-800">Completed Trips</div>
                <div className="mt-1 text-3xl font-black text-emerald-950">
                  {assignedShipments.filter((s) => s.status === "DELIVERED").length}
                </div>
                <div className="text-[11px] text-stone-500 mt-1">Verified delivery slips</div>
              </div>

              <div className="rounded-2xl border border-amber-300 bg-amber-50/60 p-5">
                <div className="text-xs font-black uppercase text-amber-800">In Transit Trips</div>
                <div className="mt-1 text-3xl font-black text-amber-950">
                  {assignedShipments.filter((s) => s.status === "IN_TRANSIT").length}
                </div>
                <div className="text-[11px] text-stone-500 mt-1">Currently on highway</div>
              </div>

              <div className="rounded-2xl border border-purple-300 bg-purple-50/60 p-5">
                <div className="text-xs font-black uppercase text-purple-800">Estimated Total Payout</div>
                <div className="mt-1 text-3xl font-black text-purple-950">
                  ₹{(assignedShipments.length * 3200).toLocaleString()}
                </div>
                <div className="text-[11px] text-stone-500 mt-1">Based on standard km tariffs</div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
