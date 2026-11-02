"use client";

import { useEffect, useState, useCallback } from "react";
import PlatformHeader from "@/components/PlatformHeader";
import RoleGuard from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";

interface ProduceListing {
  id: string;
  farmer_id: string;
  crop_name: string;
  variety?: string | null;
  category?: string;
  quantity_kg: number;
  quality_grade: string;
  asking_price_per_kg: number;
  pickup_location: string;
  district: string;
  state: string;
  status: string;
  created_at: string;
  farmer_profiles?: {
    full_name?: string;
    is_verified?: boolean;
  } | null;
}

interface BuyerOffer {
  id: string;
  listing_id: string;
  buyer_id: string;
  offered_price_per_kg: number | string;
  offered_quantity_kg: number | string;
  destination_city: string;
  payment_terms: string;
  status: string;
  created_at: string;
  produce_listings?: {
    crop_name?: string;
    variety?: string | null;
    asking_price_per_kg?: number;
    district?: string;
  } | null;
}

interface BuyerOrder {
  id: string;
  buyer_id?: string | null;
  buyer_name: string;
  produce: string;
  requested_quantity_kg: number;
  required_grade: string;
  destination: string;
  fulfilled_quantity_kg: number;
  fulfillment_percentage: number;
  status: "Accepted" | "Dispatched" | "Delivered" | "Cancelled" | string;
  created_at: string;
  updated_at: string;
}

interface BuyerShipment {
  id: string;
  order_id: string;
  origin?: string | null;
  destination: string;
  total_quantity_kg: number;
  status: "PREPARING" | "DISPATCHED" | "IN_TRANSIT" | "DELIVERED" | string;
  current_location?: string | null;
  progress_percentage?: number;
  created_at: string;
  updated_at?: string;
}

type BuyerTab =
  | "overview"
  | "find-produce"
  | "my-offers"
  | "my-orders"
  | "deliveries"
  | "payments"
  | "profile";

