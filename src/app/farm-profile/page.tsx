"use client";

import { useCallback, useEffect, useState } from "react";
import PlatformHeader from "@/components/PlatformHeader";
import ConnectedFarmerJourney from "@/components/ConnectedFarmerJourney";
import { PlatformDb, FarmProfile, Plot } from "@/lib/platform-db";
import { useAuth } from "@/context/AuthContext";

interface UserAddress {
  id: string;
  address_type: "RESIDENTIAL" | "FARM_GATE" | "WAREHOUSE" | "COLLECTION_POINT" | "COMMERCIAL_OFFICE" | "OTHER";
  label: string;
  is_default: boolean;
  recipient_name: string;
  phone?: string;
  address_line1: string;
  address_line2?: string;
  village_or_locality?: string;
  city_or_town: string;
  district: string;
  state: string;
  pincode: string;
  notes?: string;
}

const BENCHMARK_ADDRESSES: UserAddress[] = [
  {
    id: "addr-01",
    address_type: "FARM_GATE",
    label: "Main Farm Gate & Loading Ramp",
    is_default: true,
    recipient_name: "Rameshwar Patel",
    phone: "+91 98765 43210",
    address_line1: "Survey #42/1, North Canal Road",
    village_or_locality: "Kunigal Rural Gate",
    city_or_town: "Kunigal",
    district: "Tumakuru",
    state: "Karnataka",
    pincode: "572130",
    notes: "Suitable for 10-wheeler e-Rickshaws & light trucks.",
  },
  {
    id: "addr-02",
    address_type: "WAREHOUSE",
    label: "On-Farm Cold Storage Point",
    is_default: false,
    recipient_name: "Rameshwar Patel",
    phone: "+91 98765 43210",
    address_line1: "Plot 3 Shade Net Shed",
    village_or_locality: "Kunigal Rural Gate",
    city_or_town: "Kunigal",
    district: "Tumakuru",
    state: "Karnataka",
    pincode: "572130",
    notes: "Pre-cooling and grading dock.",
  },
];

