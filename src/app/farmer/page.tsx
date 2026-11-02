"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { addInventoryItem, getInventory } from "@/lib/inventory";
import type { Farmer } from "@/lib/aggregation";
import { useLanguage } from "@/i18n/LanguageContext";
import PlatformHeader from "@/components/PlatformHeader";
import ConnectedFarmerJourney from "@/components/ConnectedFarmerJourney";
import { useAuth } from "@/context/AuthContext";

type QualityResult = {
  grade: "A" | "B" | "C";
  score: number;
  confidence: number;
  observations: string[];
  visibleDefects: string[];
  suitability: "High" | "Medium" | "Low";
};

type OrderStatus =
  | "Accepted"
  | "Dispatched"
  | "Delivered"
  | "Disputed";

interface FarmerOrderItemRow {
  id: string;
  quantity_kg: number;
  inventory_id: string;
  orders: {
    id: string;
    buyer_name: string;
    produce: string;
    requested_quantity_kg: number;
    required_grade: string;
    destination: string;
    fulfilled_quantity_kg: number;
    fulfillment_percentage: number;
    status: OrderStatus;
    created_at: string;
  } | null;
  inventory?: {
    id: string;
    produce: string;
    quantity_kg: number;
    quality_grade: string;
    status: string;
    reserved_quantity_kg?: number | null;
  } | null;
}

export interface LiveMarketListing {
  id: string;
  crop_name: string;
  variety: string | null;
  quantity_kg: number;
  quality_grade: string;
  asking_price_per_kg: number;
  harvest_date: string;
  pickup_location: string;
  status: string;
  images: string[];
}

export interface LiveMarketOffer {
  id: string;
  listing_id: string;
  buyer_id: string;
  offered_price_per_kg: number;
  offered_quantity_kg: number;
  destination_city: string;
  payment_terms: string;
  status: string;
  created_at: string;
  produce_listings?: {
    crop_name: string;
    asking_price_per_kg: number;
  } | null;
  buyer_profiles?: {
    full_name: string;
    district: string;
  } | null;
}

export interface LiveFarmSummary {
  id: string;
  name: string;
  total_area_acres: number;
  district: string;
  plots?: Array<{
    id: string;
    plot_code: string;
    area_acres: number;
    current_crop: string;
    crop_stage: string;
  }>;
}

type FarmerIncomingOrderInfo = NonNullable<FarmerOrderItemRow["orders"]>;

