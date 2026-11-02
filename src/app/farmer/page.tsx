"use client";

import React, { useState, useEffect, useCallback, useId } from "react";
import Image from "next/image";
import Link from "next/link";
import PlatformHeader from "@/components/PlatformHeader";
import RoleGuard from "@/components/RoleGuard";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { speakText, stopSpeaking } from "@/lib/speech";

export type OrderStatus = "Accepted" | "Dispatched" | "Delivered" | "Disputed" | "Cancelled" | string;

export interface QualityResult {
  grade: "A" | "B" | "C";
  score: number;
  confidence: number;
  observations: string[];
  visibleDefects?: string[];
  suitability?: string;
}

export interface FarmerOrderItem {
  id: string;
  quantity_kg: number;
  inventory_id: string;
  unit_price_per_kg?: number;
  payment_terms?: string;
  total_value?: number;
  fulfilled_value?: number;
  settlement_status?: string;
  payout_confirmed?: boolean;
  escrow_confirmed?: boolean;
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
    offer_id?: string | null;
    listing_id?: string | null;
    price_per_kg?: number | null;
    payout_confirmed?: boolean;
    escrow_confirmed?: boolean;
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
  farmer_id?: string;
  crop_name: string;
  variety?: string | null;
  category?: string;
  quantity_kg: number;
  quality_grade: string;
  asking_price_per_kg: number;
  harvest_date: string;
  pickup_location: string;
  district: string;
  state: string;
  status: string;
  images?: string[];
  created_at?: string;
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
    is_verified?: boolean;
  } | null;
}

export interface LiveFarmPlot {
  id: string;
  plot_code: string;
  area_acres: number;
  soil_type?: string;
  irrigation_source?: string;
  current_crop?: string;
  crop_stage?: string;
  sowing_date?: string;
  expected_harvest_date?: string;
}

export interface LiveFarm {
  id: string;
  name: string;
  total_area_acres: number;
  district: string;
  state: string;
  village?: string | null;
  survey_number?: string | null;
  plots?: LiveFarmPlot[];
}

export interface LiveInventoryItem {
  id: string;
  produce: string;
  quantity_kg: number;
  quality_grade: string;
  reserved_quantity_kg: number;
  status: string;
  available: boolean;
  quality_score?: number | null;
  quality_confidence?: number | null;
  quality_observations?: string[] | null;
  available_quantity_kg?: number;
  listing_id?: string | null;
  created_at?: string;
}

export interface LiveShipment {
  id: string;
  order_id: string;
  origin?: string | null;
  destination: string;
  total_quantity_kg: number;
  current_location?: string | null;
  status: string;
  progress_percentage: number;
  created_at: string;
  updated_at?: string;
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
  { name: "Tomato", hindi: "टमाटर", icon: "🍅", defaultPrice: 24 },
  { name: "Onion", hindi: "प्याज", icon: "🧅", defaultPrice: 28 },
  { name: "Potato", hindi: "आलू", icon: "🥔", defaultPrice: 19 },
  { name: "Chilli", hindi: "मिर्च", icon: "🌶️", defaultPrice: 120 },
  { name: "Wheat", hindi: "गेहूं", icon: "🌾", defaultPrice: 28 },
  { name: "Rice", hindi: "चावल / धान", icon: "🍚", defaultPrice: 34 },
  { name: "Cotton", hindi: "कपास", icon: "☁️", defaultPrice: 75 },
  { name: "Maize", hindi: "मक्का", icon: "🌽", defaultPrice: 21 },
];