export default function FarmProfilePage() {
  const { user: authUser, token } = useAuth();
  const [farm, setFarm] = useState<FarmProfile>(PlatformDb.getFarm());
  const user = PlatformDb.getUser();
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

  // Addresses State
  const [addresses, setAddresses] = useState<UserAddress[]>(BENCHMARK_ADDRESSES);
  const [isAddAddressOpen, setIsAddAddressOpen] = useState(false);
  const [addressNotice, setAddressNotice] = useState<string | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);

  const [addressForm, setAddressForm] = useState({
    addressType: "FARM_GATE" as UserAddress["address_type"],
    label: "Farm Gate 1",
    isDefault: false,
    recipientName: authUser?.fullName || user.name,
    phone: authUser?.phone || user.phone,
    addressLine1: "",
    addressLine2: "",
    villageOrLocality: authUser?.village || user.village,
    cityOrTown: "Kunigal",
    district: authUser?.district || user.district,
    state: authUser?.state || user.state,
    pincode: "572130",
    notes: "",
  });

  const loadFarm = useCallback(async () => {
    try {
      const res = await fetch("/api/platform/farms", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.farms) && data.farms.length > 0) {
          const f = data.farms[0];
          setFarm({
            id: f.id,
            farmerId: f.farmer_id,
            farmName: f.name,
            surveyNumber: f.survey_number || "42/1",
            totalAreaAcres: Number(f.total_area_acres),
            state: f.state,
            district: f.district,
            village: f.village || "Kunigal",
            plots: (f.plots || []).map((p: {
              id: string;
              plot_code: string;
              area_acres: number | string;
              soil_type: string;
              irrigation_source: string;
              current_crop?: string;
              crop_stage?: string;
              sowing_date?: string;
              expected_harvest_date?: string;
            }) => ({
              id: p.id,
              code: p.plot_code,
              name: p.plot_code,
              areaAcres: Number(p.area_acres),
              soilType: p.soil_type,
              irrigationSource: p.irrigation_source,
              currentCrop: p.current_crop || "Tomato",
              cropStage: p.crop_stage || "Sowing",
              sowingDate: p.sowing_date || new Date().toISOString().split("T")[0],
              expectedHarvestDate: p.expected_harvest_date || "",
            })),
          });
        }
      }
    } catch {
      // Keep initial farm state
    }
  }, [token]);

  const loadAddresses = useCallback(async () => {
    try {
      const res = await fetch("/api/platform/addresses", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.addresses) && data.addresses.length > 0) {
          setAddresses(data.addresses);
        }
      }
    } catch {
      // Graceful fallback to initial state
    }
  }, [token]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadFarm();
      loadAddresses();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadFarm, loadAddresses]);

  const handleAddPlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plotForm.code || !plotForm.name || !plotForm.currentCrop) {
      alert("Please enter plot code, name, and current crop.");
      return;
    }

    try {
      let activeFarmId = farm.id;
      // If farm not yet in DB, create it first
      if (!activeFarmId || activeFarmId.startsWith("farm-")) {
        const createFarmRes = await fetch("/api/platform/farms", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            name: farm.farmName || "Primary Family Farm",
            totalAreaAcres: plotForm.areaAcres,
            district: authUser?.district || "Tumakuru",
            state: authUser?.state || "Karnataka",
            village: authUser?.village || "Kunigal",
            surveyNumber: farm.surveyNumber || "42/1",
          }),
        });

        if (createFarmRes.ok) {
          const createData = await createFarmRes.json();
          activeFarmId = createData.farm.id;
        }
      }

      const res = await fetch("/api/platform/plots", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          farmId: activeFarmId,
          plotCode: plotForm.code,
          areaAcres: plotForm.areaAcres,
          soilType: plotForm.soilType,
          irrigationSource: plotForm.irrigationSource,
          currentCrop: plotForm.currentCrop,
          cropStage: plotForm.cropStage,
          sowingDate: plotForm.sowingDate,
          expectedHarvestDate: plotForm.expectedHarvestDate || null,
        }),
      });

      if (res.ok) {
        await loadFarm();
      } else {
        PlatformDb.addPlot(plotForm);
        setFarm(PlatformDb.getFarm());
      }
    } catch {
      PlatformDb.addPlot(plotForm);
      setFarm(PlatformDb.getFarm());
    }

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

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddressLoading(true);
    try {
      const res = await fetch("/api/platform/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addressForm),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save address.");
      }

      setAddressNotice(`✓ Address '${addressForm.label}' added successfully.`);
      setIsAddAddressOpen(false);
      await loadAddresses();
    } catch {
      // In local mode if auth or migration is pending, update local state
      const newAddr: UserAddress = {
        id: `addr-${Date.now()}`,
        address_type: addressForm.addressType,
        label: addressForm.label,
        is_default: addressForm.isDefault,
        recipient_name: addressForm.recipientName,
        phone: addressForm.phone,
        address_line1: addressForm.addressLine1,
        address_line2: addressForm.addressLine2,
        village_or_locality: addressForm.villageOrLocality,
        city_or_town: addressForm.cityOrTown,
        district: addressForm.district,
        state: addressForm.state,
        pincode: addressForm.pincode,
        notes: addressForm.notes,
      };

      setAddresses((prev) => {
        const updated = addressForm.isDefault
          ? prev.map((a) => ({ ...a, is_default: false }))
          : [...prev];
        return [newAddr, ...updated];
      });
      setAddressNotice(`✓ Address '${addressForm.label}' recorded for this session.`);
      setIsAddAddressOpen(false);
    } finally {
      setAddressLoading(false);
      setTimeout(() => setAddressNotice(null), 4000);
    }
  };

  const handleSetDefaultAddress = async (id: string) => {
    try {
      await fetch("/api/platform/addresses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isDefault: true }),
      });
    } catch {
      // Fallback
    }
    setAddresses((prev) =>
      prev.map((a) => ({
        ...a,
        is_default: a.id === id,
      }))
    );
    setAddressNotice("✓ Default address updated.");
    setTimeout(() => setAddressNotice(null), 3000);
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm("Are you sure you want to remove this address?")) return;
    try {
      await fetch(`/api/platform/addresses?id=${id}`, {
        method: "DELETE",
      });
    } catch {
      // Fallback
    }
    setAddresses((prev) => prev.filter((a) => a.id !== id));
    setAddressNotice("✓ Address removed.");
    setTimeout(() => setAddressNotice(null), 3000);
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

        {/* User Addresses Management Section */}
        <div className="mt-10 rounded-3xl border border-gray-200 bg-white p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-blue-800">
                  Logistics & Gate Points
                </span>
                <span className="text-xs text-gray-500">• User Addresses Registry</span>
              </div>
              <h2 className="text-xl font-black text-gray-900 mt-1">Saved Farm Gates & Dispatch Locations</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Manage collection gates, storage yards, and delivery addresses for seamless transport and order fulfillment.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddAddressOpen(true)}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition shrink-0"
            >
              + Add Address
            </button>
          </div>

          {addressNotice && (
            <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-bold text-emerald-950">
              {addressNotice}
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className={`rounded-2xl border p-4 transition ${
                  addr.is_default
                    ? "border-emerald-500 bg-emerald-50/30 shadow-xs ring-1 ring-emerald-500/30"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📍</span>
                    <h3 className="text-sm font-black text-gray-900">{addr.label}</h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-700">
                      {addr.address_type.replace("_", " ")}
                    </span>
                    {addr.is_default && (
                      <span className="rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white">
                        Default
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3 space-y-1 text-xs text-gray-600">
                  <p className="font-semibold text-gray-800">
                    {addr.recipient_name} {addr.phone && `• ${addr.phone}`}
                  </p>
                  <p>{addr.address_line1}</p>
                  {addr.address_line2 && <p>{addr.address_line2}</p>}
                  <p>
                    {addr.village_or_locality ? `${addr.village_or_locality}, ` : ""}
                    {addr.city_or_town}, {addr.district}, {addr.state} — {addr.pincode}
                  </p>
                  {addr.notes && <p className="text-[11px] italic text-gray-400 mt-1">{addr.notes}</p>}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                  {!addr.is_default ? (
                    <button
                      type="button"
                      onClick={() => handleSetDefaultAddress(addr.id)}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
                    >
                      ★ Set as Default
                    </button>
                  ) : (
                    <span className="text-[11px] font-bold text-emerald-800">Primary Dispatch Point</span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteAddress(addr.id)}
                    className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal: Add Address Form */}
        {isAddAddressOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 className="text-lg font-black text-gray-900">Add New Gate / Address Point</h3>
                <button
                  type="button"
                  onClick={() => setIsAddAddressOpen(false)}
                  className="rounded-lg p-1 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveAddress} className="mt-4 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Address Label</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. North Gate Ramp"
                      value={addressForm.label}
                      onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Location Type</label>
                    <select
                      value={addressForm.addressType}
                      onChange={(e) => setAddressForm({ ...addressForm, addressType: e.target.value as UserAddress["address_type"] })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="FARM_GATE">Farm Gate</option>
                      <option value="WAREHOUSE">Warehouse / Shed</option>
                      <option value="COLLECTION_POINT">Collection Point</option>
                      <option value="RESIDENTIAL">Residential</option>
                      <option value="COMMERCIAL_OFFICE">Office</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Contact Name</label>
                    <input
                      type="text"
                      required
                      value={addressForm.recipientName}
                      onChange={(e) => setAddressForm({ ...addressForm, recipientName: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Phone Number</label>
                    <input
                      type="text"
                      required
                      value={addressForm.phone}
                      onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Address Line 1</label>
                  <input
                    type="text"
                    required
                    placeholder="Street, Survey Number, Land Plot"
                    value={addressForm.addressLine1}
                    onChange={(e) => setAddressForm({ ...addressForm, addressLine1: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Village / Locality</label>
                    <input
                      type="text"
                      value={addressForm.villageOrLocality}
                      onChange={(e) => setAddressForm({ ...addressForm, villageOrLocality: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">City / Town</label>
                    <input
                      type="text"
                      required
                      value={addressForm.cityOrTown}
                      onChange={(e) => setAddressForm({ ...addressForm, cityOrTown: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">District</label>
                    <input
                      type="text"
                      required
                      value={addressForm.district}
                      onChange={(e) => setAddressForm({ ...addressForm, district: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">State</label>
                    <input
                      type="text"
                      required
                      value={addressForm.state}
                      onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Pincode</label>
                    <input
                      type="text"
                      required
                      value={addressForm.pincode}
                      onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isDefaultAddr"
                    checked={addressForm.isDefault}
                    onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="isDefaultAddr" className="text-xs font-bold text-gray-700 cursor-pointer">
                    Set as default primary dispatch/receipt address
                  </label>
                </div>

                <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsAddAddressOpen(false)}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addressLoading}
                    className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {addressLoading ? "Saving..." : "Save Address"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

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
                      onChange={(e) => setPlotForm({ ...plotForm, soilType: e.target.value as Plot["soilType"] })}
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
                      onChange={(e) => setPlotForm({ ...plotForm, irrigationSource: e.target.value as Plot["irrigationSource"] })}
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
