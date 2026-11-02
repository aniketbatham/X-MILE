"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import PlatformHeader from "@/components/PlatformHeader";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import {
  addInventoryItem,
  getInventory,
} from "@/lib/inventory";
import type { Farmer } from "@/lib/aggregation";
import { speakText, stopSpeaking, isSpeechSupported } from "@/lib/speech";

export type OrderStatus = "Accepted" | "Dispatched" | "Delivered" | "Disputed" | "Cancelled";

export interface QualityResult {
  grade: "A" | "B" | "C";
  score: number;
  confidence: number;
  observations: string[];
  visibleDefects?: string[];
  suitability?: string;
}

export interface FarmerOrderItemRow {
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

type FarmerTab =
  | "overview"
  | "my-farm"
  | "sell-crops"
  | "my-orders"
  | "track-delivery"
  | "check-quality"
  | "my-earnings";

const COMMON_CROPS = [
  { name: "Tomato", hindi: "टमाटर", icon: "🍅", defaultPrice: 22 },
  { name: "Onion", hindi: "प्याज", icon: "🧅", defaultPrice: 26 },
  { name: "Potato", hindi: "आलू", icon: "🥔", defaultPrice: 18 },
  { name: "Chilli", hindi: "मिर्च", icon: "🌶️", defaultPrice: 120 },
  { name: "Wheat", hindi: "गेहूं", icon: "🌾", defaultPrice: 28 },
  { name: "Rice", hindi: "चावल / धान", icon: "🍚", defaultPrice: 32 },
  { name: "Cotton", hindi: "कपास", icon: "☁️", defaultPrice: 75 },
  { name: "Maize", hindi: "मक्का", icon: "🌽", defaultPrice: 20 },
];

export default function FarmerPage() {
  const { locale } = useLanguage();
  const { user, token, isAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState<FarmerTab>("overview");
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Form states for selling produce
  const [produce, setProduce] = useState("Tomato");
  const [quantity, setQuantity] = useState("500");
  const [askingPrice, setAskingPrice] = useState("24");
  const [location, setLocation] = useState("Tumakuru Farm Gate");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Quality grading state
  const [quality, setQuality] = useState<QualityResult | null>(null);
  const [qualityLoading, setQualityLoading] = useState(false);
  const [qualityError, setQualityError] = useState("");

  // Server data state
  const [inventory, setInventory] = useState<Farmer[]>([]);
  const [incomingOrders, setIncomingOrders] = useState<FarmerOrderItemRow[]>([]);
  const [myListings, setMyListings] = useState<LiveMarketListing[]>([]);
  const [marketOffers, setMarketOffers] = useState<LiveMarketOffer[]>([]);
  const [farmerFarms, setFarmerFarms] = useState<LiveFarmSummary[]>([]);

  // Action status states
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [savingListing, setSavingListing] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [formError, setFormError] = useState("");

  // Handle image preview cleanup
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

  const loadInventoryData = async () => {
    try {
      const data = await getInventory();
      setInventory(data);
    } catch {
      // Ignore inventory load failure
    }
  };

  const loadIncomingOrders = useCallback(async () => {
    if (!token) {
      setIncomingOrders([]);
      return;
    }
    setOrdersLoading(true);
    try {
      const res = await fetch("/api/farmer/orders", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setIncomingOrders(data.orders ?? []);
      }
    } catch (err) {
      console.warn("Failed to load incoming orders:", err);
    } finally {
      setOrdersLoading(false);
    }
  }, [token]);

  const loadAuthoritativeFarmerData = useCallback(async () => {
    if (!token) return;
    try {
      // 1. Farms
      const farmsRes = await fetch("/api/platform/farms", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (farmsRes.ok) {
        const d = await farmsRes.json();
        if (d.success && Array.isArray(d.farms)) setFarmerFarms(d.farms);
      }

      // 2. Listings
      const listRes = await fetch(`/api/platform/marketplace?farmerId=${user?.id || ""}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (listRes.ok) {
        const d = await listRes.json();
        if (d.success && Array.isArray(d.listings)) setMyListings(d.listings);
      }

      // 3. Offers
      const offersRes = await fetch("/api/platform/marketplace/offers?viewAs=farmer", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (offersRes.ok) {
        const d = await offersRes.json();
        if (d.success && Array.isArray(d.offers)) setMarketOffers(d.offers);
      }
    } catch (e) {
      console.warn("Error loading farmer profile data:", e);
    }
  }, [token, user]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      loadInventoryData();
      if (token) {
        loadIncomingOrders();
        loadAuthoritativeFarmerData();
      }
    });
    return () => {
      active = false;
    };
  }, [token, loadIncomingOrders, loadAuthoritativeFarmerData]);

  // Voice guidance helper
  const handleVoiceGuidance = () => {
    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
      return;
    }

    let speechText = "";
    switch (activeTab) {
      case "overview":
        speechText = `Welcome to X-MILE Farmer Portal. Choose one of the six main buttons: My Farm, Sell My Crops, My Orders, Track Delivery, Check Crop Quality, or My Earnings.`;
        break;
      case "sell-crops":
        speechText = `Sell your harvest. Select your crop, enter the quantity in kilograms, set your asking price per kilogram, add a crop photo, and tap Publish for Sale.`;
        break;
      case "check-quality":
        speechText = `AI Quality Grading. Take a clear photo of your produce. Tap Check Quality. Our artificial intelligence will grade your crop into Grade A, B, or C with instant observations.`;
        break;
      case "my-orders":
        speechText = `My Orders. Here you see buyers who placed orders for your harvest. You can mark orders as Dispatched when the truck leaves, and Delivered when it arrives.`;
        break;
      case "track-delivery":
        speechText = `Track Delivery. View the truck assigned to pick up your harvest and check if it is at the farm gate or on the road to the mandi.`;
        break;
      case "my-farm":
        speechText = `My Farm. View your registered land acreage, survey numbers, soil types, and active crops.`;
        break;
      case "my-earnings":
        speechText = `My Earnings. View your total completed crop sales, money deposited to your bank, and payments held safely in milestone escrow.`;
        break;
    }

    setIsSpeaking(true);
    speakText(speechText, locale, () => {
      setIsSpeaking(false);
    });
  };

  // AI Quality Inspection
  async function handleAnalyzeQuality() {
    setQualityError("");
    setQuality(null);

    if (!image) {
      setQualityError("Please tap the camera button to upload or take a photo of your crop.");
      return;
    }

    setQualityLoading(true);
    try {
      const formData = new FormData();
      formData.append("image", image);
      formData.append("produce", produce);

      const res = await fetch("/api/quality", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Quality inspection failed. Please try again.");
      }

      const parsed: QualityResult = JSON.parse(data.result);
      setQuality(parsed);

      // Speak result aloud
      speakText(
        `Your ${produce} quality is Grade ${parsed.grade}, with a score of ${parsed.score} out of 100.`,
        locale
      );
    } catch (err: unknown) {
      setQualityError(err instanceof Error ? err.message : "Failed to analyze photo.");
    } finally {
      setQualityLoading(false);
    }
  }

  // Publish produce for sale
  async function handleConfirmListing() {
    setFormError("");
    const qty = Number(quantity);
    const price = Number(askingPrice);

    if (!qty || qty <= 0) {
      setFormError("Please enter a valid harvest quantity in kilograms (e.g. 500).");
      return;
    }

    if (!price || price <= 0) {
      setFormError("Please enter your asking price in rupees per kilogram (e.g. 24).");
      return;
    }

    setSavingListing(true);

    try {
      let uploadedUrl: string | null = null;
      if (image && token) {
        try {
          const fd = new FormData();
          fd.append("file", image);
          const uploadRes = await fetch("/api/platform/marketplace/upload", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: fd,
          });
          if (uploadRes.ok) {
            const upData = await uploadRes.json();
            if (upData.success) uploadedUrl = upData.url;
          }
        } catch {
          // Non-blocking upload fallback
        }
      }

      if (token) {
        await fetch("/api/platform/marketplace", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            cropName: produce,
            variety: "Standard Lot",
            category: "standard",
            quantityKg: qty,
            qualityGrade: quality?.grade || "A",
            askingPricePerKg: price,
            harvestDate: new Date().toISOString().split("T")[0],
            pickupLocation: location || "Farm Gate",
            district: user?.district || "Tumakuru",
            state: user?.state || "Karnataka",
            images: uploadedUrl ? [uploadedUrl] : [],
          }),
        });
      }

      // Add to local state
      const farmerRecord: Farmer = {
        id: user?.id || crypto.randomUUID(),
        name: user?.fullName || "Verified Farmer",
        produce,
        quantity: qty,
        grade: quality?.grade || "A",
        location: location || "Farm Gate",
        distanceKm: 0,
      };

      await addInventoryItem(
        farmerRecord,
        quality?.score || 88,
        quality?.confidence || 90,
        quality?.observations || ["Good lot"]
      );

      await loadInventoryData();
      if (token) {
        await loadAuthoritativeFarmerData();
      }

      setNotification(`✓ ${qty} kg of ${produce} published for sale at ₹${price}/kg!`);
      setTimeout(() => setNotification(null), 6000);

      // Reset form
      setQuantity("");
      setImage(null);
      setQuality(null);
      setActiveTab("my-orders");
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to publish listing.");
    } finally {
      setSavingListing(false);
    }
  }

  // Accept / Decline Buyer Offers
  async function handleAcceptOffer(offerId: string) {
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
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to accept offer.");

      setNotification("✓ Buyer offer accepted! Order moved to Escrow and Logistics allocation.");
      setTimeout(() => setNotification(null), 5000);
      await loadAuthoritativeFarmerData();
      await loadIncomingOrders();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to accept offer.");
    }
  }

  async function handleDeclineOffer(offerId: string) {
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
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to decline offer.");

      setNotification("✓ Offer declined.");
      setTimeout(() => setNotification(null), 4000);
      await loadAuthoritativeFarmerData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to decline offer.");
    }
  }

  // Update Order Status (Dispatched -> Delivered)
  async function handleUpdateOrderStatus(orderId: string, status: OrderStatus) {
    setUpdatingOrderId(orderId);
    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ id: orderId, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update order.");
      await loadIncomingOrders();
      setNotification(`✓ Order marked as ${status}!`);
      setTimeout(() => setNotification(null), 5000);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Order status update failed.");
    } finally {
      setUpdatingOrderId(null);
    }
  }

  // Computed summary metrics
  const totalEarningsEstimated = incomingOrders
    .filter((o) => o.orders?.status === "Delivered")
    .reduce((acc, o) => acc + (o.quantity_kg || 0) * 24, 0);

  const pendingEscrow = incomingOrders
    .filter((o) => o.orders?.status === "Dispatched" || o.orders?.status === "Accepted")
    .reduce((acc, o) => acc + (o.quantity_kg || 0) * 24, 0);

  const priorityTiles = [
    {
      id: "my-farm" as FarmerTab,
      icon: "🏡",
      title: "1. My Farm",
      subtitle: "मेरा खेत",
      description: "Land, plots, soil & standing crops",
      badge: `${farmerFarms.length} Farms`,
      color: "border-emerald-300 bg-emerald-50/60 hover:bg-emerald-100/60",
    },
    {
      id: "sell-crops" as FarmerTab,
      icon: "📦",
      title: "2. Sell My Crops",
      subtitle: "फसल बेचें",
      description: "List harvest with photo & set price",
      badge: "Sell Direct",
      color: "border-amber-300 bg-amber-50/60 hover:bg-amber-100/60",
    },
    {
      id: "my-orders" as FarmerTab,
      icon: "📋",
      title: "3. My Orders",
      subtitle: "मेरे ऑर्डर",
      description: "Buyer orders & dispatch status",
      badge: `${incomingOrders.length + marketOffers.length} Orders`,
      color: "border-blue-300 bg-blue-50/60 hover:bg-blue-100/60",
    },
    {
      id: "track-delivery" as FarmerTab,
      icon: "🚚",
      title: "4. Track Delivery",
      subtitle: "ट्रक देखें",
      description: "Pickup trucks moving your produce",
      badge: "Live Fleet",
      color: "border-purple-300 bg-purple-50/60 hover:bg-purple-100/60",
    },
    {
      id: "check-quality" as FarmerTab,
      icon: "🔍",
      title: "5. Check Crop Quality",
      subtitle: "क्वालिटी जांचें",
      description: "1-Tap photo AI grading (A, B, C)",
      badge: "AI Vision",
      color: "border-teal-300 bg-teal-50/60 hover:bg-teal-100/60",
    },
    {
      id: "my-earnings" as FarmerTab,
      icon: "💰",
      title: "6. My Earnings",
      subtitle: "मेरी कमाई",
      description: "Completed sales & safe escrow payouts",
      badge: `₹${totalEarningsEstimated.toLocaleString()}`,
      color: "border-lime-300 bg-lime-50/60 hover:bg-lime-100/60",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f7faf7] text-stone-900 flex flex-col">
      <PlatformHeader />

      <main className="flex-1 mx-auto w-full max-w-5xl px-3 sm:px-6 py-4 sm:py-8">
        {/* Role Guard Warning if signed in as another role */}
        {isAuthenticated && user && user.role !== "FARMER" && (
          <div className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-bold">⚠️ Notice:</span> You are signed in with the role{" "}
                <span className="font-extrabold uppercase">{user.role}</span>. You can test farmer actions here or open your authorized role portal.
              </div>
              <Link
                href={user.role === "BUYER" ? "/buyer" : user.role === "ADMIN" ? "/admin" : "/logistics"}
                className="inline-flex items-center gap-1 rounded-xl bg-amber-700 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-amber-800 transition"
              >
                Go to {user.role} Portal →
              </Link>
            </div>
          </div>
        )}

        {/* Global Notification Banner */}
        {notification && (
          <div className="mb-4 rounded-2xl border border-emerald-300 bg-emerald-100/90 p-4 text-sm font-bold text-emerald-950 shadow-sm animate-in fade-in">
            {notification}
          </div>
        )}

        {/* TOP WELCOME BAR WITH SPOKEN VOICE ASSISTANT */}
        <section className="mb-6 rounded-3xl border border-stone-200 bg-white p-5 sm:p-7 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🌾</span>
                <span className="text-xs font-black uppercase tracking-wider text-emerald-800 bg-emerald-100/70 px-3 py-1 rounded-full">
                  Farmer Portal • किसान सेवा
                </span>
                {user?.isVerified && (
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                    ✓ Verified
                  </span>
                )}
              </div>

              <h1 className="mt-2 text-2xl sm:text-3xl font-black text-stone-900">
                Namaste, {user?.fullName || "Kisan Mitra"}!
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-stone-600">
                {user?.village ? `${user.village}, ` : ""}{user?.district || "Tumakuru"}, {user?.state || "Karnataka"} • Choose an action below:
              </p>
            </div>

            {/* Voice Guidance Speaker Button */}
            {isSpeechSupported() && (
              <button
                type="button"
                onClick={handleVoiceGuidance}
                className={`flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-xs sm:text-sm font-black shadow-sm transition transform active:scale-95 ${
                  isSpeaking
                    ? "bg-red-600 text-white animate-pulse"
                    : "bg-emerald-700 text-white hover:bg-emerald-800"
                }`}
              >
                <span className="text-lg">{isSpeaking ? "⏹" : "🔊"}</span>
                <span>{isSpeaking ? "Stop Speaking" : "Listen (आवाज़ सुनें)"}</span>
              </button>
            )}
          </div>
        </section>

        {/* MODE: MAIN 6-TILE MENU (When on Overview) */}
        {activeTab === "overview" && (
          <section className="space-y-6 animate-in fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {priorityTiles.map((tile) => (
                <button
                  key={tile.id}
                  type="button"
                  onClick={() => setActiveTab(tile.id)}
                  className={`flex flex-col justify-between rounded-3xl border-2 p-5 sm:p-6 text-left transition transform hover:-translate-y-1 hover:shadow-md active:scale-98 ${tile.color}`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-4xl">{tile.icon}</span>
                      <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-black text-stone-800 shadow-2xs">
                        {tile.badge}
                      </span>
                    </div>
                    <div className="text-lg font-black text-stone-900">{tile.title}</div>
                    <div className="text-xs font-bold text-emerald-800">{tile.subtitle}</div>
                    <p className="mt-2 text-xs leading-relaxed text-stone-600">{tile.description}</p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-black/5 flex items-center justify-between text-xs font-black text-stone-800">
                    <span>Open Section</span>
                    <span className="text-base">→</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Quick Helper Tools */}
            <div className="rounded-3xl border border-stone-200 bg-white p-5">
              <h2 className="text-sm font-black text-stone-900 mb-3">Agricultural Tools & Advisory</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Link
                  href="/crop-planner"
                  className="rounded-2xl border border-stone-200 p-3 text-center hover:bg-emerald-50 transition"
                >
                  <span className="text-xl">🌱</span>
                  <div className="text-xs font-bold text-stone-800 mt-1">Crop Planner</div>
                </Link>
                <Link
                  href="/soil-health"
                  className="rounded-2xl border border-stone-200 p-3 text-center hover:bg-emerald-50 transition"
                >
                  <span className="text-xl">🧪</span>
                  <div className="text-xs font-bold text-stone-800 mt-1">Soil Health</div>
                </Link>
                <Link
                  href="/schemes"
                  className="rounded-2xl border border-stone-200 p-3 text-center hover:bg-emerald-50 transition"
                >
                  <span className="text-xl">🏛️</span>
                  <div className="text-xs font-bold text-stone-800 mt-1">Govt Schemes</div>
                </Link>
                <Link
                  href="/machinery"
                  className="rounded-2xl border border-stone-200 p-3 text-center hover:bg-emerald-50 transition"
                >
                  <span className="text-xl">🚜</span>
                  <div className="text-xs font-bold text-stone-800 mt-1">Hire Tractors</div>
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* SECTION: 1. MY FARM */}
        {activeTab === "my-farm" && (
          <section className="space-y-4 animate-in fade-in">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-stone-200 px-3.5 py-2 text-xs font-bold text-stone-800 hover:bg-stone-300 transition"
            >
              ⬅ Back to Main Menu (वापस जाएं)
            </button>

            <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-stone-100">
                <div>
                  <h2 className="text-xl font-black text-stone-900">🏡 My Farm (मेरा खेत)</h2>
                  <p className="text-xs text-stone-600 mt-0.5">
                    Your registered agricultural land, survey numbers, and active plots.
                  </p>
                </div>
                <Link
                  href="/farm-profile"
                  className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-black text-white hover:bg-emerald-800 transition"
                >
                  Edit Farm Profile →
                </Link>
              </div>

              {farmerFarms.length === 0 ? (
                <div className="py-12 text-center">
                  <span className="text-4xl">🏡</span>
                  <div className="mt-2 text-sm font-bold text-stone-700">No Farm Registered Yet</div>
                  <p className="mt-1 text-xs text-stone-500 max-w-sm mx-auto">
                    Add your farm plots, soil test information, and active crops in the Farm Profile.
                  </p>
                  <Link
                    href="/farm-profile"
                    className="mt-4 inline-block rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-black text-white hover:bg-emerald-800 transition"
                  >
                    Setup My Farm Now →
                  </Link>
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  {farmerFarms.map((farm) => (
                    <div key={farm.id} className="rounded-2xl border border-stone-200 p-4 bg-stone-50/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-base font-black text-stone-900">{farm.name}</span>
                        <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                          {farm.total_area_acres} Acres
                        </span>
                      </div>
                      <div className="text-xs text-stone-600">District: {farm.district}</div>

                      {farm.plots && farm.plots.length > 0 && (
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {farm.plots.map((p) => (
                            <div key={p.id} className="rounded-xl border border-stone-200 bg-white p-3 text-xs">
                              <div className="font-bold text-stone-800">{p.plot_code}</div>
                              <div className="text-emerald-700 font-semibold">{p.current_crop}</div>
                              <div className="text-stone-500 text-[11px]">{p.area_acres} Acres • {p.crop_stage}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* SECTION: 2. SELL MY CROPS */}
        {activeTab === "sell-crops" && (
          <section className="space-y-4 animate-in fade-in">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-stone-200 px-3.5 py-2 text-xs font-bold text-stone-800 hover:bg-stone-300 transition"
            >
              ⬅ Back to Main Menu (वापस जाएं)
            </button>

            <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black text-stone-900">📦 Sell My Crops (फसल बेचें)</h2>
              <p className="text-xs text-stone-600 mt-1">
                List your produce directly on the X-MILE marketplace for buyers to make offers.
              </p>

              {formError && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 font-bold">
                  ⚠️ {formError}
                </div>
              )}

              <div className="mt-6 space-y-6">
                {/* 1. Pick Crop */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-stone-700 mb-2">
                    Step 1: Choose Your Produce (फसल चुनें)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {COMMON_CROPS.map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => {
                          setProduce(c.name);
                          setAskingPrice(String(c.defaultPrice));
                        }}
                        className={`flex items-center gap-2 rounded-2xl border p-3 text-left transition ${
                          produce === c.name
                            ? "border-emerald-600 bg-emerald-50 text-emerald-950 font-black shadow-xs"
                            : "border-stone-200 hover:bg-stone-50 text-stone-800 font-bold"
                        }`}
                      >
                        <span className="text-2xl">{c.icon}</span>
                        <div>
                          <div className="text-xs">{c.name}</div>
                          <div className="text-[10px] text-stone-500 font-medium">{c.hindi}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Quantity & Asking Price */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-stone-700 mb-1" htmlFor="farmer-crop-qty">
                      Step 2: Harvest Quantity in kg (वजन किलो में)
                    </label>
                    <input
                      id="farmer-crop-qty"
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="e.g. 500"
                      className="w-full rounded-2xl border-2 border-stone-200 p-3.5 text-base font-bold text-stone-900 focus:border-emerald-600 focus:outline-none"
                    />
                    <div className="mt-1 text-[11px] text-stone-500">Example: 500 kg, 1200 kg</div>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-stone-700 mb-1" htmlFor="farmer-asking-price">
                      Step 3: Your Asking Price (₹ प्रति किलो)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3.5 text-base font-bold text-stone-500">₹</span>
                      <input
                        id="farmer-asking-price"
                        type="number"
                        value={askingPrice}
                        onChange={(e) => setAskingPrice(e.target.value)}
                        placeholder="e.g. 24"
                        className="w-full rounded-2xl border-2 border-stone-200 p-3.5 pl-8 text-base font-bold text-stone-900 focus:border-emerald-600 focus:outline-none"
                      />
                    </div>
                    <div className="mt-1 text-[11px] text-stone-500">Enter your expected minimum rate per kg</div>
                  </div>
                </div>

                {/* 3. Crop Photo Upload & Instant Quality */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-stone-700 mb-2" htmlFor="farmer-crop-photo">
                    Step 4: Take Crop Photo (फोटो खींचें - Optional)
                  </label>
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <label
                      htmlFor="farmer-crop-photo"
                      className="flex w-full sm:w-auto cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 px-6 py-4 text-xs font-bold text-stone-700 hover:border-emerald-500 hover:bg-emerald-50/50 transition"
                    >
                      <span className="text-xl">📸</span>
                      <span>{image ? "Change Photo" : "Upload / Take Crop Photo"}</span>
                      <input
                        id="farmer-crop-photo"
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setImage(file);
                        }}
                        className="hidden"
                      />
                    </label>

                    {preview && (
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={preview}
                          alt="Crop preview"
                          className="h-16 w-16 rounded-xl object-cover border border-stone-200 shadow-2xs"
                        />
                        <span className="text-xs font-bold text-emerald-800">✓ Photo Selected</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="button"
                  disabled={savingListing}
                  onClick={handleConfirmListing}
                  className="w-full rounded-2xl bg-emerald-700 p-4 text-base font-black text-white shadow-md hover:bg-emerald-800 transition disabled:opacity-50"
                >
                  {savingListing ? "Publishing Lot..." : "Publish Crop for Sale (फसल बिक्री के लिए भेजें) →"}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* SECTION: 3. MY ORDERS */}
        {activeTab === "my-orders" && (
          <section className="space-y-4 animate-in fade-in">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-stone-200 px-3.5 py-2 text-xs font-bold text-stone-800 hover:bg-stone-300 transition"
            >
              ⬅ Back to Main Menu (वापस जाएं)
            </button>

            {/* Buyer Counter-Offers */}
            {marketOffers.length > 0 && (
              <div className="rounded-3xl border border-amber-300 bg-amber-50/60 p-6 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-amber-200">
                  <h3 className="text-base font-black text-amber-950">
                    🤝 Direct Buyer Counter-Offers ({marketOffers.length})
                  </h3>
                  <span className="text-xs font-bold text-amber-800">Pending Your Approval</span>
                </div>

                <div className="mt-4 space-y-3">
                  {marketOffers.map((off) => (
                    <div key={off.id} className="rounded-2xl border border-amber-200 bg-white p-4 shadow-2xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-black text-stone-900">
                            {off.buyer_profiles?.full_name || "Commercial Buyer"} offered ₹{off.offered_price_per_kg}/kg
                          </div>
                          <div className="text-xs text-stone-600 mt-0.5">
                            Quantity: {off.offered_quantity_kg} kg • Destination: {off.destination_city}
                          </div>
                        </div>

                        {off.status === "PENDING" && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleAcceptOffer(off.id)}
                              className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 transition"
                            >
                              Accept (स्वीकार करें) ✓
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeclineOffer(off.id)}
                              className="rounded-xl border border-stone-300 px-3 py-2 text-xs font-bold text-stone-700 hover:bg-stone-100 transition"
                            >
                              Decline ✕
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Incoming Orders */}
            <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-stone-100">
                <div>
                  <h2 className="text-xl font-black text-stone-900">📋 My Orders (मेरे ऑर्डर)</h2>
                  <p className="text-xs text-stone-600 mt-0.5">
                    Orders from buyers for your produce lots.
                  </p>
                </div>
                {ordersLoading && (
                  <span className="text-xs font-bold text-stone-400">Loading...</span>
                )}
              </div>

              {incomingOrders.length === 0 ? (
                <div className="py-12 text-center">
                  <span className="text-4xl">📦</span>
                  <div className="mt-2 text-sm font-bold text-stone-700">No Orders Placed Yet</div>
                  <p className="mt-1 text-xs text-stone-500 max-w-sm mx-auto">
                    When you list your crops under &ldquo;Sell My Crops&rdquo;, buyer purchase orders will appear here.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("sell-crops")}
                    className="mt-4 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-black text-white hover:bg-emerald-800 transition"
                  >
                    Sell Crops Now →
                  </button>
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  {incomingOrders.map((item) => {
                    const ord = item.orders;
                    if (!ord) return null;
                    const isUpdating = updatingOrderId === ord.id;

                    return (
                      <div key={item.id} className="rounded-2xl border border-stone-200 p-4 bg-stone-50/40">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-base font-black text-stone-900">
                                {ord.produce} • {item.quantity_kg} kg
                              </span>
                              <span className="rounded-full bg-stone-200 px-2.5 py-0.5 text-[10px] font-black uppercase text-stone-800">
                                {ord.status}
                              </span>
                            </div>
                            <div className="text-xs text-stone-600 mt-1">
                              Buyer: <span className="font-bold">{ord.buyer_name}</span> • Destination: {ord.destination}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {ord.status === "Accepted" && (
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => handleUpdateOrderStatus(ord.id, "Dispatched")}
                                className="rounded-xl bg-stone-900 px-4 py-2 text-xs font-black text-white hover:bg-black transition disabled:opacity-50"
                              >
                                {isUpdating ? "Updating..." : "Mark Dispatched (गाड़ी रवाना हुई) 🚚"}
                              </button>
                            )}

                            {ord.status === "Dispatched" && (
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => handleUpdateOrderStatus(ord.id, "Delivered")}
                                className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-black text-white hover:bg-emerald-800 transition disabled:opacity-50"
                              >
                                {isUpdating ? "Updating..." : "Confirm Delivered (सामान पहुंचा) ✓"}
                              </button>
                            )}

                            {ord.status === "Delivered" && (
                              <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                                ✓ Completed & Settled
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        {/* SECTION: 4. TRACK DELIVERY */}
        {activeTab === "track-delivery" && (
          <section className="space-y-4 animate-in fade-in">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-stone-200 px-3.5 py-2 text-xs font-bold text-stone-800 hover:bg-stone-300 transition"
            >
              ⬅ Back to Main Menu (वापस जाएं)
            </button>

            <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black text-stone-900">🚚 Track Delivery (ट्रक देखें)</h2>
              <p className="text-xs text-stone-600 mt-1">
                Live freight tracking for your dispatched produce shipments.
              </p>

              <div className="mt-8 rounded-2xl border border-stone-200 bg-stone-50 p-6">
                <div className="text-xs font-black uppercase tracking-wider text-emerald-800">
                  Standard Farm-Gate Route
                </div>
                <div className="mt-1 text-sm font-black text-stone-900">
                  {user?.district || "Tumakuru"} Farm Gate $\to$ Bengaluru APMC Mandi
                </div>

                {/* 3-Stage Visual Progress Bar */}
                <div className="mt-8 relative">
                  <div className="h-2 rounded-full bg-stone-200" />
                  <div className="absolute left-0 top-0 h-2 w-2/3 rounded-full bg-emerald-600" />

                  <div className="mt-4 grid grid-cols-3 text-center text-xs">
                    <div>
                      <div className="font-black text-emerald-900">1. Farm Gate 🏡</div>
                      <div className="text-[11px] text-stone-500">Produce Loaded</div>
                    </div>
                    <div>
                      <div className="font-black text-emerald-900">2. In Transit 🚚</div>
                      <div className="text-[11px] text-stone-500">On Highway</div>
                    </div>
                    <div>
                      <div className="font-bold text-stone-400">3. Delivery 🏬</div>
                      <div className="text-[11px] text-stone-400">Weighment & Payout</div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-stone-800">Carrier:</span> Kisan Express Canter (5 Ton)
                  </div>
                  <Link
                    href="/logistics"
                    className="font-bold text-emerald-800 hover:underline"
                  >
                    Open Full Logistics Hub →
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* SECTION: 5. CHECK CROP QUALITY */}
        {activeTab === "check-quality" && (
          <section className="space-y-4 animate-in fade-in">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-stone-200 px-3.5 py-2 text-xs font-bold text-stone-800 hover:bg-stone-300 transition"
            >
              ⬅ Back to Main Menu (वापस जाएं)
            </button>

            <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black text-stone-900">🔍 Check Crop Quality (क्वालिटी जांचें)</h2>
              <p className="text-xs text-stone-600 mt-1">
                Upload or take a photo of your harvest. Our AI model grades it instantly into Grade A, B, or C.
              </p>

              {qualityError && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 font-bold">
                  ⚠️ {qualityError}
                </div>
              )}

              <div className="mt-6 space-y-4">
                {/* Crop Selection */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-stone-700 mb-2">
                    Declared Crop (फसल)
                  </label>
                  <select
                    value={produce}
                    onChange={(e) => setProduce(e.target.value)}
                    className="w-full rounded-2xl border-2 border-stone-200 p-3 text-sm font-bold text-stone-900 focus:border-emerald-600 focus:outline-none"
                  >
                    {COMMON_CROPS.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name} ({c.hindi})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Photo Capture */}
                <div>
                  <label
                    htmlFor="farmer-camera-input"
                    className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-stone-300 bg-stone-50 p-8 text-center hover:border-emerald-500 hover:bg-emerald-50/50 transition"
                  >
                    <span className="text-4xl mb-2">📸</span>
                    <span className="text-sm font-black text-stone-900">
                      {image ? "Photo Loaded - Tap to Change" : "Tap Here to Take or Upload Photo"}
                    </span>
                    <span className="text-xs text-stone-500 mt-1">
                      Works directly with your smartphone camera
                    </span>
                    <input
                      id="farmer-camera-input"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setImage(file);
                      }}
                      className="hidden"
                    />
                  </label>
                </div>

                {preview && (
                  <div className="text-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preview}
                      alt="Captured crop"
                      className="mx-auto h-48 w-48 rounded-2xl object-cover border border-stone-200 shadow-sm"
                    />
                  </div>
                )}

                <button
                  type="button"
                  disabled={qualityLoading || !image}
                  onClick={handleAnalyzeQuality}
                  className="w-full rounded-2xl bg-emerald-700 p-4 text-base font-black text-white shadow-md hover:bg-emerald-800 transition disabled:opacity-50"
                >
                  {qualityLoading ? "Scanning Photo with AI..." : "Check Quality Now (क्वालिटी जांचें) 🔍"}
                </button>

                {/* AI Result Display */}
                {quality && (
                  <div className="mt-6 rounded-3xl border-2 border-emerald-400 bg-emerald-50/70 p-6 animate-in zoom-in-95">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-black uppercase tracking-wider text-emerald-800">
                          AI Inspection Result
                        </div>
                        <div className="mt-1 flex items-center gap-3">
                          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-700 text-3xl font-black text-white shadow-sm">
                            {quality.grade}
                          </span>
                          <div>
                            <div className="text-lg font-black text-emerald-950">
                              Grade {quality.grade} Quality
                            </div>
                            <div className="text-xs font-bold text-emerald-800">
                              Quality Score: {quality.score}/100 • Confidence: {quality.confidence}%
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {quality.observations && quality.observations.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-emerald-200">
                        <div className="text-xs font-black uppercase text-emerald-900 mb-1">
                          Visible Observations:
                        </div>
                        <ul className="list-disc list-inside text-xs text-emerald-950 space-y-0.5">
                          {quality.observations.map((obs, idx) => (
                            <li key={idx}>{obs}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* SECTION: 6. MY EARNINGS */}
        {activeTab === "my-earnings" && (
          <section className="space-y-4 animate-in fade-in">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-stone-200 px-3.5 py-2 text-xs font-bold text-stone-800 hover:bg-stone-300 transition"
            >
              ⬅ Back to Main Menu (वापस जाएं)
            </button>

            <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black text-stone-900">💰 My Earnings (मेरी कमाई)</h2>
              <p className="text-xs text-stone-600 mt-1">
                Summary of your sales, bank payouts, and safe escrow guarantees.
              </p>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-emerald-300 bg-emerald-50/60 p-5">
                  <div className="text-xs font-black uppercase tracking-wider text-emerald-800">
                    Paid to Bank Account
                  </div>
                  <div className="mt-2 text-3xl font-black text-emerald-950">
                    ₹{totalEarningsEstimated.toLocaleString()}
                  </div>
                  <div className="mt-1 text-xs text-stone-500">
                    Completed orders verified at weighbridge
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-300 bg-amber-50/60 p-5">
                  <div className="text-xs font-black uppercase tracking-wider text-amber-800">
                    Held in Safe Escrow
                  </div>
                  <div className="mt-2 text-3xl font-black text-amber-950">
                    ₹{pendingEscrow.toLocaleString()}
                  </div>
                  <div className="mt-1 text-xs text-stone-500">
                    Guaranteed buyer money released upon delivery
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between text-xs">
                <span className="text-stone-500">Bank payouts managed via X-MILE Escrow.</span>
                <Link
                  href="/transaction"
                  className="font-bold text-emerald-800 hover:underline"
                >
                  View Full Statement →
                </Link>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