export default function FarmerPage() {
  const { locale } = useLanguage();
  const { user, token } = useAuth();
  const photoInputId = useId();

  const [activeTab, setActiveTab] = useState<FarmerTab>("overview");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Data states
  const [farms, setFarms] = useState<LiveFarm[]>([]);
  const [inventory, setInventory] = useState<LiveInventoryItem[]>([]);
  const [listings, setListings] = useState<LiveMarketListing[]>([]);
  const [offers, setOffers] = useState<LiveMarketOffer[]>([]);
  const [orders, setOrders] = useState<FarmerOrderItem[]>([]);
  const [shipments, setShipments] = useState<LiveShipment[]>([]);

  // Produce Listing Form state
  const [selectedProduce, setSelectedProduce] = useState("Tomato");
  const [listingQty, setListingQty] = useState("500");
  const [listingPrice, setListingPrice] = useState("24");
  const [listingGrade, setListingGrade] = useState("A");
  const [listingPickup, setListingPickup] = useState("Tumakuru Farm Gate Hub");
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>("");
  const [publishingListing, setPublishingListing] = useState(false);

  // New Farm Form state
  const [showAddFarmModal, setShowAddFarmModal] = useState(false);
  const [newFarmName, setNewFarmName] = useState("");
  const [newFarmAcres, setNewFarmAcres] = useState("");
  const [newFarmSurvey, setNewFarmSurvey] = useState("");
  const [newFarmVillage, setNewFarmVillage] = useState("");
  const [savingFarm, setSavingFarm] = useState(false);

  // Counter Offer Modal state
  const [counterModalOffer, setCounterModalOffer] = useState<LiveMarketOffer | null>(null);
  const [counterPriceInput, setCounterPriceInput] = useState("");
  const [submittingCounter, setSubmittingCounter] = useState(false);

  // Quality Assessment state
  const [qualityImage, setQualityImage] = useState<File | null>(null);
  const [qualityPreview, setQualityPreview] = useState<string | null>(null);
  const [qualityProduce, setQualityProduce] = useState("Tomato");
  const [qualityResult, setQualityResult] = useState<QualityResult | null>(null);
  const [qualityLoading, setQualityLoading] = useState(false);
  const [addingToInventory, setAddingToInventory] = useState(false);

  // Action in-progress trackers
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Photo select handler
  const handlePhotoSelect = (file: File | null) => {
    if (qualityPreview) {
      URL.revokeObjectURL(qualityPreview);
    }
    setQualityImage(file);
    if (file) {
      setQualityPreview(URL.createObjectURL(file));
    } else {
      setQualityPreview(null);
    }
    setQualityResult(null);
  };

  // Load authoritative farmer data from backend APIs
  const loadFarmerData = useCallback(async () => {
    if (!token) return;
    setLoading(true);

    try {
      const headers = { Authorization: `Bearer ${token}` };

      // 1. Farms and plots
      const farmsRes = await fetch("/api/platform/farms", { headers });
      if (farmsRes.ok) {
        const d = await farmsRes.json();
        if (d.success && Array.isArray(d.farms)) setFarms(d.farms);
      }

      // 2. Real Inventory Lots
      const invRes = await fetch("/api/farmer/inventory", { headers });
      if (invRes.ok) {
        const d = await invRes.json();
        if (d.success && Array.isArray(d.inventory)) setInventory(d.inventory);
      }

      // 3. Farmer's Published Listings
      const listRes = await fetch("/api/platform/marketplace", { headers });
      if (listRes.ok) {
        const d = await listRes.json();
        if (d.success && Array.isArray(d.listings)) {
          // Filter to listings owned by this farmer
          setListings(d.listings.filter((l: LiveMarketListing) => l.farmer_id === user?.id));
        }
      }

      // 4. Incoming Buyer Offers
      const offersRes = await fetch("/api/platform/marketplace/offers?viewAs=farmer", { headers });
      if (offersRes.ok) {
        const d = await offersRes.json();
        if (d.success && Array.isArray(d.offers)) setOffers(d.offers);
      }

      // 5. Confirmed Farmer Orders
      const ordersRes = await fetch("/api/farmer/orders", { headers });
      if (ordersRes.ok) {
        const d = await ordersRes.json();
        if (d.success && Array.isArray(d.orders)) setOrders(d.orders);
      }

      // 6. Linked Shipments / Deliveries
      const shipRes = await fetch("/api/shipments", { headers });
      if (shipRes.ok) {
        const d = await shipRes.json();
        if (d.success && Array.isArray(d.shipments)) setShipments(d.shipments);
      }
    } catch (err) {
      console.warn("Failed to load farmer portal data:", err);
    } finally {
      setLoading(false);
    }
  }, [token, user?.id]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active && token) {
        loadFarmerData();
      }
    });
    return () => {
      active = false;
    };
  }, [token, loadFarmerData]);

  // Voice Guidance
  const handleVoiceGuidance = () => {
    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
      return;
    }

    let speechText = "";
    switch (activeTab) {
      case "overview":
        speechText = "Welcome to the X-MILE Farmer Portal. Use the six big buttons below to manage your farm, sell your crops, view your buyer orders, track mandi deliveries, check crop quality with AI, and view your bank earnings.";
        break;
      case "my-farm":
        speechText = "My Farm section. View your registered land acreage, survey numbers, active plots, and your real harvested crop inventory.";
        break;
      case "sell-crops":
        speechText = "Sell My Crops. Choose your crop, enter the quantity in kilograms and your asking price per kilogram, and tap Publish to Live Marketplace.";
        break;
      case "my-orders":
        speechText = "My Orders section. Review incoming purchase offers from verified commercial buyers. You can accept, reject, or send a counteroffer.";
        break;
      case "track-delivery":
        speechText = "Track Delivery. View assigned transport trucks and follow your harvest from the farm gate all the way to the buyer's destination mandi.";
        break;
      case "check-quality":
        speechText = "Check Crop Quality with AI. Upload a clear photo of your produce. Our artificial intelligence analyzes color, texture, and defects to assign an instant quality grade.";
        break;
      case "my-earnings":
        speechText = "My Earnings. View your total money deposited to your bank account, funds held safely in buyer escrow, and your complete verified sales ledger.";
        break;
    }

    setIsSpeaking(true);
    speakText(speechText, locale, () => setIsSpeaking(false));
  };

  // Handler: Create Farm Profile
  const handleCreateFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSavingFarm(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/platform/farms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newFarmName.trim(),
          totalAreaAcres: Number(newFarmAcres),
          district: user?.district || "Tumakuru",
          state: user?.state || "Karnataka",
          village: newFarmVillage.trim() || undefined,
          surveyNumber: newFarmSurvey.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create farm profile.");
      }

      setFeedback({ type: "success", text: `✓ Farm profile '${newFarmName}' registered successfully!` });
      setShowAddFarmModal(false);
      setNewFarmName("");
      setNewFarmAcres("");
      setNewFarmSurvey("");
      setNewFarmVillage("");
      await loadFarmerData();
    } catch (err: unknown) {
      setFeedback({ type: "error", text: err instanceof Error ? err.message : "Failed to save farm." });
    } finally {
      setSavingFarm(false);
    }
  };

  // Handler: Publish Produce Listing
  const handlePublishListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const qty = Number(listingQty);
    const price = Number(listingPrice);

    if (isNaN(qty) || qty <= 0) {
      setFeedback({ type: "error", text: "Please enter a valid harvest quantity in kg." });
      return;
    }
    if (isNaN(price) || price <= 0) {
      setFeedback({ type: "error", text: "Please enter a valid asking price per kg." });
      return;
    }

    // Check inventory ceiling if linked lot is chosen
    if (selectedInventoryId) {
      const lot = inventory.find((i) => i.id === selectedInventoryId);
      if (lot && qty > (lot.available_quantity_kg ?? lot.quantity_kg)) {
        setFeedback({
          type: "error",
          text: `Listing quantity (${qty} kg) exceeds available unreserved stock in selected lot (${lot.available_quantity_kg ?? lot.quantity_kg} kg).`,
        });
        return;
      }
    }

    setPublishingListing(true);
    setFeedback(null);

    try {
      // Create listing on the marketplace
      const res = await fetch("/api/platform/marketplace", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          cropName: selectedProduce,
          variety: "Standard Lot",
          category: "standard",
          quantityKg: qty,
          qualityGrade: listingGrade,
          askingPricePerKg: price,
          harvestDate: new Date().toISOString().split("T")[0],
          pickupLocation: listingPickup || "Farm Gate Hub",
          district: user?.district || "Tumakuru",
          state: user?.state || "Karnataka",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to publish produce listing.");
      }

      // If no inventory was explicitly selected, auto-record this lot in inventory
      if (!selectedInventoryId) {
        await fetch("/api/farmer/inventory", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            produce: selectedProduce,
            quantityKg: qty,
            qualityGrade: listingGrade,
          }),
        });
      }

      setFeedback({
        type: "success",
        text: `✓ Successfully listed ${qty} kg of ${selectedProduce} on the Live Marketplace at ₹${price}/kg!`,
      });
      await loadFarmerData();
      setActiveTab("my-orders");
    } catch (err: unknown) {
      setFeedback({ type: "error", text: err instanceof Error ? err.message : "Failed to publish listing." });
    } finally {
      setPublishingListing(false);
    }
  };

  // Handler: Withdraw Produce Listing
  const handleWithdrawListing = async (listingId: string) => {
    if (!token) return;
    setActionInProgress(listingId);
    setFeedback(null);

    try {
      const res = await fetch("/api/platform/marketplace", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: listingId,
          status: "CANCELLED",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to withdraw listing.");
      }

      setFeedback({ type: "success", text: "✓ Listing withdrawn from active marketplace." });
      await loadFarmerData();
    } catch (err: unknown) {
      setFeedback({ type: "error", text: err instanceof Error ? err.message : "Failed to withdraw listing." });
    } finally {
      setActionInProgress(null);
    }
  };

  // Handler: Accept Buyer Offer
  const handleAcceptOffer = async (offerId: string) => {
    if (!token) return;
    setActionInProgress(offerId);
    setFeedback(null);

    try {
      const res = await fetch("/api/platform/marketplace/offers", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          offerId,
          action: "ACCEPT",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to accept offer.");
      }

      setFeedback({
        type: "success",
        text: "✓ Buyer offer accepted! Order confirmed, inventory reserved, and transport manifest queued.",
      });
      await loadFarmerData();
    } catch (err: unknown) {
      setFeedback({ type: "error", text: err instanceof Error ? err.message : "Failed to accept offer." });
    } finally {
      setActionInProgress(null);
    }
  };

  // Handler: Reject Buyer Offer
  const handleRejectOffer = async (offerId: string) => {
    if (!token) return;
    setActionInProgress(offerId);
    setFeedback(null);

    try {
      const res = await fetch("/api/platform/marketplace/offers", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          offerId,
          action: "REJECT",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to reject offer.");
      }

      setFeedback({ type: "info", text: "Offer declined." });
      await loadFarmerData();
    } catch (err: unknown) {
      setFeedback({ type: "error", text: err instanceof Error ? err.message : "Failed to reject offer." });
    } finally {
      setActionInProgress(null);
    }
  };

  // Handler: Submit Counteroffer
  const handleSubmitCounteroffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!counterModalOffer || !token) return;
    const price = Number(counterPriceInput);
    if (isNaN(price) || price <= 0) {
      setFeedback({ type: "error", text: "Please enter a valid positive counter price." });
      return;
    }

    setSubmittingCounter(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/platform/marketplace/offers", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          offerId: counterModalOffer.id,
          action: "COUNTER",
          counterPricePerKg: price,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit counteroffer.");
      }

      setFeedback({ type: "success", text: `✓ Counteroffer of ₹${price}/kg transmitted to the buyer!` });
      setCounterModalOffer(null);
      setCounterPriceInput("");
      await loadFarmerData();
    } catch (err: unknown) {
      setFeedback({ type: "error", text: err instanceof Error ? err.message : "Failed to submit counteroffer." });
    } finally {
      setSubmittingCounter(false);
    }
  };

  // Handler: Run AI Quality Assessment
  const handleAnalyzeQuality = async () => {
    if (!qualityImage) {
      setFeedback({ type: "error", text: "Please tap the camera button to select a crop photo first." });
      return;
    }

    setQualityLoading(true);
    setQualityResult(null);
    setFeedback(null);

    try {
      const fd = new FormData();
      fd.append("image", qualityImage);
      fd.append("produce", qualityProduce);

      const res = await fetch("/api/quality", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();
      if (!res.ok || !data.result) {
        throw new Error(data.error || "AI Quality Analysis failed.");
      }

      const parsed: QualityResult = JSON.parse(data.result);
      setQualityResult(parsed);

      speakText(
        `AI Quality Assessment complete. Your ${qualityProduce} is graded Grade ${parsed.grade} with an AI visual score of ${parsed.score} out of 100.`,
        locale
      );
    } catch (err: unknown) {
      setFeedback({ type: "error", text: err instanceof Error ? err.message : "Quality assessment failed." });
    } finally {
      setQualityLoading(false);
    }
  };

  // Handler: Add AI-Graded Lot to Inventory
  const handleSaveQualityToInventory = async () => {
    if (!qualityResult || !token) return;
    setAddingToInventory(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/farmer/inventory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          produce: qualityProduce,
          quantityKg: 500,
          qualityGrade: qualityResult.grade,
          qualityScore: qualityResult.score,
          qualityConfidence: qualityResult.confidence,
          qualityObservations: qualityResult.observations,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to record inventory.");
      }

      setFeedback({
        type: "success",
        text: `✓ Saved 500 kg of Grade-${qualityResult.grade} ${qualityProduce} to your Farm Inventory!`,
      });
      await loadFarmerData();
      setActiveTab("my-farm");
    } catch (err: unknown) {
      setFeedback({ type: "error", text: err instanceof Error ? err.message : "Failed to save inventory." });
    } finally {
      setAddingToInventory(false);
    }
  };

  // Strict Financial Separation & Verification
  const deliveredOrders = orders.filter((o) => o.orders?.status === "Delivered");
  const inTransitOrders = orders.filter(
    (o) => o.orders?.status === "Accepted" || o.orders?.status === "Dispatched"
  );

  // 1. Physical Fulfilled Produce Metrics (Volume kg and Value ₹)
  const totalFulfilledVolumeKg = deliveredOrders.reduce(
    (sum, o) => sum + Number(o.orders?.fulfilled_quantity_kg || o.quantity_kg || 0),
    0
  );

  const totalFulfilledProduceValue = deliveredOrders.reduce((sum, o) => {
    if (typeof o.fulfilled_value === "number") return sum + o.fulfilled_value;
    const rate = o.unit_price_per_kg || o.orders?.price_per_kg || 24;
    const qty = Number(o.orders?.fulfilled_quantity_kg || o.quantity_kg || 0);
    return sum + qty * rate;
  }, 0);

  // 2. Verified Financial Settlement Metrics (NEVER assumed without verified database record)
  // Only orders with explicit confirmed payout receipts count as disbursed to bank
  const totalConfirmedBankDisbursements = orders.reduce((sum, o) => {
    const isDisbursed =
      o.payout_confirmed === true ||
      o.orders?.payout_confirmed === true ||
      o.settlement_status === "DISBURSED";
    if (isDisbursed) {
      return sum + (o.fulfilled_value ?? o.total_value ?? (o.quantity_kg * (o.unit_price_per_kg || 24)));
    }
    return sum;
  }, 0);

  // Only orders with explicit confirmed escrow receipts count as locked in escrow
  const totalConfirmedEscrow = orders.reduce((sum, o) => {
    const isEscrowLocked =
      o.escrow_confirmed === true ||
      o.orders?.escrow_confirmed === true ||
      o.settlement_status === "HELD_IN_ESCROW";
    if (isEscrowLocked) {
      return sum + (o.total_value ?? (o.quantity_kg * (o.unit_price_per_kg || 24)));
    }
    return sum;
  }, 0);

  // Orders awaiting settlement confirmation
  const ordersAwaitingSettlement = deliveredOrders.filter(
    (o) => !(o.payout_confirmed === true || o.settlement_status === "DISBURSED")
  );

  return (
    <RoleGuard allowedRoles={["FARMER", "ADMIN"]} portalName="Farmer Operations Portal">
      <div className="min-h-screen bg-[#f7f8f6] text-stone-900 pb-20">
        <PlatformHeader />

        {/* TOP STATUS BAR */}
        <section className="bg-white border-b border-stone-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-emerald-700 text-white flex items-center justify-center text-2xl shadow-sm">
                🌾
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-stone-900">
                    {user?.fullName || "Kisan Portal"}
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800">
                    Verified Farmer
                  </span>
                </div>
                <p className="text-xs text-stone-500 font-medium">
                  {user?.district || "Tumakuru"}, {user?.state || "Karnataka"} · Primary Farm Hub
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleVoiceGuidance}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm min-h-[48px] ${
                  isSpeaking
                    ? "bg-amber-500 text-white animate-pulse"
                    : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                }`}
              >
                <span>{isSpeaking ? "🔊 Speaking..." : "🔈 Voice Guidance"}</span>
              </button>

              <button
                type="button"
                onClick={() => loadFarmerData()}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-xs font-bold text-stone-700 min-h-[48px] shadow-sm transition"
              >
                {loading ? "Syncing..." : "🔄 Refresh"}
              </button>
            </div>
          </div>

          {/* PRIMARY 6 ACTIONS NAVIGATION BAR */}
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2 scrollbar-none">
              {[
                { id: "overview", label: "Dashboard", icon: "📊" },
                { id: "my-farm", label: "1. My Farm", icon: "🏡" },
                { id: "sell-crops", label: "2. Sell My Crops", icon: "💰" },
                { id: "my-orders", label: "3. My Orders", icon: "📦", badge: offers.filter((o) => o.status === "PENDING").length },
                { id: "track-delivery", label: "4. Track Delivery", icon: "🚚", badge: shipments.filter((s) => s.status !== "Delivered").length },
                { id: "check-quality", label: "5. Crop Quality", icon: "🔬" },
                { id: "my-earnings", label: "6. My Earnings", icon: "💵" },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as FarmerTab)}
                    className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap transition min-h-[48px] ${
                      isActive
                        ? "bg-emerald-800 text-white shadow-md"
                        : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                    {typeof tab.badge === "number" && tab.badge > 0 ? (
                      <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center">
                        {tab.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </nav>
          </div>
        </section>

        {/* FEEDBACK BANNERS */}
        {feedback && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-4">
            <div
              className={`p-4 rounded-2xl flex items-center justify-between text-xs sm:text-sm font-bold border shadow-sm ${
                feedback.type === "success"
                  ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                  : feedback.type === "error"
                  ? "bg-red-50 text-red-900 border-red-200"
                  : "bg-blue-50 text-blue-900 border-blue-200"
              }`}
            >
              <span>{feedback.text}</span>
              <button type="button" onClick={() => setFeedback(null)} className="text-xs font-black px-2 py-1">
                ✕
              </button>
            </div>
          </div>
        )}

        <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
          {/* TAB 0: OVERVIEW (THE 6 BIG CORE ACTION CARDS) */}
          {activeTab === "overview" && (
            <div className="space-y-8">
              {/* 6 LARGE PRIMARY TOUCH CARDS */}
              <div>
                <h2 className="text-lg font-black text-stone-900 mb-1">Select an Action</h2>
                <p className="text-xs text-stone-500 mb-4">
                  Tap any of the 6 primary tasks below to manage your harvest and sales:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Card 1: My Farm */}
                  <button
                    type="button"
                    onClick={() => setActiveTab("my-farm")}
                    className="p-6 rounded-3xl bg-white border border-stone-200 text-left hover:border-emerald-600 hover:shadow-lg transition min-h-[140px] flex flex-col justify-between group"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-3xl p-3 bg-emerald-50 rounded-2xl">🏡</span>
                      <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
                        {farms.length} Registered Farms
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base font-black text-stone-900 group-hover:text-emerald-800 transition">
                        1. My Farm
                      </h3>
                      <p className="text-xs text-stone-500 mt-1">
                        View land details, survey numbers, crops & harvested stock.
                      </p>
                    </div>
                  </button>

                  {/* Card 2: Sell My Crops */}
                  <button
                    type="button"
                    onClick={() => setActiveTab("sell-crops")}
                    className="p-6 rounded-3xl bg-white border border-stone-200 text-left hover:border-emerald-600 hover:shadow-lg transition min-h-[140px] flex flex-col justify-between group"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-3xl p-3 bg-amber-50 rounded-2xl">💰</span>
                      <span className="text-xs font-black text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full">
                        {listings.filter((l) => l.status === "ACTIVE").length} Active Listings
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base font-black text-stone-900 group-hover:text-emerald-800 transition">
                        2. Sell My Crops
                      </h3>
                      <p className="text-xs text-stone-500 mt-1">
                        List fresh produce for sale to commercial mandi buyers.
                      </p>
                    </div>
                  </button>

                  {/* Card 3: My Orders */}
                  <button
                    type="button"
                    onClick={() => setActiveTab("my-orders")}
                    className="p-6 rounded-3xl bg-white border border-stone-200 text-left hover:border-emerald-600 hover:shadow-lg transition min-h-[140px] flex flex-col justify-between group"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-3xl p-3 bg-blue-50 rounded-2xl">📦</span>
                      <span className="text-xs font-black text-blue-800 bg-blue-100 px-2.5 py-1 rounded-full">
                        {offers.filter((o) => o.status === "PENDING").length} New Offers
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base font-black text-stone-900 group-hover:text-emerald-800 transition">
                        3. My Orders
                      </h3>
                      <p className="text-xs text-stone-500 mt-1">
                        Review incoming buyer offers, accept terms, and track orders.
                      </p>
                    </div>
                  </button>

                  {/* Card 4: Track My Delivery */}
                  <button
                    type="button"
                    onClick={() => setActiveTab("track-delivery")}
                    className="p-6 rounded-3xl bg-white border border-stone-200 text-left hover:border-emerald-600 hover:shadow-lg transition min-h-[140px] flex flex-col justify-between group"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-3xl p-3 bg-purple-50 rounded-2xl">🚚</span>
                      <span className="text-xs font-black text-purple-800 bg-purple-100 px-2.5 py-1 rounded-full">
                        {shipments.filter((s) => s.status !== "Delivered").length} Live Shipments
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base font-black text-stone-900 group-hover:text-emerald-800 transition">
                        4. Track Delivery
                      </h3>
                      <p className="text-xs text-stone-500 mt-1">
                        Follow assigned transport vehicles from farm gate to mandi.
                      </p>
                    </div>
                  </button>

                  {/* Card 5: Check Crop Quality */}
                  <button
                    type="button"
                    onClick={() => setActiveTab("check-quality")}
                    className="p-6 rounded-3xl bg-white border border-stone-200 text-left hover:border-emerald-600 hover:shadow-lg transition min-h-[140px] flex flex-col justify-between group"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-3xl p-3 bg-emerald-50 rounded-2xl">🔬</span>
                      <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
                        AI Multimodal
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base font-black text-stone-900 group-hover:text-emerald-800 transition">
                        5. Crop Quality
                      </h3>
                      <p className="text-xs text-stone-500 mt-1">
                        Take a photo for instant AI Grade A / B / C visual analysis.
                      </p>
                    </div>
                  </button>

                  {/* Card 6: My Earnings */}
                  <button
                    type="button"
                    onClick={() => setActiveTab("my-earnings")}
                    className="p-6 rounded-3xl bg-white border border-stone-200 text-left hover:border-emerald-600 hover:shadow-lg transition min-h-[140px] flex flex-col justify-between group"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-3xl p-3 bg-emerald-50 rounded-2xl">💵</span>
                      <span
                        className={`text-xs font-black px-2.5 py-1 rounded-full ${
                          totalConfirmedBankDisbursements > 0
                            ? "text-emerald-900 bg-emerald-100"
                            : totalFulfilledProduceValue > 0
                            ? "text-amber-900 bg-amber-100"
                            : "text-stone-700 bg-stone-100"
                        }`}
                      >
                        {totalConfirmedBankDisbursements > 0
                          ? `₹${totalConfirmedBankDisbursements.toLocaleString("en-IN")} Disbursed`
                          : totalFulfilledProduceValue > 0
                          ? `₹${totalFulfilledProduceValue.toLocaleString("en-IN")} Fulfilled · Awaiting settlement`
                          : "₹0 Confirmed"}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base font-black text-stone-900 group-hover:text-emerald-800 transition">
                        6. My Earnings
                      </h3>
                      <p className="text-xs text-stone-500 mt-1">
                        Check completed sales, verified bank payouts, and escrow settlement status.
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* SECONDARY SERVICES SECTION (ISOLATED) */}
              <div className="p-6 rounded-3xl bg-stone-100/80 border border-stone-200">
                <h3 className="text-xs font-black uppercase tracking-wider text-stone-600 mb-3">
                  Secondary Agricultural Services
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Link
                    href="/forecast"
                    className="p-4 rounded-2xl bg-white border border-stone-200 hover:border-emerald-600 transition flex items-center gap-3"
                  >
                    <span className="text-2xl">🌦️</span>
                    <div>
                      <div className="text-xs font-black text-stone-900">Weather & Rain Forecast</div>
                      <div className="text-[11px] text-stone-500">Mandi rainfall prediction</div>
                    </div>
                  </Link>
                  <Link
                    href="/schemes"
                    className="p-4 rounded-2xl bg-white border border-stone-200 hover:border-emerald-600 transition flex items-center gap-3"
                  >
                    <span className="text-2xl">📜</span>
                    <div>
                      <div className="text-xs font-black text-stone-900">Government Subsidies</div>
                      <div className="text-[11px] text-stone-500">PM-Kisan & state schemes</div>
                    </div>
                  </Link>
                  <Link
                    href="/crop-triage"
                    className="p-4 rounded-2xl bg-white border border-stone-200 hover:border-emerald-600 transition flex items-center gap-3"
                  >
                    <span className="text-2xl">👨‍🌾</span>
                    <div>
                      <div className="text-xs font-black text-stone-900">Agronomist Advisory</div>
                      <div className="text-[11px] text-stone-500">Pest & crop diagnostics</div>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: MY FARM (DATABASE-BACKED LAND, PLOTS, AND REAL INVENTORY) */}
          {activeTab === "my-farm" && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-stone-900">🏡 My Farm & Production Records</h2>
                  <p className="text-xs text-stone-500">
                    Real database records for your registered land, plots, and inventory stock.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddFarmModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-emerald-800 text-white text-xs font-bold shadow-md hover:bg-emerald-900 min-h-[48px] transition"
                >
                  + Add New Farm Profile
                </button>
              </div>

              {/* FARM PROFILES LIST */}
              {farms.length === 0 ? (
                <div className="p-8 rounded-3xl bg-white border border-stone-200 text-center space-y-3">
                  <span className="text-4xl">🌾</span>
                  <h3 className="text-base font-black text-stone-900">No Farm Profile Registered Yet</h3>
                  <p className="text-xs text-stone-500 max-w-sm mx-auto">
                    Register your land acreage and survey numbers so buyers can verify your farm location.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAddFarmModal(true)}
                    className="px-6 py-2.5 rounded-xl bg-emerald-800 text-white text-xs font-black min-h-[48px]"
                  >
                    Register Your First Farm →
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {farms.map((farm) => (
                    <div key={farm.id} className="p-6 rounded-3xl bg-white border border-stone-200 space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-base font-black text-stone-900">{farm.name}</h3>
                          <p className="text-xs text-stone-500">
                            {farm.village ? `${farm.village}, ` : ""}{farm.district}, {farm.state}
                          </p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-800">
                          {farm.total_area_acres} Acres
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-3 bg-stone-50 rounded-xl">
                          <span className="text-stone-400 block text-[10px] font-bold">Survey No:</span>
                          <span className="font-bold text-stone-900">{farm.survey_number || "Verified Pahani"}</span>
                        </div>
                        <div className="p-3 bg-stone-50 rounded-xl">
                          <span className="text-stone-400 block text-[10px] font-bold">Active Plots:</span>
                          <span className="font-bold text-stone-900">{farm.plots?.length || 0} Plot Records</span>
                        </div>
                      </div>

                      {farm.plots && farm.plots.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-stone-100">
                          <span className="text-[11px] font-bold text-stone-500 block">Cultivation Plots:</span>
                          <div className="space-y-1.5">
                            {farm.plots.map((plot) => (
                              <div
                                key={plot.id}
                                className="p-2.5 rounded-xl bg-stone-50 border border-stone-100 flex items-center justify-between text-xs"
                              >
                                <div>
                                  <span className="font-black text-stone-800">{plot.plot_code}</span>
                                  <span className="text-stone-500 ml-2">({plot.area_acres} ac)</span>
                                </div>
                                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                  {plot.current_crop || "Standing Crop"} · {plot.crop_stage || "Cultivation"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* REAL FARM INVENTORY LOTS */}
              <div className="mt-8 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black text-stone-900">📦 Harvested Inventory in Stock</h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab("check-quality")}
                    className="text-xs font-bold text-emerald-800 hover:underline"
                  >
                    + Grade & Add Produce
                  </button>
                </div>

                {inventory.length === 0 ? (
                  <div className="p-8 rounded-3xl bg-white border border-stone-200 text-center space-y-2">
                    <p className="text-xs text-stone-500">No inventory recorded in database yet.</p>
                    <button
                      type="button"
                      onClick={() => setActiveTab("sell-crops")}
                      className="px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold"
                    >
                      Record Harvest Stock →
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {inventory.map((item) => (
                      <div key={item.id} className="p-5 rounded-2xl bg-white border border-stone-200 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-black text-stone-900">{item.produce}</span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                              item.quality_grade === "A"
                                ? "bg-emerald-100 text-emerald-800"
                                : item.quality_grade === "B"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            Grade {item.quality_grade}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-stone-500">Available Stock:</span>
                          <span className="font-bold text-stone-900">
                            {item.available_quantity_kg ?? item.quantity_kg} kg
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-stone-500">Reserved for Orders:</span>
                          <span className="font-bold text-amber-700">{item.reserved_quantity_kg || 0} kg</span>
                        </div>
                        <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px]">
                          <span className="text-stone-400">
                            Status: <strong className="text-stone-700">{item.status}</strong>
                          </span>
                          {item.listing_id && (
                            <span className="text-emerald-700 font-bold">✓ Listed for Sale</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: SELL MY CROPS (PUBLISH PRODUCE LISTING TO LIVE MARKETPLACE) */}
          {activeTab === "sell-crops" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* PUBLISH FORM */}
              <div className="lg:col-span-2 p-6 sm:p-8 rounded-3xl bg-white border border-stone-200 space-y-6">
                <div>
                  <h2 className="text-xl font-black text-stone-900">💰 Publish Produce for Sale</h2>
                  <p className="text-xs text-stone-500">
                    List your harvest to verified commercial mandi buyers across India.
                  </p>
                </div>

                <form onSubmit={handlePublishListing} className="space-y-5">
                  {/* Common Crops Quick Selector */}
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-stone-700 mb-2">
                      Select Your Crop:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {COMMON_CROPS.map((crop) => {
                        const isSelected = selectedProduce === crop.name;
                        return (
                          <button
                            key={crop.name}
                            type="button"
                            onClick={() => {
                              setSelectedProduce(crop.name);
                              setListingPrice(String(crop.defaultPrice));
                            }}
                            className={`p-3 rounded-2xl border text-left flex items-center gap-2 transition min-h-[48px] ${
                              isSelected
                                ? "bg-emerald-50 border-emerald-600 text-emerald-900 font-black shadow-sm"
                                : "bg-white border-stone-200 text-stone-700 hover:bg-stone-50"
                            }`}
                          >
                            <span className="text-xl">{crop.icon}</span>
                            <div>
                              <div className="text-xs font-bold leading-tight">{crop.name}</div>
                              <div className="text-[10px] text-stone-400">{crop.hindi}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quantity & Asking Rate */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-stone-700 mb-1">
                        Available Harvest Quantity (kg):
                      </label>
                      <input
                        type="number"
                        min="10"
                        max="100000"
                        required
                        value={listingQty}
                        onChange={(e) => setListingQty(e.target.value)}
                        placeholder="e.g. 500"
                        className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm font-bold text-stone-900 focus:border-emerald-600 focus:outline-none min-h-[48px]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-stone-700 mb-1">
                        Asking Price (₹ / kg):
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="5000"
                        required
                        value={listingPrice}
                        onChange={(e) => setListingPrice(e.target.value)}
                        placeholder="e.g. 24"
                        className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm font-bold text-stone-900 focus:border-emerald-600 focus:outline-none min-h-[48px]"
                      />
                    </div>
                  </div>

                  {/* Quality Grade & Location */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-stone-700 mb-1">
                        Supported Quality Grade:
                      </label>
                      <select
                        value={listingGrade}
                        onChange={(e) => setListingGrade(e.target.value)}
                        className="w-full rounded-xl border border-stone-200 px-3 py-3 text-xs font-bold text-stone-800 focus:border-emerald-600 focus:outline-none min-h-[48px]"
                      >
                        <option value="A">Grade A (Premium / Export Quality)</option>
                        <option value="B">Grade B (Standard Mandi Quality)</option>
                        <option value="C">Grade C (Processing / Bulk Lot)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-stone-700 mb-1">
                        Farm Gate / Pickup Location:
                      </label>
                      <input
                        type="text"
                        required
                        value={listingPickup}
                        onChange={(e) => setListingPickup(e.target.value)}
                        placeholder="e.g. Tumakuru Mandi Gate 2"
                        className="w-full rounded-xl border border-stone-200 px-3 py-3 text-xs font-bold text-stone-800 focus:border-emerald-600 focus:outline-none min-h-[48px]"
                      />
                    </div>
                  </div>

                  {/* Optional: Select from existing inventory */}
                  {inventory.length > 0 && (
                    <div>
                      <label className="block text-xs font-bold text-stone-600 mb-1">
                        Link to Existing Farm Inventory Lot (Optional):
                      </label>
                      <select
                        value={selectedInventoryId}
                        onChange={(e) => {
                          const lotId = e.target.value;
                          setSelectedInventoryId(lotId);
                          const chosen = inventory.find((i) => i.id === lotId);
                          if (chosen) {
                            setSelectedProduce(chosen.produce);
                            setListingQty(String(chosen.available_quantity_kg ?? chosen.quantity_kg));
                            setListingGrade(chosen.quality_grade);
                          }
                        }}
                        className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-xs text-stone-700 focus:border-emerald-600 focus:outline-none"
                      >
                        <option value="">-- Create new harvest lot automatically --</option>
                        {inventory.map((inv) => (
                          <option key={inv.id} value={inv.id}>
                            {inv.produce} (Grade {inv.quality_grade}, Available: {inv.available_quantity_kg ?? inv.quantity_kg} kg)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Total Value Computation */}
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex justify-between items-center">
                    <span className="text-xs font-black text-emerald-900">Total Estimated Sale Value:</span>
                    <span className="text-lg font-black text-emerald-950">
                      ₹{((Number(listingQty) || 0) * (Number(listingPrice) || 0)).toLocaleString("en-IN")}
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={publishingListing}
                    className="w-full py-4 rounded-2xl bg-emerald-800 hover:bg-emerald-900 text-white font-black text-sm shadow-md transition disabled:opacity-50 min-h-[52px]"
                  >
                    {publishingListing ? "Publishing to Marketplace..." : "Publish to Live Marketplace →"}
                  </button>
                </form>
              </div>

              {/* CURRENT ACTIVE LISTINGS */}
              <div className="space-y-4">
                <h3 className="text-sm font-black text-stone-900">My Active Produce Listings</h3>
                {listings.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-white border border-stone-200 text-center text-xs text-stone-500">
                    No active listings published right now. Use the form to list your first harvest.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {listings.map((l) => (
                      <div key={l.id} className="p-4 rounded-2xl bg-white border border-stone-200 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-black text-stone-900">{l.crop_name}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              l.status === "ACTIVE"
                                ? "bg-emerald-100 text-emerald-800"
                                : l.status === "FULFILLED"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-stone-100 text-stone-600"
                            }`}
                          >
                            {l.status}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs text-stone-600">
                          <span>Quantity:</span>
                          <span className="font-bold text-stone-900">{l.quantity_kg} kg</span>
                        </div>
                        <div className="flex justify-between text-xs text-stone-600">
                          <span>Asking Rate:</span>
                          <span className="font-bold text-emerald-800">₹{l.asking_price_per_kg}/kg</span>
                        </div>
                        {l.status === "ACTIVE" && (
                          <div className="pt-2 border-t border-stone-100 flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleWithdrawListing(l.id)}
                              disabled={actionInProgress === l.id}
                              className="text-xs font-bold text-red-600 hover:text-red-700 min-h-[36px]"
                            >
                              {actionInProgress === l.id ? "Withdrawing..." : "Withdraw Listing"}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: MY ORDERS (BUYER OFFERS & CONFIRMED ORDERS) */}
          {activeTab === "my-orders" && (
            <div className="space-y-8">
              {/* INCOMING BUYER OFFERS */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black text-stone-900">📦 Incoming Buyer Purchase Offers</h2>
                    <p className="text-xs text-stone-500">
                      Commercial buyers offering to purchase your harvest. Accept, counter, or decline.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-800">
                    {offers.length} Offers
                  </span>
                </div>

                {offers.length === 0 ? (
                  <div className="p-8 rounded-3xl bg-white border border-stone-200 text-center space-y-2">
                    <p className="text-xs text-stone-500">No incoming offers on your produce right now.</p>
                    <p className="text-[11px] text-stone-400">
                      When buyers submit offers on your listings, they will appear here with instant accept/counter actions.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {offers.map((offer) => (
                      <div key={offer.id} className="p-6 rounded-3xl bg-white border border-stone-200 space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-xs font-bold text-stone-400">Buyer Offer</span>
                            <h3 className="text-base font-black text-stone-900">
                              {offer.buyer_profiles?.full_name || "Commercial APMC Buyer"}
                            </h3>
                            <p className="text-xs text-stone-500">Destination: {offer.destination_city}</p>
                          </div>
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-black uppercase ${
                              offer.status === "PENDING"
                                ? "bg-amber-100 text-amber-800"
                                : offer.status === "ACCEPTED"
                                ? "bg-emerald-100 text-emerald-800"
                                : offer.status === "COUNTERED"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-stone-100 text-stone-600"
                            }`}
                          >
                            {offer.status}
                          </span>
                        </div>

                        <div className="p-3 bg-stone-50 rounded-2xl grid grid-cols-3 gap-2 text-center text-xs">
                          <div>
                            <span className="text-[10px] text-stone-400 block font-bold">Quantity</span>
                            <span className="font-black text-stone-900">{offer.offered_quantity_kg} kg</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-stone-400 block font-bold">Offered Rate</span>
                            <span className="font-black text-emerald-800">₹{offer.offered_price_per_kg}/kg</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-stone-400 block font-bold">Total Payout</span>
                            <span className="font-black text-stone-900">
                              ₹{(Number(offer.offered_quantity_kg) * Number(offer.offered_price_per_kg)).toLocaleString("en-IN")}
                            </span>
                          </div>
                        </div>

                        {offer.status === "PENDING" && (
                          <div className="grid grid-cols-3 gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => handleAcceptOffer(offer.id)}
                              disabled={actionInProgress === offer.id}
                              className="py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-black text-xs shadow-sm transition min-h-[48px]"
                            >
                              {actionInProgress === offer.id ? "Accepting..." : "Accept Offer"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setCounterModalOffer(offer);
                                setCounterPriceInput(String(offer.offered_price_per_kg));
                              }}
                              className="py-2.5 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-800 font-bold text-xs min-h-[48px]"
                            >
                              Counter Offer
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectOffer(offer.id)}
                              disabled={actionInProgress === offer.id}
                              className="py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-bold text-xs min-h-[48px]"
                            >
                              Decline
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* CONFIRMED CONTRACTS & ORDERS */}
              <div className="space-y-4 pt-6 border-t border-stone-200">
                <h2 className="text-xl font-black text-stone-900">📑 Confirmed Orders & Fulfillments</h2>
                {orders.length === 0 ? (
                  <div className="p-8 rounded-3xl bg-white border border-stone-200 text-center text-xs text-stone-500">
                    No confirmed orders yet. Accepted buyer offers will transition here automatically.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orders.map((item) => (
                      <div
                        key={item.id}
                        className="p-5 rounded-2xl bg-white border border-stone-200 flex flex-wrap items-center justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-stone-400">
                              #{item.orders?.id.slice(0, 8)}
                            </span>
                            <span className="text-sm font-black text-stone-900">
                              {item.orders?.produce} (Grade {item.orders?.required_grade})
                            </span>
                          </div>
                          <p className="text-xs text-stone-500 mt-0.5">
                            Buyer: <strong>{item.orders?.buyer_name}</strong> · Dest: {item.orders?.destination}
                          </p>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <span className="text-xs font-black text-stone-900 block">
                              {item.orders?.fulfilled_quantity_kg || item.quantity_kg} kg
                            </span>
                            <span className="text-[11px] text-emerald-800 font-bold">
                              ₹{(item.total_value ?? (item.quantity_kg * (item.unit_price_per_kg || 24))).toLocaleString("en-IN")}
                            </span>
                          </div>

                          <span
                            className={`px-3 py-1 rounded-full text-xs font-black ${
                              item.orders?.status === "Delivered"
                                ? "bg-emerald-100 text-emerald-800"
                                : item.orders?.status === "Dispatched"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {item.orders?.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: TRACK DELIVERY (REAL SHIPMENTS) */}
          {activeTab === "track-delivery" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-black text-stone-900">🚚 Track My Delivery</h2>
                <p className="text-xs text-stone-500">
                  Real logistics records for produce dispatched from your farm gate to the buyer mandi.
                </p>
              </div>

              {shipments.length === 0 ? (
                <div className="p-8 rounded-3xl bg-white border border-stone-200 text-center space-y-2">
                  <span className="text-4xl">🚛</span>
                  <h3 className="text-base font-black text-stone-900">No Active Shipments in Transit</h3>
                  <p className="text-xs text-stone-500 max-w-md mx-auto">
                    When you accept a buyer offer and haulage is assigned, live vehicle dispatch manifests will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {shipments.map((shipment) => (
                    <div key={shipment.id} className="p-6 rounded-3xl bg-white border border-stone-200 space-y-4">
                      <div className="flex flex-wrap justify-between items-center gap-2">
                        <div>
                          <span className="text-xs font-mono font-bold text-stone-400">
                            Tracking #{shipment.id.slice(0, 8)}
                          </span>
                          <h3 className="text-base font-black text-stone-900">
                            {shipment.origin || "Farm Gate"} → {shipment.destination}
                          </h3>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-black ${
                            shipment.status === "Delivered"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-purple-100 text-purple-800"
                          }`}
                        >
                          {shipment.status}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div>
                        <div className="flex justify-between text-xs font-bold text-stone-500 mb-1">
                          <span>Dispatch Progress</span>
                          <span>{shipment.progress_percentage}%</span>
                        </div>
                        <div className="w-full bg-stone-100 rounded-full h-3 overflow-hidden">
                          <div
                            className="bg-emerald-600 h-3 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(5, shipment.progress_percentage)}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-stone-50 p-4 rounded-2xl">
                        <div>
                          <span className="text-stone-400 block text-[10px] font-bold">Haulage Load:</span>
                          <span className="font-bold text-stone-900">{shipment.total_quantity_kg} kg</span>
                        </div>
                        <div>
                          <span className="text-stone-400 block text-[10px] font-bold">Current Location:</span>
                          <span className="font-bold text-stone-900">
                            {shipment.current_location || "En Route to Mandi"}
                          </span>
                        </div>
                        <div>
                          <span className="text-stone-400 block text-[10px] font-bold">Dispatched At:</span>
                          <span className="font-bold text-stone-900">
                            {new Date(shipment.created_at).toLocaleDateString("en-IN")}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: CHECK CROP QUALITY (REAL GEMINI AI MULTIMODAL ASSESSMENT) */}
          {activeTab === "check-quality" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* PHOTO UPLOAD & CAPTURE */}
              <div className="p-6 sm:p-8 rounded-3xl bg-white border border-stone-200 space-y-6">
                <div>
                  <h2 className="text-xl font-black text-stone-900">🔬 AI Crop Quality Grading</h2>
                  <p className="text-xs text-stone-500">
                    Upload a photo of your harvest for instant visual grading and defect analysis.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-stone-700 mb-1">
                      Declared Crop Type:
                    </label>
                    <select
                      value={qualityProduce}
                      onChange={(e) => setQualityProduce(e.target.value)}
                      className="w-full rounded-xl border border-stone-200 px-3 py-3 text-xs font-bold text-stone-800 min-h-[48px]"
                    >
                      {COMMON_CROPS.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.icon} {c.name} ({c.hindi})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-stone-700 mb-2">
                      Upload Crop Photo:
                    </label>
                    <div className="border-2 border-dashed border-stone-200 rounded-3xl p-6 text-center hover:border-emerald-600 transition">
                      {qualityPreview ? (
                        <div className="space-y-3">
                          <Image
                            src={qualityPreview}
                            alt="Crop Preview"
                            width={320}
                            height={240}
                            unoptimized
                            className="max-h-60 mx-auto rounded-2xl object-cover shadow-sm"
                          />
                          <button
                            type="button"
                            onClick={() => handlePhotoSelect(null)}
                            className="text-xs font-bold text-red-600 hover:underline"
                          >
                            Remove photo
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <span className="text-4xl block">📸</span>
                          <p className="text-xs font-bold text-stone-700">
                            Take a clear photo of your harvest in good lighting
                          </p>
                          <label
                            htmlFor={photoInputId}
                            className="inline-block px-5 py-3 rounded-2xl bg-emerald-800 hover:bg-emerald-900 text-white font-black text-xs cursor-pointer shadow-md min-h-[48px]"
                          >
                            Choose Photo / Open Camera
                          </label>
                          <input
                            id={photoInputId}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handlePhotoSelect(e.target.files[0]);
                              }
                            }}
                            className="hidden"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAnalyzeQuality}
                    disabled={!qualityImage || qualityLoading}
                    className="w-full py-4 rounded-2xl bg-emerald-800 hover:bg-emerald-900 text-white font-black text-sm shadow-md transition disabled:opacity-50 min-h-[52px]"
                  >
                    {qualityLoading ? "Running AI Visual Inspection..." : "Analyze Crop Quality with AI 🔍"}
                  </button>
                </div>
              </div>

              {/* AI QUALITY RESULTS */}
              <div className="p-6 sm:p-8 rounded-3xl bg-white border border-stone-200 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-stone-900">Grading Assessment Report</h3>
                  <span className="text-[11px] font-bold text-stone-400">Gemini Multimodal</span>
                </div>

                {!qualityResult ? (
                  <div className="p-8 rounded-2xl bg-stone-50 border border-stone-100 text-center text-xs text-stone-500 space-y-2">
                    <span className="text-3xl block">🔬</span>
                    <p>No assessment performed yet. Upload a photo and tap &apos;Analyze Crop Quality with AI&apos;.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Grade Badge */}
                    <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 block">
                        Assigned Visual Quality Grade
                      </span>
                      <div className="text-5xl font-black text-emerald-950">
                        Grade {qualityResult.grade}
                      </div>
                      <div className="text-xs font-bold text-emerald-800">
                        Visual Score: <strong>{qualityResult.score} / 100</strong> · Confidence:{" "}
                        <strong>{qualityResult.confidence}%</strong>
                      </div>
                    </div>

                    {/* Observations */}
                    <div className="space-y-2">
                      <span className="text-xs font-black text-stone-700 block">AI Visual Observations:</span>
                      <ul className="space-y-1 text-xs text-stone-600">
                        {qualityResult.observations.map((obs, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-emerald-600 font-bold">✓</span>
                            <span>{obs}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Defect Analysis */}
                    {qualityResult.visibleDefects && qualityResult.visibleDefects.length > 0 && (
                      <div className="space-y-1 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs">
                        <span className="font-black text-amber-900 block">Defects / Variances Noticed:</span>
                        <ul className="text-amber-800 space-y-0.5">
                          {qualityResult.visibleDefects.map((def, idx) => (
                            <li key={idx}>· {def}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Regulatory Disclaimer */}
                    <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-[11px] text-stone-500">
                      ℹ️ <strong>AI Visual Assessment Notice:</strong> Visual grading is indicative. For formal certified laboratory assay certificates, visit an accredited district APMC laboratory.
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveQualityToInventory}
                      disabled={addingToInventory}
                      className="w-full py-3.5 rounded-xl bg-stone-900 hover:bg-black text-white font-black text-xs shadow-md transition disabled:opacity-50 min-h-[48px]"
                    >
                      {addingToInventory ? "Saving to Inventory..." : "+ Add Graded Lot to My Farm Inventory"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: MY EARNINGS (REAL FINANCIAL SETTLEMENTS & ESCROW) */}
          {activeTab === "my-earnings" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-black text-stone-900">💵 My Verified Earnings & Settlements</h2>
                <p className="text-xs text-stone-500">
                  Real transaction payouts and escrow settlements supported by the X-MILE ledger.
                </p>
              </div>

              {/* SUMMARY STATS - STRICT FINANCIAL SEPARATION */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Fulfilled Produce Value */}
                <div className="p-6 rounded-3xl bg-white border border-stone-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-400 block uppercase">Fulfilled Produce Value</span>
                    {ordersAwaitingSettlement.length > 0 && (
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                        Awaiting settlement
                      </span>
                    )}
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-stone-900 mt-2">
                    ₹{totalFulfilledProduceValue.toLocaleString("en-IN")}
                  </div>
                  <span className="text-[11px] text-stone-500 mt-1 block">
                    {deliveredOrders.length > 0
                      ? `From ${deliveredOrders.length} completed deliveries (${ordersAwaitingSettlement.length} awaiting settlement confirmation)`
                      : "No completed delivery fulfillments yet"}
                  </span>
                </div>

                {/* 2. Disbursed to Bank */}
                <div className="p-6 rounded-3xl bg-white border border-stone-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-400 block uppercase">Disbursed to Bank</span>
                    {totalConfirmedBankDisbursements > 0 ? (
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Confirmed
                      </span>
                    ) : (
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                        Unconfirmed
                      </span>
                    )}
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-800 mt-2">
                    ₹{totalConfirmedBankDisbursements.toLocaleString("en-IN")}
                  </div>
                  <span className="text-[11px] text-stone-500 mt-1 block">
                    {totalConfirmedBankDisbursements > 0
                      ? "Verified bank payout receipts deposited"
                      : "Awaiting settlement confirmation from banking network"}
                  </span>
                </div>

                {/* 3. Held in Escrow */}
                <div className="p-6 rounded-3xl bg-white border border-stone-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-400 block uppercase">Held in Escrow</span>
                    {totalConfirmedEscrow > 0 ? (
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                        Protected
                      </span>
                    ) : (
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                        Unconfirmed
                      </span>
                    )}
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-blue-900 mt-2">
                    ₹{totalConfirmedEscrow.toLocaleString("en-IN")}
                  </div>
                  <span className="text-[11px] text-stone-500 mt-1 block">
                    {totalConfirmedEscrow > 0
                      ? "Verified buyer funds held in escrow trust"
                      : inTransitOrders.length > 0
                      ? "In transit · Awaiting escrow deposit confirmation"
                      : "No active verified escrow holdings"}
                  </span>
                </div>

                {/* 4. Total Fulfilled Volume */}
                <div className="p-6 rounded-3xl bg-white border border-stone-200">
                  <span className="text-xs font-bold text-stone-400 block uppercase">Total Fulfilled Volume</span>
                  <div className="text-2xl sm:text-3xl font-black text-stone-900 mt-2">
                    {totalFulfilledVolumeKg.toLocaleString("en-IN")} kg
                  </div>
                  <span className="text-[11px] text-stone-500 mt-1 block">
                    Verified weighbridge deliveries
                  </span>
                </div>
              </div>

              {/* REAL TRANSACTION LEDGER */}
              <div className="p-6 sm:p-8 rounded-3xl bg-white border border-stone-200 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-black text-stone-900">Settlement Ledger</h3>
                  <span className="text-[11px] text-stone-500 font-medium">
                    Strict verification: bank payouts and escrow holdings require confirmed ledger receipts
                  </span>
                </div>

                {orders.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-stone-50 text-center text-xs text-stone-500">
                    No transaction records found yet. Completed sales will generate automated settlement entries.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-stone-200 text-stone-400 uppercase text-[10px] font-bold">
                          <th className="pb-3">Date</th>
                          <th className="pb-3">Order ID</th>
                          <th className="pb-3">Buyer</th>
                          <th className="pb-3">Produce</th>
                          <th className="pb-3">Quantity</th>
                          <th className="pb-3">Rate</th>
                          <th className="pb-3">Delivered Value</th>
                          <th className="pb-3">Settlement / Payout Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 font-medium">
                        {orders.map((item) => {
                          const isDelivered = item.orders?.status === "Delivered";
                          const isInTransit = item.orders?.status === "Accepted" || item.orders?.status === "Dispatched";
                          const isCancelled = item.orders?.status === "Cancelled" || item.settlement_status === "REFUNDED";
                          const isDisputed = item.orders?.status === "Disputed" || item.settlement_status === "DISPUTED";
                          const isPayoutConfirmed = Boolean(
                            item.payout_confirmed ||
                            item.orders?.payout_confirmed ||
                            item.settlement_status === "DISBURSED"
                          );
                          const isEscrowConfirmed = Boolean(
                            item.escrow_confirmed ||
                            item.orders?.escrow_confirmed ||
                            item.settlement_status === "HELD_IN_ESCROW"
                          );

                          const unitRate = item.unit_price_per_kg || item.orders?.price_per_kg || 24;
                          const totalAmt = item.total_value ?? (item.quantity_kg * unitRate);
                          const fulfilledQty = Number(item.orders?.fulfilled_quantity_kg) || 0;
                          const displayQty = isDelivered ? (fulfilledQty || item.quantity_kg) : item.quantity_kg;
                          const deliveredVal = item.fulfilled_value ?? (isDelivered ? displayQty * unitRate : 0);

                          return (
                            <tr key={item.id} className="hover:bg-stone-50 transition">
                              <td className="py-3 text-stone-500">
                                {item.orders?.created_at
                                  ? new Date(item.orders.created_at).toLocaleDateString("en-IN")
                                  : "2026-11-02"}
                              </td>
                              <td className="py-3 font-mono text-stone-900">
                                #{item.orders?.id.slice(0, 8)}
                              </td>
                              <td className="py-3 font-bold text-stone-800">
                                {item.orders?.buyer_name || "Commercial Buyer"}
                              </td>
                              <td className="py-3">{item.orders?.produce}</td>
                              <td className="py-3 font-bold text-stone-900">{displayQty} kg</td>
                              <td className="py-3 text-emerald-800 font-bold">₹{unitRate}/kg</td>
                              <td className="py-3 font-black text-stone-900">
                                {isDelivered ? `₹${deliveredVal.toLocaleString("en-IN")}` : `₹${totalAmt.toLocaleString("en-IN")}`}
                              </td>
                              <td className="py-3">
                                {isPayoutConfirmed ? (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 inline-block">
                                    ✓ Disbursed to Bank
                                  </span>
                                ) : isEscrowConfirmed ? (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-800 border border-blue-200 inline-block">
                                    🔒 Held in Escrow
                                  </span>
                                ) : isCancelled ? (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-stone-100 text-stone-600 border border-stone-200 inline-block">
                                    Cancelled / Refunded
                                  </span>
                                ) : isDisputed ? (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-200 inline-block">
                                    Disputed
                                  </span>
                                ) : isDelivered ? (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-200 inline-block">
                                    Delivered · Awaiting settlement confirmation
                                  </span>
                                ) : isInTransit ? (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200 inline-block">
                                    In Transit · Awaiting settlement confirmation
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-stone-100 text-stone-500 border border-stone-200 inline-block">
                                    Payment status unavailable
                                  </span>
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
            </div>
          )}
        </main>

        {/* MODAL: ADD FARM PROFILE */}
        {showAddFarmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 space-y-5 shadow-2xl border border-stone-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-black text-stone-900">🏡 Register Farm Profile</h3>
                <button
                  type="button"
                  onClick={() => setShowAddFarmModal(false)}
                  className="text-stone-400 hover:text-stone-700 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateFarm} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Farm Name:</label>
                  <input
                    type="text"
                    required
                    value={newFarmName}
                    onChange={(e) => setNewFarmName(e.target.value)}
                    placeholder="e.g. Sri Siddaganga Organic Farm"
                    className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs text-stone-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Total Land Area (Acres):</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={newFarmAcres}
                    onChange={(e) => setNewFarmAcres(e.target.value)}
                    placeholder="e.g. 5.5"
                    className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs text-stone-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Survey Number / RTC:</label>
                  <input
                    type="text"
                    value={newFarmSurvey}
                    onChange={(e) => setNewFarmSurvey(e.target.value)}
                    placeholder="e.g. Sy. No. 142/2"
                    className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs text-stone-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Village / Hobli:</label>
                  <input
                    type="text"
                    value={newFarmVillage}
                    onChange={(e) => setNewFarmVillage(e.target.value)}
                    placeholder="e.g. Kunigal Rural"
                    className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs text-stone-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddFarmModal(false)}
                    className="px-4 py-2 rounded-xl border border-stone-200 text-stone-700 text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingFarm}
                    className="px-6 py-2 rounded-xl bg-emerald-800 text-white text-xs font-black shadow-md transition disabled:opacity-50"
                  >
                    {savingFarm ? "Registering..." : "Save Farm Profile →"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: COUNTER OFFER */}
        {counterModalOffer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-3xl bg-white p-6 space-y-4 shadow-2xl border border-stone-200">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-black text-stone-900">Counter Buyer Offer</h3>
                <button
                  type="button"
                  onClick={() => setCounterModalOffer(null)}
                  className="text-stone-400 hover:text-stone-700 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="text-xs text-stone-500 space-y-1 bg-stone-50 p-3 rounded-xl">
                <div>
                  Buyer: <strong>{counterModalOffer.buyer_profiles?.full_name || "Commercial Buyer"}</strong>
                </div>
                <div>Offered Rate: ₹{counterModalOffer.offered_price_per_kg}/kg</div>
                <div>Quantity: {counterModalOffer.offered_quantity_kg} kg</div>
              </div>

              <form onSubmit={handleSubmitCounteroffer} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Your Counter Asking Price (₹/kg):
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    required
                    value={counterPriceInput}
                    onChange={(e) => setCounterPriceInput(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm font-bold text-stone-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setCounterModalOffer(null)}
                    className="px-4 py-2 rounded-xl border border-stone-200 text-stone-700 text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingCounter}
                    className="px-5 py-2 rounded-xl bg-emerald-800 text-white text-xs font-black shadow-md transition disabled:opacity-50"
                  >
                    {submittingCounter ? "Sending..." : "Transmit Counteroffer →"}
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