export default function FarmerPage() {
  const { t } = useLanguage();
  const { user, token, isAuthenticated } = useAuth();

  const [produce, setProduce] = useState("Tomato");
  const [quantity, setQuantity] = useState("");
  const [askingPrice, setAskingPrice] = useState("24");
  const [location, setLocation] = useState("Tumakuru");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [quality, setQuality] =
    useState<QualityResult | null>(null);

  const [inventory, setInventory] =
    useState<Farmer[]>([]);

  const [incomingOrders, setIncomingOrders] =
    useState<FarmerOrderItemRow[]>([]);

  // Real Database State
  const [myListings, setMyListings] = useState<LiveMarketListing[]>([]);
  const [marketOffers, setMarketOffers] = useState<LiveMarketOffer[]>([]);
  const [farmerFarms, setFarmerFarms] = useState<LiveFarmSummary[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [offerActionNotice, setOfferActionNotice] = useState<string | null>(null);

  const [ordersLoading, setOrdersLoading] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [updatingOrderId, setUpdatingOrderId] =
    useState<string | null>(null);

  const [error, setError] = useState("");

  const loadAuthoritativeFarmerData = useCallback(async () => {
    if (!token) return;
    setOffersLoading(true);
    try {
      // 1. Load Farmer's Farms & Plots
      const farmsRes = await fetch("/api/platform/farms", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (farmsRes.ok) {
        const farmsData = await farmsRes.json();
        if (farmsData.success && Array.isArray(farmsData.farms)) {
          setFarmerFarms(farmsData.farms);
        }
      }

      // 2. Load Farmer's Produce Listings
      const listingsRes = await fetch(`/api/platform/marketplace?farmerId=${user?.id || ""}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (listingsRes.ok) {
        const listingsData = await listingsRes.json();
        if (listingsData.success && Array.isArray(listingsData.listings)) {
          setMyListings(listingsData.listings);
        }
      }

      // 3. Load Incoming Offers on Farmer's Listings
      const offersRes = await fetch("/api/platform/marketplace/offers?viewAs=farmer", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (offersRes.ok) {
        const offersData = await offersRes.json();
        if (offersData.success && Array.isArray(offersData.offers)) {
          setMarketOffers(offersData.offers);
        }
      }
    } catch (e) {
      console.error("Error loading authoritative farmer data:", e);
    } finally {
      setOffersLoading(false);
    }
  }, [token, user]);

  useEffect(() => {
    if (!image) {
      const timer = setTimeout(() => setPreview(null), 0);
      return () => clearTimeout(timer);
    }

    const url = URL.createObjectURL(image);
    const timer = setTimeout(() => setPreview(url), 0);

    return () => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
    };
  }, [image]);

  async function loadInventory() {
    const data = await getInventory();
    setInventory(data);
  }

  const loadIncomingOrders = useCallback(async () => {
    if (!token) {
      setIncomingOrders([]);
      return;
    }
    setOrdersLoading(true);

    try {
      const response = await fetch("/api/farmer/orders", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to load incoming orders."
        );
      }

      setIncomingOrders(data.orders ?? []);
    } catch (err) {
      console.error(
        "Failed to load incoming orders:",
        err
      );
    } finally {
      setOrdersLoading(false);
    }
  }, [token]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      loadInventory();
      if (token) {
        loadIncomingOrders();
        loadAuthoritativeFarmerData();
      }
    });
    return () => {
      active = false;
    };
  }, [token, loadIncomingOrders, loadAuthoritativeFarmerData]);

  async function analyzeQuality() {
    setError("");
    setQuality(null);

    if (!image) {
      setError(t("validation.uploadImage"));
      return;
    }

    if (!produce.trim()) {
      setError(t("validation.selectProduce"));
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();

      formData.append("image", image);
      formData.append("produce", produce);

      const response = await fetch("/api/quality", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            t("validation.analysisFailed")
        );
      }

      const parsed: QualityResult =
        JSON.parse(data.result);

      setQuality(parsed);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("validation.analysisFailed")
      );
    } finally {
      setLoading(false);
    }
  }

  async function confirmListing() {
    setError("");

    const quantityNumber = Number(quantity);
    const priceNumber = Number(askingPrice) || 24;

    if (!produce.trim()) {
      setError(t("validation.selectProduce"));
      return;
    }

    if (!quantityNumber || quantityNumber <= 0) {
      setError(t("validation.validQuantity"));
      return;
    }

    if (!quality) {
      setError(
        t("validation.analyzeFirst")
      );
      return;
    }

    setSaving(true);

    try {
      // 1. Upload photo to marketplace-listings bucket if present
      let uploadedImageUrl: string | null = null;
      if (image && token) {
        try {
          const formData = new FormData();
          formData.append("file", image);
          const uploadRes = await fetch("/api/platform/marketplace/upload", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          });
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            if (uploadData.success && uploadData.url) {
              uploadedImageUrl = uploadData.url;
            }
          }
        } catch (uploadErr) {
          console.warn("Storage upload bypassed:", uploadErr);
        }
      }

      // 2. Publish to live PostgreSQL produce_listings table
      if (token) {
        try {
          const listRes = await fetch("/api/platform/marketplace", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              cropName: produce,
              variety: "Hybrid Lot",
              category: "standard",
              quantityKg: quantityNumber,
              qualityGrade: quality.grade,
              askingPricePerKg: priceNumber,
              harvestDate: new Date().toISOString().split("T")[0],
              pickupLocation: location || "Tumakuru APMC Gate",
              district: user?.district || "Tumakuru",
              state: user?.state || "Karnataka",
              images: uploadedImageUrl ? [uploadedImageUrl] : [],
            }),
          });
          if (!listRes.ok) {
            const listErr = await listRes.json();
            console.warn("Produce listing API warning:", listErr.error);
          }
        } catch (err) {
          console.warn("Live produce listing skipped:", err);
        }
      }

      // 3. Keep local aggregator inventory updated
      const farmer: Farmer = {
        id: user?.id || crypto.randomUUID(),
        name: user?.fullName || "Verified Farmer",
        produce,
        quantity: quantityNumber,
        grade: quality.grade,
        location,
        distanceKm: 0,
      };

      await addInventoryItem(
        farmer,
        quality.score,
        quality.confidence,
        quality.observations
      );

      await loadInventory();
      await loadIncomingOrders();
      if (token) {
        await loadAuthoritativeFarmerData();
      }

      setQuantity("");
      setImage(null);
      setQuality(null);

      const fileInput =
        document.getElementById(
          "produce-image"
        ) as HTMLInputElement | null;

      if (fileInput) {
        fileInput.value = "";
      }

      alert(
        "✓ Produce lot published to X-MILE marketplace successfully!"
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("validation.saveListingFailed")
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleAcceptMarketOffer(offerId: string) {
    if (!token) return;
    try {
      const res = await fetch("/api/platform/marketplace/offers", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ offerId, action: "ACCEPT" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to accept offer.");
      }
      setOfferActionNotice("✓ Offer accepted! Order moved to Escrow and Logistics allocation.");
      setTimeout(() => setOfferActionNotice(null), 5000);
      await loadAuthoritativeFarmerData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to accept offer.");
    }
  }

  async function handleRejectMarketOffer(offerId: string) {
    if (!token) return;
    try {
      const res = await fetch("/api/platform/marketplace/offers", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ offerId, action: "REJECT" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to decline offer.");
      }
      setOfferActionNotice("✓ Offer declined.");
      setTimeout(() => setOfferActionNotice(null), 4000);
      await loadAuthoritativeFarmerData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to decline offer.");
    }
  }

  async function updateOrderStatus(
    orderId: string,
    status: OrderStatus
  ) {
    setError("");
    setUpdatingOrderId(orderId);

    try {
      const response = await fetch("/api/orders", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: orderId,
          status,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to update order status."
        );
      }

      await loadIncomingOrders();
    } catch (err) {
      console.error(
        "Failed to update order status:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to update order status."
      );
    } finally {
      setUpdatingOrderId(null);
    }
  }

  function getStatusClass(status: string) {
    switch (status) {
      case "Delivered":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";

      case "Dispatched":
        return "bg-blue-50 text-blue-700 border-blue-200";

      case "Disputed":
        return "bg-red-50 text-red-700 border-red-200";

      default:
        return "bg-amber-50 text-amber-700 border-amber-200";
    }
  }

  function renderStatusActions(order: FarmerIncomingOrderInfo) {
    if (!order?.id) {
      return null;
    }

    const status =
      order.status as OrderStatus;

    const isUpdating =
      updatingOrderId === order.id;

    if (status === "Disputed") {
      return (
        <span className="text-xs font-semibold text-red-600">
          {t("common.disputed")}
        </span>
      );
    }

    if (status === "Delivered") {
      return (
        <span className="text-xs font-bold text-emerald-600">
          ✓ {t("common.completed")}
        </span>
      );
    }

    if (status === "Dispatched") {
      return (
        <button
          type="button"
          disabled={isUpdating}
          onClick={() =>
            updateOrderStatus(
              order.id,
              "Delivered"
            )
          }
          className="button-hover rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isUpdating
            ? t("common.processing")
            : t("farmer.markDelivered")}
        </button>
      );
    }

    return (
      <button
        type="button"
        disabled={isUpdating}
        onClick={() =>
          updateOrderStatus(
            order.id,
            "Dispatched"
          )
        }
        className="button-hover rounded-xl bg-[#172019] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isUpdating
          ? t("common.processing")
          : t("farmer.markDispatched")}
      </button>
    );
  }

  const totalInventoryKg = inventory.reduce(
    (total, item) =>
      total + Number(item.quantity || 0),
    0
  );

  const gradeAItems = inventory.filter(
    (item) => item.grade === "A"
  ).length;

  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f8f5] text-[#172019]">
      <style jsx global>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(22px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }

        @keyframes pulseDot {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.7;
          }
          50% {
            transform: scale(1.35);
            opacity: 1;
          }
        }

        @keyframes scan {
          0% {
            transform: translateY(-5%);
          }
          50% {
            transform: translateY(500%);
          }
          100% {
            transform: translateY(-5%);
          }
        }

        @keyframes progress {
          from {
            width: 0;
          }
          to {
            width: 100%;
          }
        }

        .animate-fade-up {
          animation: fadeUp 0.7s ease-out both;
        }

        .animate-fade-in {
          animation: fadeIn 0.8s ease-out both;
        }

        .animate-float {
          animation: float 4s ease-in-out infinite;
        }

        .pulse-dot {
          animation: pulseDot 2s ease-in-out infinite;
        }

        .scan-line {
          animation: scan 2.8s ease-in-out infinite;
        }

        .animate-progress {
          animation: progress 1.8s ease-out both;
        }

        .card-hover {
          transition:
            transform 0.25s ease,
            box-shadow 0.25s ease,
            border-color 0.25s ease;
        }

        .card-hover:hover {
          transform: translateY(-4px);
          box-shadow:
            0 20px 45px rgba(23, 32, 25, 0.08);
          border-color: rgba(22, 101, 52, 0.2);
        }

        .button-hover {
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
        }

        .button-hover:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow:
            0 10px 25px rgba(23, 32, 25, 0.12);
        }
      `}</style>

      {/* HEADER */}
      <PlatformHeader />

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* CONNECTED FARMER 9-STEP JOURNEY */}
        <div className="mb-8">
          <ConnectedFarmerJourney currentStep="sell" />
        </div>
        {/* HERO */}
        <section className="animate-fade-up relative mb-10 overflow-hidden rounded-[2rem] bg-[#172019] px-7 py-10 text-white shadow-xl md:px-10 md:py-12">
          <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-lime-300/10 blur-3xl" />

          <div className="relative z-10 max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-bold tracking-wide text-emerald-200">
              <span className="pulse-dot h-2 w-2 rounded-full bg-emerald-300" />
              Every MILE Matters, Every FARMER Matters
            </div>

            <h1 className="text-4xl font-black tracking-tight md:text-5xl">
              {t("farmer.title")}
            </h1>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/65 md:text-base">
              {t("farmer.subtitle")}
            </p>

            {/* Authoritative Profile Display */}
            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="font-bold text-white">{user?.fullName || "Verified Producer"}</span>
                <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
                  {user?.role || "FARMER"}
                </span>
              </div>
              <span className="text-white/40">•</span>
              <span className="text-white/70">{user?.district || "Tumakuru"}, {user?.state || "Karnataka"}</span>
              <span className="text-white/40">•</span>
              <span className="text-emerald-300 font-semibold">{user?.isVerified ? "✓ Verified Producer" : "Staging Producer"}</span>
            </div>
          </div>

          <div className="absolute bottom-8 right-10 hidden md:block">
            <div className="animate-float relative h-32 w-32 rounded-full border border-white/10 bg-white/5">
              <div className="absolute inset-5 rounded-full border border-emerald-300/20" />
              <div className="absolute inset-10 rounded-full bg-emerald-300/20" />
              <div className="pulse-dot absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-300" />
            </div>
          </div>
        </section>

        {/* STATS */}
        <section
          className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          style={{ animationDelay: "120ms" }}
        >
          {[
            {
              label: t("farmer.statInventoryItems"),
              value: inventory.length,
              suffix: "",
              icon: "◈",
            },
            {
              label: t("farmer.statAvailableProduce"),
              value: totalInventoryKg,
              suffix: ` ${t("common.kg")}`,
              icon: "◌",
            },
            {
              label: t("farmer.statGradeALots"),
              value: gradeAItems,
              suffix: "",
              icon: "✦",
            },
            {
              label: t("farmer.statIncomingOrders"),
              value: incomingOrders.length + marketOffers.length,
              suffix: "",
              icon: "→",
            },
          ].map((stat, index) => (
            <div
              key={stat.label}
              className="card-hover animate-fade-up rounded-2xl border border-black/5 bg-white p-5 shadow-sm"
              style={{
                animationDelay: `${120 + index * 80}ms`,
              }}
            >
              <div className="flex items-start justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  {stat.label}
                </p>

                <span className="text-lg text-emerald-600">
                  {stat.icon}
                </span>
              </div>

              <p className="mt-4 text-3xl font-black tracking-tight">
                {stat.value}
                <span className="text-lg text-gray-400">
                  {stat.suffix}
                </span>
              </p>
            </div>
          ))}
        </section>

        {/* FARM & PLOT OVERVIEW (PHASE 1) */}
        <section className="mb-10 rounded-3xl border border-black/5 bg-white p-6 shadow-sm animate-fade-up">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-800">
                  Farm & Land Parcel Registry
                </span>
                <span className="text-xs text-gray-400">• Authoritative Database</span>
              </div>
              <h2 className="text-xl font-black text-gray-900 mt-1">
                {farmerFarms.length > 0 ? farmerFarms[0].name : "Primary Family Farm"}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {farmerFarms.length > 0
                  ? `Total Area: ${farmerFarms[0].total_area_acres} Acres • ${farmerFarms[0].plots?.length || 0} Registered Plots • ${farmerFarms[0].district}`
                  : "Manage your registered acreage, soil profiles, and plot crop cycles."}
              </p>
            </div>
            <Link
              href="/farm-profile"
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
            >
              Manage Farms & Plots →
            </Link>
          </div>

          {farmerFarms.length > 0 && farmerFarms[0].plots && farmerFarms[0].plots.length > 0 && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-gray-100">
              {farmerFarms[0].plots.slice(0, 4).map((p) => (
                <div key={p.id} className="rounded-xl bg-gray-50 p-3 border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">{p.plot_code}</span>
                  <p className="text-xs font-black text-gray-900 mt-0.5">{p.current_crop || "Fallow / Preparing"}</p>
                  <p className="text-[11px] text-emerald-700 font-semibold">{p.area_acres} Acres • {p.crop_stage}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ERROR */}
        {error && (
          <div className="animate-fade-in mb-8 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {/* LIST PRODUCE */}
        <section className="card-hover animate-fade-up rounded-[2rem] border border-black/5 bg-white p-7 shadow-sm md:p-9">
          <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-2 inline-flex rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                01 · {t("farmer.addProduceTitle")}
              </div>

              <h2 className="text-2xl font-black tracking-tight">
                {t("farmer.addProduceTitle")}
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">
                {t("farmer.addProduceSubtitle")}
              </p>
            </div>

            <div className="hidden text-right md:block">
              <p className="text-xs font-semibold text-gray-400">
                X-MILE POOL
              </p>
              <p className="mt-1 text-sm font-bold text-emerald-700">
                {t("farmer.readyForMatching")}
              </p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* PRODUCE */}
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
                {t("farmer.cropLabel")}
              </label>

              <select
                value={produce}
                onChange={(e) =>
                  setProduce(e.target.value)
                }
                className="w-full rounded-xl border border-black/10 bg-[#fafbf8] px-4 py-3.5 text-sm font-semibold outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
              >
                <option value="Tomato">{t("quality.produceTypes.tomato")}</option>
                <option value="Onion">{t("quality.produceTypes.onion")}</option>
                <option value="Potato">{t("quality.produceTypes.potato")}</option>
                <option value="Carrot">{t("quality.produceTypes.carrot")}</option>
                <option value="Cabbage">{t("quality.produceTypes.cabbage")}</option>
                <option value="Chilli">{t("quality.produceTypes.chilli")}</option>
              </select>
            </div>

            {/* QUANTITY */}
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
                {t("farmer.quantityLabel")} (kg)
              </label>

              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) =>
                  setQuantity(e.target.value)
                }
                placeholder={t("farmer.enterQuantity")}
                className="w-full rounded-xl border border-black/10 bg-[#fafbf8] px-4 py-3.5 text-sm font-semibold outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
              />
            </div>

            {/* ASKING PRICE */}
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
                Target Asking Price (₹/kg)
              </label>

              <input
                type="number"
                step="0.5"
                min="1"
                value={askingPrice}
                onChange={(e) =>
                  setAskingPrice(e.target.value)
                }
                placeholder="24"
                className="w-full rounded-xl border border-black/10 bg-[#fafbf8] px-4 py-3.5 text-sm font-semibold outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
              />
            </div>

            {/* LOCATION */}
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
                {t("farmer.farmLocation")}
              </label>

              <input
                type="text"
                value={location}
                onChange={(e) =>
                  setLocation(e.target.value)
                }
                className="w-full rounded-xl border border-black/10 bg-[#fafbf8] px-4 py-3.5 text-sm font-semibold outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
              />
            </div>

            {/* IMAGE */}
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
                {t("farmer.produceImage")}
              </label>

              <label
                htmlFor="produce-image"
                className="flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-black/15 bg-[#fafbf8] px-4 py-3.5 transition hover:border-emerald-400 hover:bg-emerald-50/30"
              >
                <span className="truncate text-sm font-semibold text-gray-600">
                  {image
                    ? image.name
                    : t("farmer.chooseImage")}
                </span>

                <span className="ml-3 rounded-lg bg-[#172019] px-3 py-2 text-xs font-bold text-white">
                  {t("farmer.browse")}
                </span>
              </label>

              <input
                id="produce-image"
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setImage(
                    e.target.files?.[0] ?? null
                  )
                }
                className="hidden"
              />
            </div>
          </div>

          {/* IMAGE PREVIEW + SCANNER */}
          {preview && (
            <div className="animate-fade-in mt-7 grid gap-5 md:grid-cols-[220px_1fr]">
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-black">
                <img
                  src={preview}
                  alt="Selected produce"
                  className="h-full w-full object-cover"
                />

                <div className="scan-line absolute left-0 top-0 h-1 w-full bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.9)]" />

                <div className="absolute inset-4 rounded-xl border border-white/50">
                  <span className="pulse-dot absolute left-3 top-3 h-2 w-2 rounded-full bg-emerald-300" />
                  <span className="pulse-dot absolute right-3 top-7 h-2 w-2 rounded-full bg-emerald-300" />
                  <span className="pulse-dot absolute bottom-5 left-8 h-2 w-2 rounded-full bg-emerald-300" />
                </div>

                <div className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1.5 text-[10px] font-bold text-white backdrop-blur">
                  {t("farmer.aiVisionReady")}
                </div>
              </div>

              <div className="flex flex-col justify-center rounded-2xl bg-[#f7f8f5] p-6">
                <div className="flex items-center gap-3">
                  <span className="pulse-dot h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <p className="text-xs font-black uppercase tracking-widest text-emerald-700">
                    {t("farmer.imageLoaded")}
                  </p>
                </div>

                <h3 className="mt-3 text-xl font-black">
                  {t("farmer.readyForAssessment")}
                </h3>

                <p className="mt-2 max-w-lg text-sm leading-6 text-gray-500">
                  {t("farmer.assessmentDesc")}
                </p>
              </div>
            </div>
          )}

          {/* AI PANEL */}
          <div className="mt-8 overflow-hidden rounded-2xl bg-[#172019] p-6 text-white">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="pulse-dot h-2 w-2 rounded-full bg-emerald-300" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
                    X-MILE AI VISION
                  </span>
                </div>

                <h3 className="text-lg font-black">
                  {t("farmer.seeQualityBeforeSelling")}
                </h3>

                <p className="mt-1 text-xs leading-5 text-white/50">
                  {t("farmer.uploadAndRun")}
                </p>
              </div>

              <button
                type="button"
                onClick={analyzeQuality}
                disabled={loading}
                className="button-hover rounded-xl bg-emerald-400 px-5 py-3 text-sm font-black text-[#172019] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? t("quality.analyzingButton")
                  : t("quality.analyzeButton")}
              </button>
            </div>

            {loading && (
              <div className="mt-6">
                <div className="mb-2 flex justify-between text-[10px] font-bold uppercase tracking-wider text-white/40">
                  <span>{t("farmer.aiVisualScan")}</span>
                  <span>{t("common.processing")}</span>
                </div>

                <div className="h-1 overflow-hidden rounded-full bg-white/10">
                  <div className="animate-progress h-full rounded-full bg-emerald-300" />
                </div>
              </div>
            )}
          </div>

          {/* QUALITY RESULT */}
          {quality && (
            <div className="animate-fade-up mt-7 overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50/60">
              <div className="border-b border-emerald-100 px-6 py-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">
                      03 · AI Quality Result
                    </p>

                    <h3 className="mt-1 text-lg font-black">
                      {t("farmer.assessmentComplete")}
                    </h3>
                  </div>

                  <div className="pulse-dot h-3 w-3 rounded-full bg-emerald-500" />
                </div>
              </div>

              <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl bg-white p-5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                    {t("common.grade")}
                  </p>

                  <p className="mt-2 text-5xl font-black text-emerald-700">
                    {quality.grade}
                  </p>
                </div>

                <div className="rounded-xl bg-white p-5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                    {t("buyer.thScore")}
                  </p>

                  <p className="mt-2 text-3xl font-black">
                    {quality.score}
                    <span className="text-base text-gray-400">
                      /100
                    </span>
                  </p>

                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-1000"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(
                            0,
                            quality.score
                          )
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="rounded-xl bg-white p-5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                    Confidence
                  </p>

                  <p className="mt-2 text-3xl font-black">
                    {quality.confidence}%
                  </p>

                  <p className="mt-2 text-xs font-semibold text-emerald-700">
                    AI confidence
                  </p>
                </div>

                <div className="rounded-xl bg-white p-5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                    Suitability
                  </p>

                  <p className="mt-2 text-2xl font-black">
                    {quality.suitability}
                  </p>
                </div>
              </div>

              <div className="grid gap-5 px-6 pb-6 md:grid-cols-2">
                <div className="rounded-xl bg-white p-5">
                  <p className="text-sm font-black">
                    AI Observations
                  </p>

                  <ul className="mt-4 space-y-3">
                    {quality.observations?.map(
                      (item, index) => (
                        <li
                          key={index}
                          className="flex gap-3 text-sm leading-6 text-gray-600"
                        >
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                          {item}
                        </li>
                      )
                    )}
                  </ul>
                </div>

                <div className="rounded-xl bg-white p-5">
                  <p className="text-sm font-black">
                    Visible Defects
                  </p>

                  {quality.visibleDefects
                    ?.length > 0 ? (
                    <ul className="mt-4 space-y-3">
                      {quality.visibleDefects.map(
                        (item, index) => (
                          <li
                            key={index}
                            className="flex gap-3 text-sm leading-6 text-gray-600"
                          >
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                            {item}
                          </li>
                        )
                      )}
                    </ul>
                  ) : (
                    <p className="mt-4 text-sm text-gray-500">
                      No visible defects reported.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* CONFIRM */}
          <div className="mt-8 flex flex-col gap-4 border-t border-black/5 pt-7 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold">
                {t("farmer.readyToJoinPool")}
              </p>

              <p className="mt-1 text-xs text-gray-500">
                {t("farmer.assessmentRequiredBeforeListing")}
              </p>
            </div>

            <button
              type="button"
              onClick={confirmListing}
              disabled={saving}
              className="button-hover rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-black text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? t("farmer.addingToPool")
                : t("farmer.joinPool")}
            </button>
          </div>
        </section>

        {/* INVENTORY */}
        <section className="card-hover animate-fade-up mt-10 rounded-[2rem] border border-black/5 bg-white p-7 shadow-sm md:p-9">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-2 inline-flex rounded-full bg-lime-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-lime-700">
                02 · {t("farmer.myListingsTitle")}
              </div>

              <h2 className="text-2xl font-black tracking-tight">
                Live Produce Lots ({myListings.length > 0 ? myListings.length : inventory.length})
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                Authoritative listings published to X-MILE staging marketplace.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/marketplace"
                className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                Browse Marketplace →
              </Link>
            </div>
          </div>

          {myListings.length > 0 ? (
            <div className="mt-8 overflow-x-auto">
              <table className="w-full min-w-[750px] text-left">
                <thead>
                  <tr className="border-b border-black/10 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    <th className="pb-4 pr-5">Crop & Lot</th>
                    <th className="pb-4 pr-5">Available Volume</th>
                    <th className="pb-4 pr-5">Asking Price</th>
                    <th className="pb-4 pr-5">Grade</th>
                    <th className="pb-4 pr-5">Location</th>
                    <th className="pb-4 pr-5">Status</th>
                    <th className="pb-4">Harvest Date</th>
                  </tr>
                </thead>
                <tbody>
                  {myListings.map((item) => (
                    <tr key={item.id} className="border-b border-black/5 transition hover:bg-[#fafbf8]">
                      <td className="py-5 pr-5">
                        <div className="font-bold text-gray-900">{item.crop_name}</div>
                        <div className="text-[10px] text-gray-400">{item.variety || "Local Hybrid"}</div>
                      </td>
                      <td className="py-5 pr-5 font-semibold text-gray-900">
                        {Number(item.quantity_kg).toLocaleString()} kg
                      </td>
                      <td className="py-5 pr-5 font-bold text-emerald-700">
                        ₹{item.asking_price_per_kg}/kg
                      </td>
                      <td className="py-5 pr-5">
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black text-emerald-700">
                          Grade {item.quality_grade}
                        </span>
                      </td>
                      <td className="py-5 pr-5 text-sm text-gray-600">
                        {item.pickup_location}
                      </td>
                      <td className="py-5 pr-5">
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          item.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-800"
                            : item.status === "SOLD"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-600"
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-5 text-xs text-gray-500">
                        {item.harvest_date}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : inventory.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-black/10 bg-[#f7f8f5] p-10 text-center">
              <div className="animate-float mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-xl text-emerald-600">
                +
              </div>

              <p className="mt-4 text-sm font-bold">
                {t("farmer.noInventoryListed")}
              </p>

              <p className="mt-1 text-xs text-gray-500">
                {t("farmer.approvedLotsAppearHere")}
              </p>
            </div>
          ) : (
            <div className="mt-8 overflow-x-auto">
              <table className="w-full min-w-[700px] text-left">
                <thead>
                  <tr className="border-b border-black/10 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    <th className="pb-4 pr-5">
                      {t("buyer.cropRequired")}
                    </th>
                    <th className="pb-4 pr-5">
                      {t("common.quantity")}
                    </th>
                    <th className="pb-4 pr-5">
                      {t("common.grade")}
                    </th>
                    <th className="pb-4 pr-5">
                      {t("farmer.farmLocation")}
                    </th>
                    <th className="pb-4">
                      {t("farmer.thDistance")}
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {inventory.map(
                    (item, index) => (
                      <tr
                        key={
                          item.id ?? index
                        }
                        className="border-b border-black/5 transition hover:bg-[#fafbf8]"
                      >
                        <td className="py-5 pr-5 font-bold">
                          {item.produce}
                        </td>

                        <td className="py-5 pr-5 font-semibold">
                          {item.quantity} {t("common.kg")}
                        </td>

                        <td className="py-5 pr-5">
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-black text-emerald-700">
                            {t("common.grade")} {item.grade}
                          </span>
                        </td>

                        <td className="py-5 pr-5 text-sm text-gray-600">
                          {item.location}
                        </td>

                        <td className="py-5 text-sm font-semibold text-gray-600">
                          {item.distanceKm} km
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* MARKETPLACE BUYER OFFERS (PHASE 3) */}
        <section className="card-hover animate-fade-up mt-10 rounded-[2rem] border border-black/5 bg-white p-7 shadow-sm md:p-9">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-2 inline-flex rounded-full bg-orange-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-orange-700">
                03 · Procurement Bids & Offers
              </div>

              <h2 className="text-2xl font-black tracking-tight">
                Incoming Buyer Offers ({marketOffers.length})
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                Direct procurement proposals from institutional buyers backed by Escrow.
              </p>
            </div>

            <div className="rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-xs font-black text-orange-700">
              {marketOffers.filter((o) => o.status === "PENDING").length} Pending Review
            </div>
          </div>

          {offerActionNotice && (
            <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-bold text-emerald-950">
              {offerActionNotice}
            </div>
          )}

          {offersLoading ? (
            <div className="mt-8 text-center py-10">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-r-transparent" />
              <p className="mt-2 text-xs text-gray-400">Loading incoming buyer offers...</p>
            </div>
          ) : marketOffers.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-black/10 bg-[#f7f8f5] p-10 text-center">
              <span className="text-2xl">📋</span>
              <p className="mt-3 text-sm font-bold text-gray-800">No buyer offers pending</p>
              <p className="mt-1 text-xs text-gray-500">
                When verified buyers place offers on your produce listings, they will appear here for one-click approval.
              </p>
            </div>
          ) : (
            <div className="mt-8 overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-xs">
                <thead>
                  <tr className="border-b border-black/10 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    <th className="pb-4 pr-5">Crop Lot</th>
                    <th className="pb-4 pr-5">Buyer</th>
                    <th className="pb-4 pr-5">Offered Quantity</th>
                    <th className="pb-4 pr-5">Offered Price</th>
                    <th className="pb-4 pr-5">Destination City</th>
                    <th className="pb-4 pr-5">Status</th>
                    <th className="pb-4 pr-5">Action</th>
                    <th className="pb-4">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {marketOffers.map((off) => (
                    <tr key={off.id} className="border-b border-black/5 transition hover:bg-[#fafbf8]">
                      <td className="py-4 pr-5 font-black text-gray-900">
                        {off.produce_listings?.crop_name || "Produce Lot"}
                      </td>
                      <td className="py-4 pr-5">
                        <div className="font-bold text-gray-900">{off.buyer_profiles?.full_name || "Verified Buyer"}</div>
                        <div className="text-[10px] text-gray-400">{off.buyer_profiles?.district || "India"}</div>
                      </td>
                      <td className="py-4 pr-5 font-semibold text-gray-900">
                        {Number(off.offered_quantity_kg).toLocaleString()} kg
                      </td>
                      <td className="py-4 pr-5 font-bold text-emerald-700">
                        ₹{off.offered_price_per_kg}/kg
                      </td>
                      <td className="py-4 pr-5 text-gray-600">
                        {off.destination_city}
                      </td>
                      <td className="py-4 pr-5">
                        <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold ${
                          off.status === "ACCEPTED"
                            ? "bg-emerald-100 text-emerald-800"
                            : off.status === "REJECTED"
                            ? "bg-red-100 text-red-800"
                            : "bg-amber-100 text-amber-800"
                        }`}>
                          {off.status}
                        </span>
                      </td>
                      <td className="py-4 pr-5">
                        {off.status === "PENDING" ? (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleAcceptMarketOffer(off.id)}
                              className="rounded-lg bg-emerald-600 px-3 py-1 text-[11px] font-bold text-white shadow-xs hover:bg-emerald-700 transition"
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectMarketOffer(off.id)}
                              className="rounded-lg border border-gray-200 px-3 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-50 transition"
                            >
                              Decline
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400 font-semibold">—</span>
                        )}
                      </td>
                      <td className="py-4 text-xs text-gray-400">
                        {off.created_at ? new Date(off.created_at).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ORDERS */}
        <section className="card-hover animate-fade-up mt-10 rounded-[2rem] border border-black/5 bg-white p-7 shadow-sm md:p-9">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-2 inline-flex rounded-full bg-orange-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-orange-700">
                03 · {t("farmer.activeOrdersTitle")}
              </div>

              <h2 className="text-2xl font-black tracking-tight">
                {t("farmer.activeOrdersTitle")}
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                {t("farmer.incomingOrdersDesc")}
              </p>
            </div>

            <div className="rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-xs font-black text-orange-700">
              {incomingOrders.length} {t("farmer.ordersCount")}
            </div>
          </div>

          {ordersLoading ? (
            <div className="mt-8 rounded-2xl bg-[#f7f8f5] p-10 text-center">
              <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-emerald-600" />

              <p className="mt-4 text-sm font-semibold text-gray-500">
                {t("farmer.loadingOrders")}
              </p>
            </div>
          ) : incomingOrders.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-black/10 bg-[#f7f8f5] p-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange-50 text-xl text-orange-600">
                →
              </div>

              <p className="mt-4 text-sm font-bold">
                {t("farmer.noOrdersFound")}
              </p>

              <p className="mt-1 text-xs text-gray-500">
                {t("farmer.reservationsAppearHere")}
              </p>
            </div>
          ) : (
            <div className="mt-8 overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left">
                <thead>
                  <tr className="border-b border-black/10 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    <th className="pb-4 pr-5">
                      {t("transaction.buyer")}
                    </th>

                    <th className="pb-4 pr-5">
                      {t("buyer.cropRequired")}
                    </th>

                    <th className="pb-4 pr-5">
                      {t("farmer.thReserved")}
                    </th>

                    <th className="pb-4 pr-5">
                      {t("common.grade")}
                    </th>

                    <th className="pb-4 pr-5">
                      {t("common.destination")}
                    </th>

                    <th className="pb-4 pr-5">
                      {t("common.status")}
                    </th>

                    <th className="pb-4 pr-5">
                      {t("farmer.thAction")}
                    </th>

                    <th className="pb-4">
                      {t("farmer.thCreated")}
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {incomingOrders.map(
                    (item) => {
                      const order =
                        item.orders;

                      const inventoryItem =
                        item.inventory;

                      if (!order) {
                        return null;
                      }

                      return (
                        <tr
                          key={item.id}
                          className="border-b border-black/5 last:border-0 transition hover:bg-[#fafbf8]"
                        >
                          <td className="py-5 pr-5 font-bold">
                            {order.buyer_name}
                          </td>

                          <td className="py-5 pr-5">
                            {order.produce}
                          </td>

                          <td className="py-5 pr-5">
                            <span className="font-bold">
                              {item.quantity_kg} kg
                            </span>

                            {inventoryItem
                              ?.reserved_quantity_kg !=
                              null && (
                              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
                                Inventory reserved
                              </p>
                            )}
                          </td>

                          <td className="py-5 pr-5">
                            <span className="rounded-full border border-black/10 bg-gray-50 px-3 py-1.5 text-[10px] font-black">
                              {order.required_grade}
                            </span>
                          </td>

                          <td className="py-5 pr-5 text-sm text-gray-600">
                            {order.destination}
                          </td>

                          <td className="py-5 pr-5">
                            <span
                              className={`rounded-full border px-3 py-1.5 text-[10px] font-black ${getStatusClass(
                                order.status
                              )}`}
                            >
                              {order.status}
                            </span>
                          </td>

                          <td className="py-5 pr-5">
                            {renderStatusActions(
                              order
                            )}
                          </td>

                          <td className="py-5 text-xs text-gray-500">
                            {order.created_at
                              ? new Date(
                                  order.created_at
                                ).toLocaleString()
                              : "—"}
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* FOOTER NOTE */}
        <section className="animate-fade-in mt-10 pb-8">
          <div className="rounded-2xl border border-black/5 bg-white/60 px-6 py-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <span className="text-lg">⚠️</span>

              <div>
                <p className="text-xs font-black uppercase tracking-wider text-gray-500">
                  {t("quality.disclaimerTitle")}
                </p>

                <p className="mt-1 text-xs leading-5 text-gray-500">
                  {t("quality.disclaimerText")}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}