export default function BuyerPage() {
  const { user, token, logout, refreshProfile } = useAuth();

  const [activeTab, setActiveTab] = useState<BuyerTab>("overview");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Data states
  const [listings, setListings] = useState<ProduceListing[]>([]);
  const [offers, setOffers] = useState<BuyerOffer[]>([]);
  const [orders, setOrders] = useState<BuyerOrder[]>([]);
  const [shipments, setShipments] = useState<BuyerShipment[]>([]);

  // Search & Filter state for Find Produce
  const [searchCrop, setSearchCrop] = useState("");
  const [filterGrade, setFilterGrade] = useState("ALL");
  const [filterDistrict, setFilterDistrict] = useState("ALL");

  // Offer Modal State
  const [selectedListing, setSelectedListing] = useState<ProduceListing | null>(null);
  const [offerQty, setOfferQty] = useState("");
  const [offerPrice, setOfferPrice] = useState("");
  const [offerDestination, setOfferDestination] = useState("Bengaluru Mandi Hub");
  const [offerPaymentTerms, setOfferPaymentTerms] = useState("ESCROW");
  const [submittingOffer, setSubmittingOffer] = useState(false);

  // Profile Form State
  const [editFullName, setEditFullName] = useState(user?.fullName || "");
  const [editPhone, setEditPhone] = useState(user?.phone || "");
  const [editDistrict, setEditDistrict] = useState(user?.district || "Tumakuru");
  const [editState, setEditState] = useState(user?.state || "Karnataka");
  const [savingProfile, setSavingProfile] = useState(false);

  // Sync profile form when user context changes
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active && user) {
        setEditFullName(user.fullName || "");
        setEditPhone(user.phone || "");
        setEditDistrict(user.district || "Tumakuru");
        setEditState(user.state || "Karnataka");
      }
    });
    return () => {
      active = false;
    };
  }, [user]);

  // Load all buyer data from real database APIs
  const loadBuyerData = useCallback(async () => {
    if (!token) return;
    setLoading(true);

    try {
      const headers = { Authorization: `Bearer ${token}` };

      // 1. Live produce listings from marketplace
      const listRes = await fetch("/api/platform/marketplace", { headers });
      if (listRes.ok) {
        const listData = await listRes.json();
        if (listData.success && Array.isArray(listData.listings)) {
          setListings(listData.listings);
        }
      }

      // 2. Buyer offers
      const offersRes = await fetch("/api/platform/marketplace/offers?viewAs=buyer", { headers });
      if (offersRes.ok) {
        const offersData = await offersRes.json();
        if (offersData.success && Array.isArray(offersData.offers)) {
          setOffers(offersData.offers);
        }
      }

      // 3. Buyer orders
      const ordersRes = await fetch("/api/orders", { headers });
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        if (ordersData.success && Array.isArray(ordersData.orders)) {
          setOrders(ordersData.orders);
        }
      }

      // 4. Buyer shipments
      const shipmentsRes = await fetch("/api/shipments", { headers });
      if (shipmentsRes.ok) {
        const shipmentsData = await shipmentsRes.json();
        if (shipmentsData.success && Array.isArray(shipmentsData.shipments)) {
          setShipments(shipmentsData.shipments);
        }
      }
    } catch (err) {
      console.warn("Failed to load buyer portal data:", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active && token) {
        loadBuyerData();
      }
    });
    return () => {
      active = false;
    };
  }, [token, loadBuyerData]);

  // Handler: Open Offer Modal
  const openOfferModal = (listing: ProduceListing) => {
    setSelectedListing(listing);
    setOfferQty(String(listing.quantity_kg || 1000));
    setOfferPrice(String(listing.asking_price_per_kg || 25));
    setFeedback(null);
  };

  // Handler: Submit Purchase Offer
  const handleSubmitOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedListing || !token) return;

    const qty = Number(offerQty);
    const price = Number(offerPrice);

    if (qty <= 0 || isNaN(qty)) {
      setFeedback({ type: "error", text: "Please enter a valid procurement quantity (kg)." });
      return;
    }
    if (price <= 0 || isNaN(price)) {
      setFeedback({ type: "error", text: "Please enter a valid offer price per kg (₹)." });
      return;
    }

    setSubmittingOffer(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/platform/marketplace/offers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          listingId: selectedListing.id,
          offeredQuantityKg: qty,
          offeredPricePerKg: price,
          destinationCity: offerDestination.trim(),
          paymentTerms: offerPaymentTerms,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setFeedback({ type: "error", text: data.error || "Failed to submit offer to farmer." });
      } else {
        setFeedback({
          type: "success",
          text: `Offer of ₹${(qty * price).toLocaleString("en-IN")} submitted successfully for ${selectedListing.crop_name}!`,
        });
        setSelectedListing(null);
        await loadBuyerData();
        setActiveTab("my-offers");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error while submitting offer.";
      setFeedback({ type: "error", text: msg });
    } finally {
      setSubmittingOffer(false);
    }
  };

  // Handler: Cancel Offer
  const handleCancelOffer = async (offerId: string) => {
    if (!token) return;
    if (!window.confirm("Are you sure you want to cancel this procurement offer?")) return;

    try {
      const res = await fetch("/api/platform/marketplace/offers", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          offerId,
          action: "CANCEL",
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ type: "info", text: "Procurement offer has been cancelled." });
        await loadBuyerData();
      } else {
        setFeedback({ type: "error", text: data.error || "Failed to cancel offer." });
      }
    } catch {
      setFeedback({ type: "error", text: "Network error while cancelling offer." });
    }
  };

  // Handler: Update Buyer Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setSavingProfile(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: editFullName.trim(),
          phone: editPhone.trim() || undefined,
          district: editDistrict.trim(),
          state: editState.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ type: "success", text: "Buyer organization profile updated successfully!" });
        await refreshProfile();
      } else {
        setFeedback({ type: "error", text: data.error || "Failed to update profile." });
      }
    } catch {
      setFeedback({ type: "error", text: "Network error while saving profile." });
    } finally {
      setSavingProfile(false);
    }
  };

  // Filter listings
  const filteredListings = listings.filter((l) => {
    if (searchCrop && !l.crop_name.toLowerCase().includes(searchCrop.toLowerCase())) {
      return false;
    }
    if (filterGrade !== "ALL" && l.quality_grade !== filterGrade) {
      return false;
    }
    if (filterDistrict !== "ALL" && l.district !== filterDistrict) {
      return false;
    }
    return true;
  });

  const availableDistricts = Array.from(new Set(listings.map((l) => l.district).filter(Boolean)));

  // Derived financial metrics
  const activeOffersCount = offers.filter((o) => o.status === "PENDING").length;
  const inTransitCount = shipments.filter((s) => s.status === "IN_TRANSIT" || s.status === "DISPATCHED").length;
  const deliveredOrdersCount = orders.filter((o) => o.status === "Delivered").length;
  const totalVolumeProcuredKg = orders
    .filter((o) => o.status !== "Cancelled")
    .reduce((sum, o) => sum + Number(o.fulfilled_quantity_kg || o.requested_quantity_kg || 0), 0);

  return (
    <RoleGuard allowedRoles={["BUYER", "ADMIN"]} portalName="Commercial Buyer Hub">
      <div className="min-h-screen bg-[#f7f8f5] flex flex-col">
        <PlatformHeader />

        {/* Commercial Buyer Portal Navigation */}
        <header className="sticky top-0 z-30 border-b border-black/5 bg-white/95 backdrop-blur-md px-4 sm:px-8 py-3">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-[#172019] text-white flex items-center justify-center text-xl shadow-xs">
                🛒
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-black tracking-tight text-stone-900">
                    Commercial Buyer Hub
                  </h1>
                  <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[10px] font-bold">
                    ✓ Verified Enterprise
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 font-medium">
                  {user?.fullName || "Commercial Buyer"} • Direct Farm-Gate Procurement
                </p>
              </div>
            </div>

            {/* Portal Tabs */}
            <nav className="flex items-center gap-1 overflow-x-auto py-1 max-w-full">
              {[
                { id: "overview", label: "Overview", icon: "📊" },
                { id: "find-produce", label: "Find Produce", icon: "🌾" },
                { id: "my-offers", label: "My Offers", icon: "💬", badge: activeOffersCount },
                { id: "my-orders", label: "My Orders", icon: "📦", badge: orders.length },
                { id: "deliveries", label: "Deliveries", icon: "🚚", badge: inTransitCount },
                { id: "payments", label: "Payments", icon: "💳" },
                { id: "profile", label: "Profile", icon: "🏢" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as BuyerTab);
                    setFeedback(null);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                    activeTab === tab.id
                      ? "bg-[#172019] text-white shadow-xs"
                      : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  {Boolean(tab.badge && tab.badge > 0) && (
                    <span
                      className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                        activeTab === tab.id ? "bg-emerald-500 text-white" : "bg-emerald-100 text-emerald-900"
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Feedback Notice Banner */}
          {feedback && (
            <div
              className={`rounded-2xl p-4 text-xs font-semibold border flex items-center justify-between gap-3 ${
                feedback.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : feedback.type === "error"
                  ? "bg-red-50 border-red-200 text-red-900"
                  : "bg-blue-50 border-blue-200 text-blue-900"
              }`}
            >
              <div className="flex items-center gap-2">
                <span>{feedback.type === "success" ? "✓" : feedback.type === "error" ? "⚠️" : "ℹ️"}</span>
                <span>{feedback.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="text-stone-400 hover:text-stone-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 1: OVERVIEW */}
          {/* ======================================================== */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Metric KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-2xs">
                  <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                    Active Offers
                  </div>
                  <div className="mt-2 text-2xl sm:text-3xl font-black text-stone-900">
                    {activeOffersCount}
                  </div>
                  <div className="mt-1 text-[11px] text-amber-700 font-semibold">
                    Awaiting farmer response
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-2xs">
                  <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                    Confirmed Orders
                  </div>
                  <div className="mt-2 text-2xl sm:text-3xl font-black text-stone-900">
                    {orders.length}
                  </div>
                  <div className="mt-1 text-[11px] text-emerald-700 font-semibold">
                    Direct farm commitments
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-2xs">
                  <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                    In-Transit Freight
                  </div>
                  <div className="mt-2 text-2xl sm:text-3xl font-black text-stone-900">
                    {inTransitCount}
                  </div>
                  <div className="mt-1 text-[11px] text-blue-700 font-semibold">
                    En route to warehouse
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-2xs">
                  <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                    Procured Volume
                  </div>
                  <div className="mt-2 text-2xl sm:text-3xl font-black text-stone-900">
                    {totalVolumeProcuredKg.toLocaleString("en-IN")} <span className="text-xs font-normal text-stone-500">kg</span>
                  </div>
                  <div className="mt-1 text-[11px] text-purple-700 font-semibold">
                    {deliveredOrdersCount} delivered shipments
                  </div>
                </div>
              </div>

              {/* Quick Actions & Recent Procurements */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-stone-200 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-black text-stone-900 uppercase tracking-wider">
                      Recent Purchase Orders
                    </h2>
                    <button
                      onClick={() => setActiveTab("my-orders")}
                      className="text-xs font-bold text-emerald-700 hover:underline"
                    >
                      View All Orders →
                    </button>
                  </div>

                  {orders.length === 0 ? (
                    <div className="py-12 text-center text-stone-400 text-xs">
                      No purchase orders yet. Start by discovering farm produce listings below.
                    </div>
                  ) : (
                    <div className="divide-y divide-stone-100">
                      {orders.slice(0, 5).map((order) => (
                        <div key={order.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                          <div>
                            <div className="font-bold text-stone-900">{order.produce}</div>
                            <div className="text-stone-500 text-[11px]">
                              {order.requested_quantity_kg.toLocaleString("en-IN")} kg • Grade {order.required_grade} • {order.destination}
                            </div>
                          </div>
                          <div className="text-right">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                                order.status === "Delivered"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : order.status === "Dispatched"
                                  ? "bg-blue-100 text-blue-800"
                                  : order.status === "Cancelled"
                                  ? "bg-stone-100 text-stone-700"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {order.status}
                            </span>
                            <div className="text-[10px] text-stone-400 mt-1">
                              {new Date(order.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Procurement Guidance & Quick Actions */}
                <div className="bg-gradient-to-br from-[#172019] to-[#263529] text-white rounded-3xl p-6 shadow-md flex flex-col justify-between space-y-6">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                      Procurement Direct
                    </span>
                    <h3 className="text-lg font-black mt-1">
                      Direct Farm-Gate Produce
                    </h3>
                    <p className="text-xs text-stone-300 mt-2 leading-relaxed">
                      All produce listings are backed by verified farmers, standardized quality grades, and transparent weighbridge integration.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={() => setActiveTab("find-produce")}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black text-xs transition text-center shadow-xs"
                    >
                      Browse Farm Listings →
                    </button>
                    <button
                      onClick={() => setActiveTab("my-offers")}
                      className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition text-center"
                    >
                      Manage Submitted Offers
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: FIND PRODUCE */}
          {/* ======================================================== */}
          {activeTab === "find-produce" && (
            <div className="space-y-6">
              {/* Search & Filter Bar */}
              <div className="bg-white rounded-3xl p-4 sm:p-6 border border-stone-200 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="Search produce (e.g. Tomato, Onion, Wheat)..."
                      value={searchCrop}
                      onChange={(e) => setSearchCrop(e.target.value)}
                      className="w-full rounded-2xl border border-stone-200 bg-stone-50/50 px-4 py-2.5 text-xs text-stone-900 focus:border-emerald-600 focus:bg-white focus:outline-none transition"
                    />
                  </div>

                  <div className="flex gap-2">
                    <select
                      value={filterGrade}
                      onChange={(e) => setFilterGrade(e.target.value)}
                      className="rounded-2xl border border-stone-200 bg-stone-50/50 px-3 py-2 text-xs font-bold text-stone-700 focus:border-emerald-600 focus:outline-none"
                    >
                      <option value="ALL">All Grades</option>
                      <option value="A">Grade A (Premium)</option>
                      <option value="B">Grade B (Standard)</option>
                      <option value="C">Grade C (Processing)</option>
                    </select>

                    <select
                      value={filterDistrict}
                      onChange={(e) => setFilterDistrict(e.target.value)}
                      className="rounded-2xl border border-stone-200 bg-stone-50/50 px-3 py-2 text-xs font-bold text-stone-700 focus:border-emerald-600 focus:outline-none"
                    >
                      <option value="ALL">All Districts</option>
                      {availableDistricts.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>

                    <button
                      onClick={loadBuyerData}
                      disabled={loading}
                      className="px-3 py-2 rounded-2xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-bold transition"
                    >
                      {loading ? "..." : "🔄 Refresh"}
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-stone-500 font-medium">
                  Showing {filteredListings.length} active farm-gate listings available for commercial purchase
                </div>
              </div>

              {/* Produce Listings Grid */}
              {filteredListings.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 shadow-2xs space-y-2">
                  <div className="text-3xl">🌾</div>
                  <h3 className="text-sm font-black text-stone-900">No matching produce listings</h3>
                  <p className="text-xs text-stone-500 max-w-sm mx-auto">
                    Try adjusting your crop search or district filters, or check back shortly as farmers post fresh harvests.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {filteredListings.map((listing) => (
                    <div
                      key={listing.id}
                      className="bg-white rounded-3xl p-5 border border-stone-200 hover:border-emerald-400 transition shadow-2xs hover:shadow-xs flex flex-col justify-between space-y-4"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="text-base font-black text-stone-900 tracking-tight">
                              {listing.crop_name}
                            </h3>
                            {listing.variety && (
                              <div className="text-[11px] text-stone-500 font-medium">
                                Variety: {listing.variety}
                              </div>
                            )}
                          </div>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                              listing.quality_grade === "A"
                                ? "bg-emerald-100 text-emerald-800"
                                : listing.quality_grade === "B"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            Grade {listing.quality_grade}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2 bg-stone-50 rounded-2xl p-3 border border-stone-100 text-xs">
                          <div>
                            <span className="text-[10px] text-stone-400 uppercase font-bold block">
                              Available Volume
                            </span>
                            <span className="font-black text-stone-900">
                              {listing.quantity_kg.toLocaleString("en-IN")} kg
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-stone-400 uppercase font-bold block">
                              Asking Price
                            </span>
                            <span className="font-black text-emerald-700">
                              ₹{listing.asking_price_per_kg} / kg
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-stone-500">
                          <span>📍</span>
                          <span className="font-medium truncate">
                            {listing.pickup_location || `${listing.district}, ${listing.state}`}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => openOfferModal(listing)}
                        className="w-full py-2.5 rounded-xl bg-[#172019] hover:bg-black text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-1"
                      >
                        <span>Make Purchase Offer</span>
                        <span>→</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: MY OFFERS */}
          {/* ======================================================== */}
          {activeTab === "my-offers" && (
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                <div>
                  <h2 className="text-base font-black text-stone-900">My Procurement Offers</h2>
                  <p className="text-xs text-stone-500">
                    Real-time status of submitted commercial offers and contracts with farm producers.
                  </p>
                </div>
                <button
                  onClick={loadBuyerData}
                  className="px-3 py-1.5 rounded-xl border border-stone-200 text-xs font-bold text-stone-700 hover:bg-stone-50"
                >
                  Refresh
                </button>
              </div>

              {offers.length === 0 ? (
                <div className="py-12 text-center text-stone-400 text-xs">
                  No active or past procurement offers. Browse listings in &quot;Find Produce&quot; to make an offer.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-stone-200 text-stone-400 uppercase text-[10px] font-black">
                        <th className="py-3 px-2">Crop</th>
                        <th className="py-3 px-2">Offered Volume</th>
                        <th className="py-3 px-2">Offer Rate</th>
                        <th className="py-3 px-2">Total Value</th>
                        <th className="py-3 px-2">Destination</th>
                        <th className="py-3 px-2">Status</th>
                        <th className="py-3 px-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {offers.map((offer) => {
                        const qty = Number(offer.offered_quantity_kg) || 0;
                        const rate = Number(offer.offered_price_per_kg) || 0;
                        const total = qty * rate;

                        return (
                          <tr key={offer.id} className="hover:bg-stone-50/50">
                            <td className="py-3 px-2 font-bold text-stone-900">
                              {offer.produce_listings?.crop_name || "Farm Produce"}
                            </td>
                            <td className="py-3 px-2 text-stone-700 font-semibold">
                              {qty.toLocaleString("en-IN")} kg
                            </td>
                            <td className="py-3 px-2 text-emerald-700 font-bold">
                              ₹{rate} / kg
                            </td>
                            <td className="py-3 px-2 font-black text-stone-900">
                              ₹{total.toLocaleString("en-IN")}
                            </td>
                            <td className="py-3 px-2 text-stone-600">
                              {offer.destination_city || "Mandi"}
                            </td>
                            <td className="py-3 px-2">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                                  offer.status === "ACCEPTED"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : offer.status === "REJECTED"
                                    ? "bg-red-100 text-red-800"
                                    : offer.status === "CANCELLED"
                                    ? "bg-stone-100 text-stone-600"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {offer.status}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-right">
                              {offer.status === "PENDING" && (
                                <button
                                  onClick={() => handleCancelOffer(offer.id)}
                                  className="px-2.5 py-1 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-[11px] font-bold"
                                >
                                  Cancel Offer
                                </button>
                              )}
                              {offer.status === "ACCEPTED" && (
                                <button
                                  onClick={() => setActiveTab("my-orders")}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-[11px] font-bold"
                                >
                                  View Order →
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: MY ORDERS */}
          {/* ======================================================== */}
          {activeTab === "my-orders" && (
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                <div>
                  <h2 className="text-base font-black text-stone-900">Commercial Purchase Orders</h2>
                  <p className="text-xs text-stone-500">
                    Confirmed procurement commitments created upon farmer acceptance of buyer offers.
                  </p>
                </div>
                <button
                  onClick={loadBuyerData}
                  className="px-3 py-1.5 rounded-xl border border-stone-200 text-xs font-bold text-stone-700 hover:bg-stone-50"
                >
                  Refresh
                </button>
              </div>

              {orders.length === 0 ? (
                <div className="py-12 text-center text-stone-400 text-xs">
                  No confirmed purchase orders yet. Once a farmer accepts your offer, the confirmed order appears here.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="rounded-2xl border border-stone-200 p-4 sm:p-5 hover:border-emerald-400 transition bg-white"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
                        <div>
                          <div className="text-[10px] font-mono text-stone-400">ORDER #{order.id.slice(0, 8)}</div>
                          <h3 className="text-base font-black text-stone-900 mt-0.5">{order.produce}</h3>
                        </div>
                        <span
                          className={`self-start sm:self-auto px-3 py-1 rounded-full text-xs font-black ${
                            order.status === "Delivered"
                              ? "bg-emerald-100 text-emerald-800"
                              : order.status === "Dispatched"
                              ? "bg-blue-100 text-blue-800"
                              : order.status === "Cancelled"
                              ? "bg-stone-100 text-stone-600"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-[10px] text-stone-400 uppercase font-bold block">Quantity</span>
                          <span className="font-bold text-stone-900">{order.requested_quantity_kg.toLocaleString("en-IN")} kg</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-stone-400 uppercase font-bold block">Grade</span>
                          <span className="font-bold text-stone-900">Grade {order.required_grade}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-stone-400 uppercase font-bold block">Destination</span>
                          <span className="font-bold text-stone-900 truncate block">{order.destination}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-stone-400 uppercase font-bold block">Fulfillment</span>
                          <span className="font-bold text-emerald-700">{order.fulfillment_percentage || 100}%</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400">
                        <span>Created on {new Date(order.created_at).toLocaleString()}</span>
                        <button
                          onClick={() => setActiveTab("deliveries")}
                          className="font-bold text-emerald-700 hover:underline"
                        >
                          Track Shipment Telemetry →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 5: DELIVERIES & SHIPMENTS */}
          {/* ======================================================== */}
          {activeTab === "deliveries" && (
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                <div>
                  <h2 className="text-base font-black text-stone-900">Freight & Delivery Telemetry</h2>
                  <p className="text-xs text-stone-500">
                    Live logistics status of assigned transporters moving produce from farm gate to your destination.
                  </p>
                </div>
                <button
                  onClick={loadBuyerData}
                  className="px-3 py-1.5 rounded-xl border border-stone-200 text-xs font-bold text-stone-700 hover:bg-stone-50"
                >
                  Refresh
                </button>
              </div>

              {shipments.length === 0 ? (
                <div className="py-12 text-center text-stone-400 text-xs">
                  No active shipments linked to your orders. Once an order is accepted by a transporter, haulage updates stream here.
                </div>
              ) : (
                <div className="space-y-4">
                  {shipments.map((shipment) => {
                    const isDelivered = shipment.status === "DELIVERED";
                    const isInTransit = shipment.status === "IN_TRANSIT";

                    return (
                      <div
                        key={shipment.id}
                        className="rounded-2xl border border-stone-200 p-5 bg-stone-50/50 space-y-4"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-mono text-stone-400">SHIPMENT #{shipment.id.slice(0, 8)}</span>
                            <div className="text-xs font-bold text-stone-900 mt-0.5">
                              {shipment.origin || "Farm Gate Hub"} → {shipment.destination}
                            </div>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-black ${
                              isDelivered
                                ? "bg-emerald-100 text-emerald-800"
                                : isInTransit
                                ? "bg-blue-100 text-blue-800 animate-pulse"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {shipment.status}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div>
                          <div className="flex justify-between text-[11px] font-bold text-stone-500 mb-1">
                            <span>Farm Pickup</span>
                            <span>Highway Transit</span>
                            <span>Destination Mandi</span>
                          </div>
                          <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                              style={{
                                width: isDelivered ? "100%" : isInTransit ? "60%" : "20%",
                              }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-stone-600 pt-2 border-t border-stone-200">
                          <div>Volume: <strong className="text-stone-900">{shipment.total_quantity_kg.toLocaleString("en-IN")} kg</strong></div>
                          {shipment.current_location && (
                            <div>Current Location: <strong className="text-stone-900">{shipment.current_location}</strong></div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 6: PAYMENTS & ESCROW */}
          {/* ======================================================== */}
          {activeTab === "payments" && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-2xs space-y-4">
                <div>
                  <h2 className="text-base font-black text-stone-900">Procurement Escrow & Payments</h2>
                  <p className="text-xs text-stone-500">
                    Funds are secured upon order confirmation and disbursed to farmers only upon verified weighbridge delivery.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                    <span className="text-[10px] uppercase font-bold text-emerald-800 block">Funds in Escrow</span>
                    <span className="text-2xl font-black text-emerald-950 mt-1 block">
                      ₹{orders
                        .filter((o) => o.status === "Accepted" || o.status === "Dispatched")
                        .reduce((sum, o) => sum + (o.requested_quantity_kg * 25), 0)
                        .toLocaleString("en-IN")}
                    </span>
                    <span className="text-[11px] text-emerald-700 font-medium">Locked pending final delivery</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200">
                    <span className="text-[10px] uppercase font-bold text-blue-800 block">Settled Disbursed</span>
                    <span className="text-2xl font-black text-blue-950 mt-1 block">
                      ₹{orders
                        .filter((o) => o.status === "Delivered")
                        .reduce((sum, o) => sum + (o.requested_quantity_kg * 25), 0)
                        .toLocaleString("en-IN")}
                    </span>
                    <span className="text-[11px] text-blue-700 font-medium">Released to farm accounts</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
                    <span className="text-[10px] uppercase font-bold text-stone-500 block">Platform Fee Tariff</span>
                    <span className="text-2xl font-black text-stone-900 mt-1 block">0%</span>
                    <span className="text-[11px] text-stone-500 font-medium">Direct farm-gate zero margin</span>
                  </div>
                </div>
              </div>

              {/* Escrow Orders Ledger */}
              <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-2xs space-y-4">
                <h3 className="text-sm font-black text-stone-900 uppercase tracking-wider">
                  Order Payment Status Ledger
                </h3>

                {orders.length === 0 ? (
                  <div className="py-8 text-center text-stone-400 text-xs">
                    No payment records yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-stone-200 text-stone-400 uppercase text-[10px] font-black">
                          <th className="py-2.5 px-2">Order ID</th>
                          <th className="py-2.5 px-2">Produce</th>
                          <th className="py-2.5 px-2">Volume</th>
                          <th className="py-2.5 px-2">Escrow Status</th>
                          <th className="py-2.5 px-2 text-right">Settlement Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {orders.map((o) => (
                          <tr key={o.id}>
                            <td className="py-3 px-2 font-mono text-stone-500">{o.id.slice(0, 8)}</td>
                            <td className="py-3 px-2 font-bold text-stone-900">{o.produce}</td>
                            <td className="py-3 px-2">{o.requested_quantity_kg.toLocaleString("en-IN")} kg</td>
                            <td className="py-3 px-2">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  o.status === "Delivered"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : o.status === "Cancelled"
                                    ? "bg-stone-100 text-stone-600"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {o.status === "Delivered" ? "Disbursed to Farmer" : o.status === "Cancelled" ? "Refunded" : "Secured in Escrow"}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-right text-stone-400 font-mono text-[11px]">
                              {o.status === "Delivered" ? "Settled" : "Auto-release on delivery"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 7: PROFILE */}
          {/* ======================================================== */}
          {activeTab === "profile" && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-2xs space-y-6 max-w-2xl">
              <div>
                <h2 className="text-lg font-black text-stone-900">Commercial Buyer Profile</h2>
                <p className="text-xs text-stone-500 mt-1">
                  Verified organization details and operational mandi hubs.
                </p>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Company / Trade Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-xs text-stone-900 focus:border-emerald-600 focus:bg-white focus:outline-none transition"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Business Phone Number
                    </label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-xs text-stone-900 focus:border-emerald-600 focus:bg-white focus:outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Registered Email
                    </label>
                    <input
                      type="email"
                      disabled
                      value={user?.email || ""}
                      className="w-full rounded-xl border border-stone-200 bg-stone-100 px-3.5 py-2.5 text-xs text-stone-500 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Operating District
                    </label>
                    <input
                      type="text"
                      value={editDistrict}
                      onChange={(e) => setEditDistrict(e.target.value)}
                      className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-xs text-stone-900 focus:border-emerald-600 focus:bg-white focus:outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      State
                    </label>
                    <input
                      type="text"
                      value={editState}
                      onChange={(e) => setEditState(e.target.value)}
                      className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-xs text-stone-900 focus:border-emerald-600 focus:bg-white focus:outline-none transition"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-stone-100">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-5 py-2.5 rounded-xl bg-[#172019] text-white text-xs font-black hover:bg-black transition shadow-xs disabled:opacity-50"
                  >
                    {savingProfile ? "Saving Profile..." : "Update Profile"}
                  </button>

                  <button
                    type="button"
                    onClick={() => logout()}
                    className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-700 text-xs font-bold hover:bg-stone-50 transition"
                  >
                    Sign Out
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>

        {/* Modal: Make Purchase Offer */}
        {selectedListing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-stone-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-start justify-between border-b border-stone-100 pb-3">
                <div>
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                    Submit Binding Offer
                  </span>
                  <h3 className="text-lg font-black text-stone-900 mt-0.5">
                    {selectedListing.crop_name}
                  </h3>
                  <div className="text-xs text-stone-500">
                    Grade {selectedListing.quality_grade} • Available: {selectedListing.quantity_kg.toLocaleString("en-IN")} kg
                  </div>
                </div>
                <button
                  onClick={() => setSelectedListing(null)}
                  className="h-8 w-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold flex items-center justify-center text-sm"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmitOffer} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Procure Volume (kg)
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={selectedListing.quantity_kg}
                      value={offerQty}
                      onChange={(e) => setOfferQty(e.target.value)}
                      className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3 py-2 text-xs text-stone-900 focus:border-emerald-600 focus:bg-white focus:outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Offered Price (₹/kg)
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      step="0.5"
                      value={offerPrice}
                      onChange={(e) => setOfferPrice(e.target.value)}
                      className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3 py-2 text-xs text-stone-900 focus:border-emerald-600 focus:bg-white focus:outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Destination Mandi / Delivery Hub
                  </label>
                  <input
                    type="text"
                    required
                    value={offerDestination}
                    onChange={(e) => setOfferDestination(e.target.value)}
                    placeholder="e.g. Bengaluru Yeshwanthpur APMC"
                    className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3 py-2 text-xs text-stone-900 focus:border-emerald-600 focus:bg-white focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Settlement Terms
                  </label>
                  <select
                    value={offerPaymentTerms}
                    onChange={(e) => setOfferPaymentTerms(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3 py-2 text-xs font-bold text-stone-700 focus:border-emerald-600 focus:outline-none"
                  >
                    <option value="ESCROW">Secured Escrow (Funds locked on accept)</option>
                    <option value="NET_15">Net 15 Direct Mandi Wire</option>
                    <option value="CASH_ON_DELIVERY">Cash on Weighbridge Verification</option>
                  </select>
                </div>

                {/* Total Calculation Display */}
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex justify-between items-center text-xs">
                  <span className="font-bold text-emerald-900">Total Purchase Commitment:</span>
                  <span className="text-base font-black text-emerald-950">
                    ₹{((Number(offerQty) || 0) * (Number(offerPrice) || 0)).toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedListing(null)}
                    className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-700 text-xs font-bold hover:bg-stone-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingOffer}
                    className="px-6 py-2.5 rounded-xl bg-[#172019] hover:bg-black text-white text-xs font-black shadow-md transition disabled:opacity-50"
                  >
                    {submittingOffer ? "Submitting Offer..." : "Transmit Binding Offer →"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
