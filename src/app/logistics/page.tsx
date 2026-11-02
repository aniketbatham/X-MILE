"use client";

import { useState, useEffect, useCallback } from "react";
import PlatformHeader from "@/components/PlatformHeader";
import RoleGuard from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";

interface TransportJob {
  id: string;
  order_id?: string;
  pickup_location: string;
  destination_location: string;
  produce_type: string;
  quantity_kg: number;
  required_vehicle_type: string;
  pickup_date: string;
  quoted_amount?: number;
  status: string;
  created_at: string;
}

interface AssignedShipment {
  id: string;
  order_id: string;
  origin: string;
  destination: string;
  status: string;
  current_location?: string;
  progress_percentage?: number;
  estimated_distance_km?: number;
  total_quantity_kg?: number;
  created_at: string;
  updated_at?: string;
}

export default function LogisticsPage() {
  const { user, token } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"available" | "assigned" | "deliveries" | "earnings" | "profile">("available");

  // Transporter state
  const [openJobs, setOpenJobs] = useState<TransportJob[]>([]);
  const [assignedShipments, setAssignedShipments] = useState<AssignedShipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Quote submission dialog state
  const [quotingJobId, setQuotingJobId] = useState<string | null>(null);
  const [quoteAmount, setQuoteAmount] = useState<string>("3500");

  // Status update modal state
  const [updatingShipmentId, setUpdatingShipmentId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<string>("In Transit");
  const [locationUpdate, setLocationUpdate] = useState<string>("");
  const [progressUpdate, setProgressUpdate] = useState<number>(50);

  const loadTransporterData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      // 1. Open Transport Requests
      const jobsRes = await fetch("/api/platform/transport", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (jobsRes.ok) {
        const d = await jobsRes.json();
        if (d.success && Array.isArray(d.requests)) {
          // Filter to those looking for a transporter
          setOpenJobs(d.requests.filter((r: TransportJob) => r.status === "LOOKING_FOR_TRANSPORTER" || r.status === "OPEN"));
        }
      }

      // 2. Assigned Shipments
      const shipRes = await fetch("/api/shipments", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (shipRes.ok) {
        const d = await shipRes.json();
        if (d.success && Array.isArray(d.shipments)) {
          setAssignedShipments(d.shipments);
        }
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
      if (active && token) {
        loadTransporterData();
      }
    });
    return () => {
      active = false;
    };
  }, [token, loadTransporterData]);

  const handleAcceptJob = async (jobId: string) => {
    if (!token) return;
    const amount = Number(quoteAmount);
    if (!amount || amount <= 0) {
      setFeedback({ type: "error", text: "Please enter a valid positive quote amount." });
      return;
    }

    setActionInProgress(jobId);
    setFeedback(null);
    try {
      const res = await fetch("/api/platform/transport", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          requestId: jobId,
          quotedAmount: amount,
          transporterName: user?.fullName || "Verified Transporter",
          transporterPhone: user?.phone || "+91 98800 00000",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to assign transport job.");
      }

      setFeedback({ type: "success", text: "✓ Transport job assigned successfully! Dispatch manifests initialized." });
      setQuotingJobId(null);
      await loadTransporterData();
    } catch (e: unknown) {
      setFeedback({ type: "error", text: e instanceof Error ? e.message : "Failed to accept job." });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleUpdateShipmentStatus = async (shipmentId: string) => {
    if (!token) return;
    setActionInProgress(shipmentId);
    setFeedback(null);
    try {
      const res = await fetch("/api/shipments", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: shipmentId,
          status: newStatus,
          currentLocation: locationUpdate || undefined,
          progressPercentage: progressUpdate,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update delivery status.");

      setFeedback({ type: "success", text: `✓ Shipment status updated to '${newStatus}' successfully!` });
      setUpdatingShipmentId(null);
      await loadTransporterData();
    } catch (e: unknown) {
      setFeedback({ type: "error", text: e instanceof Error ? e.message : "Update failed." });
    } finally {
      setActionInProgress(null);
    }
  };

  // Metrics
  const activeDeliveries = assignedShipments.filter((s) => s.status === "In Transit" || s.status === "Preparing");
  const completedDeliveries = assignedShipments.filter((s) => s.status === "Delivered");
  const totalWeightCarried = completedDeliveries.reduce((sum, s) => sum + (s.total_quantity_kg || 0), 0);

  return (
    <RoleGuard allowedRoles={["TRANSPORT_PROVIDER", "ADMIN"]} portalName="Rural Logistics Hub">
      <div className="min-h-screen bg-[#f7faf7] text-stone-900 flex flex-col">
        <PlatformHeader />

        <main className="flex-1 mx-auto max-w-7xl px-4 py-8 sm:px-6 w-full space-y-6">
          
          {/* Top Banner & Overview */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-900">
                  Rural Logistics Hub • परिवहन पोर्टल
                </span>
                {user?.isVerified && (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-bold text-blue-800">
                    ✓ Verified Fleet Operator
                  </span>
                )}
              </div>
              <h1 className="mt-1.5 text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                Logistics Dispatch & Haulage
              </h1>
              <p className="text-xs sm:text-sm text-stone-600">
                Logged in as <strong>{user?.fullName || "Transporter"}</strong> • Manage farm-gate freight requests and real-time delivery telemetry.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadTransporterData}
                disabled={loading}
                className="px-3.5 py-2 border border-stone-300 rounded-xl text-xs font-bold text-stone-700 bg-white hover:bg-stone-50 transition disabled:opacity-50"
              >
                {loading ? "Refreshing..." : "↻ Refresh Jobs"}
              </button>
            </div>
          </div>

          {/* Feedback message banner */}
          {feedback && (
            <div
              className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between animate-in fade-in ${
                feedback.type === "success"
                  ? "bg-emerald-100 border border-emerald-300 text-emerald-950"
                  : "bg-red-50 border border-red-200 text-red-900"
              }`}
            >
              <span>{feedback.text}</span>
              <button type="button" onClick={() => setFeedback(null)} className="text-base font-bold ml-2">
                ✕
              </button>
            </div>
          )}

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
              <div className="text-[11px] font-bold text-stone-500 uppercase">Available Jobs</div>
              <div className="text-2xl font-black text-amber-700 mt-1">{openJobs.length}</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
              <div className="text-[11px] font-bold text-stone-500 uppercase">Active Shipments</div>
              <div className="text-2xl font-black text-blue-700 mt-1">{activeDeliveries.length}</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
              <div className="text-[11px] font-bold text-stone-500 uppercase">Completed Deliveries</div>
              <div className="text-2xl font-black text-emerald-700 mt-1">{completedDeliveries.length}</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
              <div className="text-[11px] font-bold text-stone-500 uppercase">Total Haulage</div>
              <div className="text-2xl font-black text-stone-900 mt-1">{totalWeightCarried.toLocaleString()} kg</div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 border-b border-stone-200 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setActiveTab("available")}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                activeTab === "available"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-stone-600 hover:bg-stone-200/60"
              }`}
            >
              📋 Available Jobs ({openJobs.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("assigned")}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                activeTab === "assigned"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-stone-600 hover:bg-stone-200/60"
              }`}
            >
              🚛 Assigned Deliveries ({assignedShipments.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("earnings")}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                activeTab === "earnings"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-stone-600 hover:bg-stone-200/60"
              }`}
            >
              💰 Earnings & Mileage
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("profile")}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                activeTab === "profile"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-stone-600 hover:bg-stone-200/60"
              }`}
            >
              👤 Fleet Profile
            </button>
          </div>

          {/* TAB 1: AVAILABLE JOBS */}
          {activeTab === "available" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-extrabold text-stone-900">
                  Open Farm-Gate Transport Requests
                </h2>
                <span className="text-xs text-stone-500">Live PostgREST Queries from Supabase</span>
              </div>

              {openJobs.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 border border-stone-200 text-center space-y-3">
                  <div className="text-4xl">🚚</div>
                  <h3 className="text-base font-bold text-stone-800">No Open Delivery Requests Right Now</h3>
                  <p className="text-xs text-stone-500 max-w-md mx-auto">
                    New transport jobs appear here as soon as farmers and buyers confirm accepted orders. Check back shortly.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {openJobs.map((job) => (
                    <div
                      key={job.id}
                      className="bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs space-y-4 hover:border-amber-400 transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                            {job.produce_type || "Agricultural Produce"}
                          </span>
                          <h3 className="text-sm font-extrabold text-stone-900 mt-1.5">
                            {job.quantity_kg?.toLocaleString()} kg Payload
                          </h3>
                        </div>
                        <span className="text-[10px] text-stone-400 font-semibold">
                          Pickup: {job.pickup_date || "Immediate"}
                        </span>
                      </div>

                      <div className="bg-stone-50 p-3 rounded-xl border border-stone-100 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-stone-500 font-semibold">Pickup:</span>
                          <span className="font-bold text-stone-800">{job.pickup_location}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-stone-500 font-semibold">Destination:</span>
                          <span className="font-bold text-stone-800">{job.destination_location}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-stone-500 font-semibold">Vehicle Needed:</span>
                          <span className="font-bold text-amber-800">{job.required_vehicle_type}</span>
                        </div>
                      </div>

                      {quotingJobId === job.id ? (
                        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                          <label className="block text-[11px] font-bold text-amber-950">
                            Enter Freight Quote (₹):
                          </label>
                          <input
                            type="number"
                            value={quoteAmount}
                            onChange={(e) => setQuoteAmount(e.target.value)}
                            placeholder="e.g. 3500"
                            className="w-full px-3 py-2 text-xs border border-amber-300 rounded-lg bg-white"
                          />
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleAcceptJob(job.id)}
                              disabled={actionInProgress === job.id}
                              className="flex-1 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold transition disabled:opacity-50"
                            >
                              {actionInProgress === job.id ? "Assigning..." : "Confirm & Accept Job"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setQuotingJobId(null)}
                              className="px-3 py-2 border border-stone-300 text-stone-700 rounded-lg text-xs font-semibold"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setQuotingJobId(job.id);
                            setQuoteAmount(job.quoted_amount ? String(job.quoted_amount) : "3500");
                          }}
                          className="w-full py-2.5 bg-stone-900 hover:bg-black text-white text-xs font-extrabold rounded-xl transition shadow-xs"
                        >
                          Quote & Accept Job →
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ASSIGNED DELIVERIES */}
          {activeTab === "assigned" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-extrabold text-stone-900">
                  My Active & Completed Shipments
                </h2>
                <span className="text-xs text-stone-500">Live Backend Orders</span>
              </div>

              {assignedShipments.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 border border-stone-200 text-center space-y-3">
                  <div className="text-4xl">🚛</div>
                  <h3 className="text-base font-bold text-stone-800">No Assigned Deliveries Yet</h3>
                  <p className="text-xs text-stone-500 max-w-md mx-auto">
                    When you accept an open transport request, its active delivery manifest will appear here for telemetry updates.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {assignedShipments.map((shipment) => (
                    <div
                      key={shipment.id}
                      className="bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs text-stone-900">
                              Order #{shipment.order_id?.slice(0, 8)}...
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                shipment.status === "Delivered"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : shipment.status === "In Transit"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {shipment.status}
                            </span>
                          </div>
                          <div className="text-[11px] text-stone-500 mt-0.5">
                            Payload: {shipment.total_quantity_kg?.toLocaleString()} kg
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setUpdatingShipmentId(shipment.id);
                              setNewStatus(shipment.status === "Preparing" ? "In Transit" : "Delivered");
                              setLocationUpdate(shipment.current_location || "");
                              setProgressUpdate(shipment.progress_percentage || 50);
                            }}
                            className="px-3 py-1.5 bg-stone-900 hover:bg-black text-white text-xs font-bold rounded-lg transition"
                          >
                            Update Status 📍
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-stone-400 font-medium">From:</span>{" "}
                          <span className="font-semibold text-stone-800">{shipment.origin || "Farm Gate"}</span>
                        </div>
                        <div>
                          <span className="text-stone-400 font-medium">To:</span>{" "}
                          <span className="font-semibold text-stone-800">{shipment.destination}</span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-stone-500 font-semibold">
                          <span>Transit Progress</span>
                          <span>{shipment.progress_percentage || (shipment.status === "Delivered" ? 100 : 25)}%</span>
                        </div>
                        <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              shipment.status === "Delivered" ? "bg-emerald-600" : "bg-blue-600"
                            }`}
                            style={{
                              width: `${shipment.progress_percentage || (shipment.status === "Delivered" ? 100 : 25)}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* In-page status update dialog */}
                      {updatingShipmentId === shipment.id && (
                        <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3 mt-3">
                          <div className="text-xs font-bold text-stone-900">
                            Update Delivery Telemetry & Status
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-bold text-stone-600 mb-1">
                                Delivery Stage
                              </label>
                              <select
                                value={newStatus}
                                onChange={(e) => setNewStatus(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg bg-white"
                              >
                                <option value="In Transit">In Transit (डिस्पैच / रास्ते में)</option>
                                <option value="Delivered">Delivered (सफलतापूर्वक पहुंचाया)</option>
                                <option value="Delayed">Delayed (देरी)</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-stone-600 mb-1">
                                Current Location (शहर / टोल प्लाजा)
                              </label>
                              <input
                                type="text"
                                value={locationUpdate}
                                onChange={(e) => setLocationUpdate(e.target.value)}
                                placeholder="e.g. Nelamangala Tollway"
                                className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg bg-white"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleUpdateShipmentStatus(shipment.id)}
                              disabled={actionInProgress === shipment.id}
                              className="py-1.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition disabled:opacity-50"
                            >
                              {actionInProgress === shipment.id ? "Saving..." : "Save Delivery Telemetry"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setUpdatingShipmentId(null)}
                              className="py-1.5 px-3 border border-stone-300 rounded-lg text-xs text-stone-700 font-semibold"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: EARNINGS & MILEAGE */}
          {activeTab === "earnings" && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-2xs space-y-6">
              <div>
                <h2 className="text-lg font-black text-stone-900">Freight Earnings & Mileage Ledger</h2>
                <p className="text-xs text-stone-500 mt-1">
                  Verified trip logs computed strictly from delivered shipments linked to your transporter account.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <div className="text-[11px] font-bold text-emerald-800 uppercase">Completed Deliveries</div>
                  <div className="text-3xl font-black text-emerald-950 mt-1">{completedDeliveries.length}</div>
                </div>
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                  <div className="text-[11px] font-bold text-amber-800 uppercase">Active Haulage Trips</div>
                  <div className="text-3xl font-black text-amber-950 mt-1">{activeDeliveries.length}</div>
                </div>
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
                  <div className="text-[11px] font-bold text-stone-600 uppercase">Settlement Mode</div>
                  <div className="text-sm font-bold text-stone-900 mt-2">Direct Bank / Escrow Release</div>
                </div>
              </div>

              {completedDeliveries.length === 0 ? (
                <div className="p-6 bg-stone-50 rounded-2xl border border-stone-100 text-center text-xs text-stone-500">
                  No completed delivery payouts yet. Complete an assigned shipment to view finalized trip statements.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-stone-200 text-stone-400 font-bold">
                        <th className="pb-2">Order ID</th>
                        <th className="pb-2">Destination</th>
                        <th className="pb-2">Payload (kg)</th>
                        <th className="pb-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {completedDeliveries.map((s) => (
                        <tr key={s.id} className="py-2.5">
                          <td className="py-2 font-mono text-stone-800">#{s.order_id?.slice(0, 8)}</td>
                          <td className="py-2 font-semibold text-stone-700">{s.destination}</td>
                          <td className="py-2 text-stone-900 font-bold">{s.total_quantity_kg?.toLocaleString()}</td>
                          <td className="py-2">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                              Settled
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: TRANSPORTER PROFILE */}
          {activeTab === "profile" && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-2xs space-y-6 max-w-xl">
              <div>
                <h2 className="text-lg font-black text-stone-900">Transporter Fleet Profile</h2>
                <p className="text-xs text-stone-500 mt-1">
                  Authoritative participant credentials registered in X-MILE database.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-stone-100">
                  <span className="text-stone-500 font-semibold">Operator Name:</span>
                  <span className="font-bold text-stone-900">{user?.fullName || "Transporter"}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-stone-100">
                  <span className="text-stone-500 font-semibold">Registered Email:</span>
                  <span className="font-bold text-stone-900">{user?.email || "N/A"}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-stone-100">
                  <span className="text-stone-500 font-semibold">Phone:</span>
                  <span className="font-bold text-stone-900">{user?.phone || "+91 98800 00000"}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-stone-100">
                  <span className="text-stone-500 font-semibold">Operational District:</span>
                  <span className="font-bold text-stone-900">{user?.district || "Tumakuru"}, {user?.state || "Karnataka"}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-stone-100">
                  <span className="text-stone-500 font-semibold">Verification Status:</span>
                  <span className="font-bold text-emerald-700">
                    {user?.isVerified ? "✓ Verified Commercial Transporter" : "Standard Operator"}
                  </span>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </RoleGuard>
  );
}
