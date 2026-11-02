"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useLanguage } from "@/i18n/LanguageContext";
import LanguageSelector from "@/components/LanguageSelector";
import PlatformHeader from "@/components/PlatformHeader";
import { useAuth } from "@/context/AuthContext";

import {
  aggregateSupply,
  type Grade,
  type AggregationResult,
} from "@/lib/aggregation";

import { getInventory } from "@/lib/inventory";

import {
  optimizeRoute,
  type LogisticsPlan,
} from "@/lib/logistics";

const LogisticsMap = dynamic(
  () => import("@/components/LogisticsMap"),
  {
    ssr: false,
  }
);

type BuyerOrder = {
  id: string;
  status:
    | "Accepted"
    | "Dispatched"
    | "Delivered"
    | "Disputed";

  buyer_name: string;
  produce: string;
  destination: string;
  required_grade: Grade;

  requested_quantity_kg: number;
  fulfilled_quantity_kg: number;
  fulfillment_percentage: number;

  created_at: string;
};

type BuyerShipment = {
  id: string;
  order_id: string;

  status:
    | "Preparing"
    | "Dispatched"
    | "In Transit"
    | "Delivered"
    | "Delayed";

  origin: string | null;
  destination: string;

  total_quantity_kg: number;

  current_location: string | null;

  estimated_distance_km: number | null;
  estimated_time_minutes: number | null;

  progress_percentage: number;

  created_at: string;
  updated_at: string;
};

interface BuyerOfferItem {
  id: string;
  produce_listings?: { crop_name?: string } | null;
  offered_quantity_kg: number | string;
  offered_price_per_kg: number | string;
  destination_city: string;
  payment_terms: string;
  status: string;
  created_at: string;
}

export default function BuyerPage() {
  const { t, formatNumber, formatCurrency, formatDate } = useLanguage();
  const { user, token, isAuthenticated } = useAuth();
  const [buyerOffers, setBuyerOffers] = useState<BuyerOfferItem[]>([]);
  const [featuredListings, setFeaturedListings] = useState<Record<string, unknown>[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [cancelNotice, setCancelNotice] = useState<string | null>(null);

  const [produce, setProduce] =
    useState("Tomato");

  const [quantity, setQuantity] =
    useState("5000");

  const [grade, setGrade] =
    useState<Grade | "Any">("A");

  const [destination, setDestination] =
    useState("Bengaluru");

  const [result, setResult] =
    useState<AggregationResult | null>(null);

  const [route, setRoute] =
    useState<LogisticsPlan | null>(null);

  const [order, setOrder] =
    useState<BuyerOrder | null>(null);

  const [shipment, setShipment] =
    useState<BuyerShipment | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const loadBuyerMarketData = useCallback(async () => {
    if (!token) return;
    setOffersLoading(true);
    try {
      const offersRes = await fetch("/api/platform/marketplace/offers?viewAs=buyer", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (offersRes.ok) {
        const data = await offersRes.json();
        if (data.success && Array.isArray(data.offers)) {
          setBuyerOffers(data.offers);
        }
      }

      const listRes = await fetch("/api/platform/marketplace?sort=date_desc", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (listRes.ok) {
        const listData = await listRes.json();
        if (listData.success && Array.isArray(listData.listings)) {
          setFeaturedListings(listData.listings.slice(0, 6));
        }
      }
    } catch {
      // Ignore
    } finally {
      setOffersLoading(false);
    }
  }, [token]);

  useEffect(() => {
    let active = true;
    if (token) {
      void Promise.resolve().then(() => {
        if (active) {
          loadBuyerMarketData();
        }
      });
    }
    return () => {
      active = false;
    };
  }, [token, loadBuyerMarketData]);

  const handleCancelOffer = async (offerId: string) => {
    if (!token) return;
    try {
      const res = await fetch("/api/platform/marketplace/offers", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ offerId, action: "CANCEL" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to cancel offer.");
      }
      setCancelNotice("✓ Procurement offer cancelled.");
      setTimeout(() => setCancelNotice(null), 4000);
      await loadBuyerMarketData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to cancel offer.");
    }
  };

  /*
    DEMO DEMAND FORECAST
  */

  const demandHistory = [
    4200,
    4500,
    4700,
    4600,
    4900,
    5100,
    5300,
    5200,
    5500,
    5700,
    5900,
  ];

  const averageDemand =
    demandHistory.reduce(
      (sum, value) => sum + value,
      0
    ) / demandHistory.length;

  const forecastDemand = Math.round(
    averageDemand * 1.08
  );

  /*
    FIND SUPPLY
  */

  async function findSupply() {
    setError("");
    setResult(null);
    setRoute(null);
    setOrder(null);
    setShipment(null);

    const requestedQuantity =
      Number(quantity);

    if (
      !produce ||
      !destination ||
      !requestedQuantity ||
      requestedQuantity <= 0
    ) {
      setError(
        t("validation.validRequirements")
      );
      return;
    }

    setLoading(true);

    try {
      const inventory =
        await getInventory();

      console.log(
        "X-MILE INVENTORY BEFORE AGGREGATION:",
        inventory
      );

      if (inventory.length === 0) {
        setError(
          t("validation.noInventoryAvailable")
        );
        return;
      }

      const aggregation =
        aggregateSupply(
          {
            produce,
            quantity:
              requestedQuantity,
            grade,
            destination,
          },
          inventory
        );

      console.log(
        "X-MILE AGGREGATION RESULT:",
        aggregation
      );

      setResult(aggregation);

      if (
        aggregation.selectedFarmers
          .length > 0
      ) {
        const pickupPoints =
          aggregation.selectedFarmers.map(
            (farmer) => ({
              farmerId: farmer.id,
              farmerName: farmer.name,
              location: farmer.location,
              quantity: farmer.quantity,
            })
          );

        const logisticsPlan =
          await optimizeRoute(
            pickupPoints,
            destination
          );

        setRoute(logisticsPlan);
      }
    } catch (err) {
      console.error(
        "Supply search failed:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : t("validation.supplyFailed")
      );
    } finally {
      setLoading(false);
    }
  }

  /*
    CREATE ORDER
  */

  async function createOrder() {
    if (!result) {
      setError(
        t("validation.findSupplyFirst")
      );
      return;
    }

    if (
      result.selectedFarmers.length ===
      0
    ) {
      setError(
        t("validation.noInventorySelected")
      );
      return;
    }

    if (order) {
      setError(
        t("validation.orderAlreadyExists")
      );
      return;
    }

    try {
      setLoading(true);
      setError("");

      const selectedInventory =
        result.selectedFarmers.map(
          (farmer) => ({
            inventoryId: farmer.id,
            quantity: farmer.quantity,
          })
        );

      const orderGrade: Grade =
        grade === "Any"
          ? result.selectedFarmers[0]
              ?.grade ?? "C"
          : grade;

      if (
        orderGrade !== "A" &&
        orderGrade !== "B" &&
        orderGrade !== "C"
      ) {
        setError(
          t("validation.invalidOrderGrade")
        );
        return;
      }

      console.log(
        "X-MILE ORDER GRADE:",
        orderGrade
      );

      console.log(
        "X-MILE INVENTORY BEING RESERVED:",
        selectedInventory
      );

      const response =
        await fetch(
          "/api/orders",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              buyerName:
                "Demo Bulk Buyer",

              produce,

              requestedQuantity:
                result.requestedQuantity,

              requiredGrade:
                orderGrade,

              destination,

              fulfilledQuantity:
                result.totalQuantity,

              fulfillmentPercentage:
                result.fulfillmentPercentage,

              selectedInventory,
            }),
          }
        );

      const data =
        await response.json();

      console.log(
        "X-MILE ORDER API RESPONSE:",
        data
      );

      if (!response.ok) {
        throw new Error(
          data.error ||
            t("validation.orderCreateFailed")
        );
      }

      setOrder({
        id: data.order.id,

        status:
          data.order.status,

        buyer_name:
          data.order.buyer_name,

        produce:
          data.order.produce,

        destination:
          data.order.destination,

        required_grade:
          data.order.required_grade,

        requested_quantity_kg:
          data.order
            .requested_quantity_kg,

        fulfilled_quantity_kg:
          data.order
            .fulfilled_quantity_kg,

        fulfillment_percentage:
          data.order
            .fulfillment_percentage,

        created_at:
          data.order.created_at,
      });
    } catch (err) {
      console.error(
        "Order creation failed:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to create order."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
    REFRESH ORDER STATUS
  */

  async function refreshOrderStatus(
    orderId: string
  ) {
    try {
      const response =
        await fetch(
          "/api/orders",
          {
            method: "GET",
            cache: "no-store",
          }
        );

      if (!response.ok) {
        console.error(
          "Failed to refresh order status."
        );
        return;
      }

      const data =
        await response.json();

      const orders =
        Array.isArray(data)
          ? data
          : Array.isArray(data.orders)
            ? data.orders
            : [];

      const latestOrder =
        orders.find(
          (item: {
            id?: string;
          }) =>
            item.id === orderId
        );

      if (!latestOrder) {
        console.warn(
          "X-MILE order not found during refresh:",
          orderId
        );
        return;
      }

      console.log(
        "X-MILE LIVE ORDER STATUS:",
        latestOrder
      );

      setOrder({
        id: latestOrder.id,

        status:
          latestOrder.status,

        buyer_name:
          latestOrder.buyer_name,

        produce:
          latestOrder.produce,

        destination:
          latestOrder.destination,

        required_grade:
          latestOrder.required_grade,

        requested_quantity_kg:
          latestOrder
            .requested_quantity_kg,

        fulfilled_quantity_kg:
          latestOrder
            .fulfilled_quantity_kg,

        fulfillment_percentage:
          latestOrder
            .fulfillment_percentage,

        created_at:
          latestOrder.created_at,
      });
    } catch (err) {
      console.error(
        "Live order status refresh failed:",
        err
      );
    }
  }

  /*
    REFRESH SHIPMENT

    Returns the latest shipment so the
    polling engine never uses stale React state.
  */

  async function refreshShipment(
    orderId: string
  ): Promise<BuyerShipment | null> {
    try {
      const response =
        await fetch(
          `/api/shipments?orderId=${orderId}`,
          {
            cache: "no-store",
          }
        );

      if (!response.ok) {
        console.error(
          "Failed to refresh shipment."
        );
        return null;
      }

      const data =
        await response.json();

      const latestShipment =
        data.shipments?.[0];

      if (!latestShipment) {
        return null;
      }

      console.log(
        "X-MILE LIVE SHIPMENT:",
        latestShipment
      );

      setShipment(
        latestShipment
      );

      return latestShipment;
    } catch (err) {
      console.error(
        "Live shipment refresh failed:",
        err
      );

      return null;
    }
  }

  /*
    LIVE ORDER + SHIPMENT POLLING

    Refresh immediately and then every
    10 seconds. Real data is persisted and authoritative;
    no simulated client-side movement is performed.
  */

  useEffect(() => {
    if (!order?.id) {
      return;
    }

    const orderId = order.id;

    let active = true;

    async function updateLiveTracking() {
      if (!active) return;
      await refreshOrderStatus(orderId);
      if (!active) return;
      await refreshShipment(orderId);
    }

    updateLiveTracking();

    const interval = setInterval(() => {
      updateLiveTracking();
    }, 10000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [order?.id]);

  /*
    ORDER PROGRESS
  */

  const orderSteps = [
    "Accepted",
    "Dispatched",
    "Delivered",
  ] as const;

  const currentOrderStep =
    order?.status === "Accepted"
      ? 0
      : order?.status ===
          "Dispatched"
        ? 1
        : order?.status ===
            "Delivered"
          ? 2
          : -1;

  const progressPercentage =
    currentOrderStep >= 0
      ? ((currentOrderStep + 1) /
          orderSteps.length) *
        100
      : 0;

  /*
    SHIPMENT PROGRESS
  */

  const shipmentSteps = [
    "Preparing",
    "Dispatched",
    "In Transit",
    "Delivered",
  ] as const;

  const currentShipmentStep =
    shipment?.status ===
    "Preparing"
      ? 0
      : shipment?.status ===
          "Dispatched"
        ? 1
        : shipment?.status ===
            "In Transit"
          ? 2
          : shipment?.status ===
              "Delivered"
            ? 3
            : -1;

  const shipmentProgress =
    shipment
      ? Math.max(
          0,
          Math.min(
            100,
            Number(
              shipment.progress_percentage ??
                0
            )
          )
        )
      : 0;

  return (
    <main className="min-h-screen bg-[#f7f4ec] text-[#173b2a]">
      <style jsx>{`
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

        @keyframes pulseSoft {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.7;
          }
          50% {
            transform: scale(1.15);
            opacity: 1;
          }
        }

        @keyframes scan {
          0% {
            transform: translateY(-20px);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          80% {
            opacity: 1;
          }
          100% {
            transform: translateY(100px);
            opacity: 0;
          }
        }

        @keyframes progressShine {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(250%);
          }
        }

        @keyframes routeFlow {
          from {
            stroke-dashoffset: 1000;
          }
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes truckMove {
          0% {
            transform: translateX(0);
          }
          50% {
            transform: translateX(5px);
          }
          100% {
            transform: translateX(0);
          }
        }

        @keyframes reveal {
          from {
            opacity: 0;
            transform: scale(0.96);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .fade-up {
          animation: fadeUp 0.7s ease-out both;
        }

        .fade-in {
          animation: fadeIn 0.8s ease-out both;
        }

        .float {
          animation: float 4s ease-in-out infinite;
        }

        .pulse-soft {
          animation: pulseSoft 2s ease-in-out infinite;
        }

        .scan-line {
          animation: scan 2.4s ease-in-out infinite;
        }

        .route-line {
          stroke-dasharray: 14 10;
          animation: routeFlow 7s linear infinite;
        }

        .truck {
          animation: truckMove 1.6s ease-in-out infinite;
        }

        .reveal {
          animation: reveal 0.6s ease-out both;
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
            0 18px 45px rgba(23, 59, 42, 0.1);
          border-color: rgba(16, 185, 129, 0.3);
        }

        .button-hover {
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease,
            background-color 0.2s ease;
        }

        .button-hover:hover {
          transform: translateY(-2px);
          box-shadow:
            0 12px 24px rgba(5, 150, 105, 0.22);
        }

        .input-focus {
          transition:
            border-color 0.2s ease,
            box-shadow 0.2s ease;
        }

        .input-focus:focus {
          border-color: #10b981;
          box-shadow:
            0 0 0 4px rgba(16, 185, 129, 0.1);
          outline: none;
        }
      `}</style>

      {/* NAVBAR */}
      <PlatformHeader />

      <div className="mx-auto max-w-7xl space-y-8 px-6 py-8">
        {/* Role Guard Warning if signed in as another role */}
        {isAuthenticated && user && user.role !== "BUYER" && user.role !== "ADMIN" && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-bold">⚠️ Notice:</span> You are currently signed in with the role{" "}
                <span className="font-extrabold uppercase">{user.role}</span>. You can test buyer procurement tools here or open your authorized role portal.
              </div>
              <Link
                href={user.role === "FARMER" ? "/farmer" : "/logistics"}
                className="inline-flex items-center gap-1 rounded-xl bg-amber-700 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-amber-800 transition"
              >
                Go to {user.role} Portal →
              </Link>
            </div>
          </div>
        )}

        {/* HERO */}

        <section className="relative overflow-hidden rounded-[2rem] bg-[#173b2a] px-7 py-10 text-white shadow-xl md:px-10">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />

          <div className="absolute bottom-0 right-20 h-40 w-40 rounded-full bg-emerald-300/10 blur-3xl" />

          <div className="relative grid gap-10 lg:grid-cols-[1.4fr_0.6fr] lg:items-center">
            <div className="fade-up">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold tracking-wider text-emerald-200">
                <span className="h-2 w-2 rounded-full bg-emerald-300 pulse-soft" />
                {t("buyer.modeBadge")}
              </div>

              <h2 className="max-w-3xl text-4xl font-black tracking-tight md:text-6xl">
                {t("buyer.title")}
              </h2>

              <p className="mt-5 max-w-2xl text-base leading-7 text-emerald-50/75 md:text-lg">
                {t("buyer.subtitle")}
              </p>

              {/* Authoritative Profile Badge */}
              <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="font-bold text-white">{user?.fullName || "Verified Bulk Buyer"}</span>
                  <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
                    {user?.role || "BUYER"}
                  </span>
                </div>
                <span className="text-white/40">•</span>
                <span className="text-white/70">{user?.district || "Bengaluru"}, {user?.state || "Karnataka"}</span>
                <span className="text-white/40">•</span>
                <span className="text-emerald-300 font-semibold">{user?.isVerified ? "✓ Verified Procurement Account" : "Staging Account"}</span>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/marketplace"
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-500 transition"
                >
                  Browse Produce Marketplace →
                </Link>
              </div>
            </div>

            <div className="float hidden lg:block">
              <div className="relative mx-auto h-52 w-52 rounded-full border border-white/10 bg-white/5">
                <div className="absolute inset-5 rounded-full border border-emerald-300/20" />

                <div className="absolute inset-12 rounded-full border border-emerald-300/30" />

                <div className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-300 shadow-[0_0_35px_rgba(110,231,183,0.7)]" />

                <div className="absolute left-8 top-10 h-3 w-3 rounded-full bg-emerald-300" />

                <div className="absolute right-9 top-16 h-3 w-3 rounded-full bg-blue-300" />

                <div className="absolute bottom-10 left-12 h-3 w-3 rounded-full bg-emerald-200" />

                <div className="absolute bottom-12 right-9 h-3 w-3 rounded-full bg-blue-200" />

                <div className="absolute inset-0 animate-spin rounded-full border-t border-emerald-300/50 [animation-duration:8s]" />
              </div>
            </div>
          </div>
        </section>

        {/* SUBMITTED PROCUREMENT OFFERS (PHASE 2 & 3) */}
        <section className="fade-up card-hover rounded-[2rem] border border-[#dce6dc] bg-white p-6 shadow-sm md:p-7">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-wider text-emerald-600">
                Authoritative Procure Hub
              </p>
              <h3 className="mt-1 text-2xl font-black text-[#173b2a]">
                My Submitted Offers & Bids ({buyerOffers.length})
              </h3>
              <p className="mt-1 text-sm text-[#718276]">
                Track binding procurement bids submitted to verified farmers under Escrow protection.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/marketplace"
                className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                + Place New Offer
              </Link>
            </div>
          </div>

          {cancelNotice && (
            <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-bold text-emerald-950">
              {cancelNotice}
            </div>
          )}

          {offersLoading ? (
            <div className="mt-8 text-center py-10">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-r-transparent" />
              <p className="mt-2 text-xs text-gray-400">Loading your procurement offers...</p>
            </div>
          ) : buyerOffers.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-black/10 bg-[#f7f8f5] p-8 text-center">
              <span className="text-2xl">🛒</span>
              <p className="mt-3 text-sm font-bold text-gray-800">No active offers submitted yet</p>
              <p className="mt-1 text-xs text-gray-500">
                Browse our live produce marketplace to bid on verified harvest lots directly from local farmers.
              </p>
              <Link
                href="/marketplace"
                className="mt-4 inline-block rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
              >
                Go to Marketplace
              </Link>
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-xs">
                <thead>
                  <tr className="border-b border-black/10 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    <th className="pb-3 pr-4">Produce Lot</th>
                    <th className="pb-3 pr-4">Offered Volume</th>
                    <th className="pb-3 pr-4">Offered Price</th>
                    <th className="pb-3 pr-4">Destination</th>
                    <th className="pb-3 pr-4">Payment Terms</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3 pr-4">Action</th>
                    <th className="pb-3">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {buyerOffers.map((off) => (
                    <tr key={off.id} className="border-b border-black/5 hover:bg-gray-50/50 transition">
                      <td className="py-3.5 pr-4 font-bold text-gray-900">
                        {off.produce_listings?.crop_name || "Produce"}
                      </td>
                      <td className="py-3.5 pr-4 font-semibold text-gray-900">
                        {Number(off.offered_quantity_kg).toLocaleString()} kg
                      </td>
                      <td className="py-3.5 pr-4 font-bold text-emerald-700">
                        ₹{off.offered_price_per_kg}/kg
                      </td>
                      <td className="py-3.5 pr-4 text-gray-600">
                        {off.destination_city}
                      </td>
                      <td className="py-3.5 pr-4 text-[10px] text-gray-500">
                        {off.payment_terms}
                      </td>
                      <td className="py-3.5 pr-4">
                        <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold ${
                          off.status === "ACCEPTED"
                            ? "bg-emerald-100 text-emerald-800"
                            : off.status === "REJECTED"
                            ? "bg-red-100 text-red-800"
                            : off.status === "CANCELLED"
                            ? "bg-gray-100 text-gray-600"
                            : "bg-amber-100 text-amber-800"
                        }`}>
                          {off.status}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4">
                        {off.status === "PENDING" ? (
                          <button
                            type="button"
                            onClick={() => handleCancelOffer(off.id)}
                            className="rounded-lg border border-red-200 px-2.5 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 transition"
                          >
                            Cancel Offer
                          </button>
                        ) : off.status === "ACCEPTED" ? (
                          <span className="text-[11px] font-bold text-emerald-700">Escrow Ready ✓</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 text-xs text-gray-400">
                        {off.created_at ? new Date(off.created_at).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* BUYER REQUIREMENT */}

        <section className="fade-up card-hover rounded-[2rem] border border-[#dce6dc] bg-white p-6 shadow-sm md:p-7">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-wider text-emerald-600">
                Step 01 · {t("buyer.reqTitle")}
              </p>

              <h3 className="mt-1 text-2xl font-black text-[#173b2a]">
                {t("buyer.reqTitle")}
              </h3>

              <p className="mt-1 text-sm text-[#718276]">
                {t("buyer.reqSubtitle")}
              </p>
            </div>

            <div className="rounded-full bg-[#f0f6f1] px-4 py-2 text-xs font-bold text-[#547060]">
              Live procurement input
            </div>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-4">
            <div>
              <label className="text-sm font-bold text-[#385443]">
                {t("buyer.cropRequired")}
              </label>

              <select
                value={produce}
                onChange={(e) =>
                  setProduce(
                    e.target.value
                  )
                }
                className="input-focus mt-2 w-full rounded-2xl border border-[#d7e1d8] bg-[#fbfcfa] px-4 py-3 text-[#173b2a]"
              >
                <option value="Tomato">{t("quality.produceTypes.tomato")}</option>
                <option value="Potato">{t("quality.produceTypes.potato")}</option>
                <option value="Onion">{t("quality.produceTypes.onion")}</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-bold text-[#385443]">
                {t("buyer.quantityRequired")}
              </label>

              <input
                type="number"
                value={quantity}
                onChange={(e) =>
                  setQuantity(
                    e.target.value
                  )
                }
                className="input-focus mt-2 w-full rounded-2xl border border-[#d7e1d8] bg-[#fbfcfa] px-4 py-3 text-[#173b2a]"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-[#385443]">
                {t("buyer.gradeTarget")}
              </label>

              <select
                value={grade}
                onChange={(e) =>
                  setGrade(
                    e.target.value as
                      | Grade
                      | "Any"
                  )
                }
                className="input-focus mt-2 w-full rounded-2xl border border-[#d7e1d8] bg-[#fbfcfa] px-4 py-3 text-[#173b2a]"
              >
                <option value="A">
                  Grade A
                </option>
                <option value="B">
                  Grade B
                </option>
                <option value="C">
                  Grade C
                </option>
                <option value="Any">
                  Any Grade
                </option>
              </select>
            </div>

            <div>
              <label className="text-sm font-bold text-[#385443]">
                {t("buyer.destinationCity")}
              </label>

              <select
                value={destination}
                onChange={(e) =>
                  setDestination(
                    e.target.value
                  )
                }
                className="input-focus mt-2 w-full rounded-2xl border border-[#d7e1d8] bg-[#fbfcfa] px-4 py-3 text-[#173b2a]"
              >
                <option>Bengaluru</option>
                <option>Tumakuru</option>
                <option>Mysuru</option>
                <option>Mandya</option>
                <option>Hassan</option>
              </select>
            </div>
          </div>

          <button
            onClick={findSupply}
            disabled={loading}
            className="button-hover mt-6 rounded-2xl bg-[#087443] px-7 py-3.5 font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? t("buyer.matchingSupply")
              : t("buyer.matchSupply")}
          </button>
        </section>

        {/* DEMAND FORECAST */}

        <section className="card-hover overflow-hidden rounded-[2rem] border border-blue-100 bg-white shadow-sm">
          <div className="grid md:grid-cols-[1fr_auto]">
            <div className="p-6 md:p-7">
              <p className="text-sm font-black uppercase tracking-wider text-blue-600">
                Step 02 · {t("buyer.step2Title")}
              </p>

              <h3 className="mt-1 text-2xl font-black text-[#173b2a]">
                {t("buyer.predictedDemand")}
              </h3>

              <p className="mt-1 max-w-2xl text-sm text-[#718276]">
                {t("buyer.predictedDemandDesc")}
              </p>

              <div className="mt-6 flex h-20 items-end gap-2">
                {demandHistory.map(
                  (value, index) => (
                    <div
                      key={index}
                      className="flex-1 rounded-t-lg bg-blue-100 transition-all duration-500 hover:bg-blue-300"
                      style={{
                        height: `${Math.max(
                          20,
                          (value / 6000) *
                            100
                        )}%`,
                      }}
                    />
                  )
                )}
              </div>
            </div>

            <div className="flex min-w-[220px] items-center justify-center bg-[#eef6ff] p-7">
              <div className="text-center">
                <p className="text-sm font-bold text-blue-600">
                  {t("buyer.forecast")}
                </p>

                <p className="mt-1 text-4xl font-black text-blue-950">
                  {forecastDemand.toLocaleString()}
                </p>

                <p className="text-sm font-bold text-blue-700">
                  {t("common.kg")}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ERROR */}

        {error && (
          <div className="reveal rounded-2xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* AGGREGATION */}

        {result && (
          <>
            <section className="fade-up card-hover rounded-[2rem] border border-[#dce6dc] bg-white p-6 shadow-sm md:p-7">
              <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
                <div>
                  <p className="text-sm font-black uppercase tracking-wider text-emerald-600">
                    Step 03 · {t("buyer.step3Title")}
                  </p>

                  <h3 className="mt-1 text-3xl font-black text-[#173b2a]">
                    {result.totalQuantity.toLocaleString()} {t("common.kg")}{" "}
                    {t("buyer.fulfilled")}
                  </h3>

                  <p className="mt-2 max-w-3xl leading-7 text-[#63766a]">
                    {result.aggregationSummary}
                  </p>
                </div>

                <div className="rounded-3xl bg-[#e8f7ee] px-7 py-5 text-center">
                  <p className="text-sm font-bold text-emerald-600">
                    {t("buyer.fulfillmentRate")}
                  </p>

                  <p className="text-4xl font-black text-[#087443]">
                    {result.fulfillmentPercentage}%
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="card-hover rounded-2xl bg-[#f5f7f3] p-5">
                  <p className="text-sm text-[#718276]">
                    {t("buyer.eligibleFarmers")}
                  </p>

                  <p className="mt-1 text-3xl font-black text-[#173b2a]">
                    {result.eligibleFarmerCount}
                  </p>
                </div>

                <div className="card-hover rounded-2xl bg-[#f5f7f3] p-5">
                  <p className="text-sm text-[#718276]">
                    {t("buyer.selectedFarmers")}
                  </p>

                  <p className="mt-1 text-3xl font-black text-[#173b2a]">
                    {result.selectedFarmers.length}
                  </p>
                </div>

                <div className="card-hover rounded-2xl bg-[#f5f7f3] p-5">
                  <p className="text-sm text-[#718276]">
                    {t("buyer.remaining")}
                  </p>

                  <p className="mt-1 text-3xl font-black text-[#173b2a]">
                    {result.remainingQuantity} {t("common.kg")}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
                <p className="font-black text-emerald-900">
                  {t("buyer.qualityPriority")}
                </p>

                <p className="mt-1 text-sm text-emerald-800">
                  {result.qualityPriority}
                </p>
              </div>
            </section>

            {/* FARMER SELECTION */}

            <section className="fade-up card-hover rounded-[2rem] border border-[#dce6dc] bg-white p-6 shadow-sm md:p-7">
              <p className="text-sm font-black uppercase tracking-wider text-emerald-600">
                Step 04 · {t("buyer.step4Title")}
              </p>

              <h3 className="mt-1 text-2xl font-black text-[#173b2a]">
                {t("buyer.selectedInventory")}
              </h3>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[700px] text-left">
                  <thead>
                    <tr className="border-b border-[#e4e9e3] text-sm text-[#718276]">
                      <th className="pb-3">{t("farmer.title")}</th>
                      <th className="pb-3">{t("buyer.cropRequired")}</th>
                      <th className="pb-3">{t("buyer.thAllocated")}</th>
                      <th className="pb-3">{t("common.grade")}</th>
                      <th className="pb-3">{t("buyer.thScore")}</th>
                      <th className="pb-3">{t("farmer.farmLocation")}</th>
                    </tr>
                  </thead>

                  <tbody>
                    {result.selectedFarmers.map(
                      (farmer) => (
                        <tr
                          key={farmer.id}
                          className="border-b border-[#edf0eb] transition hover:bg-[#f8faf7]"
                        >
                          <td className="py-4 font-black text-[#173b2a]">
                            {farmer.name}
                          </td>

                          <td className="py-4">
                            {farmer.produce}
                          </td>

                          <td className="py-4 font-black">
                            {farmer.quantity} kg
                          </td>

                          <td className="py-4">
                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
                              Grade {farmer.grade}
                            </span>
                          </td>

                          <td className="py-4 font-bold">
                            {farmer.qualityScore ?? "—"}
                          </td>

                          <td className="py-4">
                            {farmer.location}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* LOGISTICS */}

            {route && (
              <section className="fade-up card-hover rounded-[2rem] border border-blue-100 bg-white p-6 shadow-sm md:p-7">
                <p className="text-sm font-black uppercase tracking-wider text-blue-600">
                  Step 05 · {t("buyer.step5Title")}
                </p>

                <h3 className="mt-1 text-2xl font-black text-[#173b2a]">
                  {t("buyer.optimizedRouteTitle")}
                </h3>

                <div className="mt-6 grid gap-4 md:grid-cols-4">
                  <div className="rounded-2xl bg-[#f5f7f3] p-4">
                    <p className="text-sm text-[#718276]">
                      {t("buyer.pickupPoints")}
                    </p>

                    <p className="mt-1 text-2xl font-black">
                      {route.pickupPoints.length}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#f5f7f3] p-4">
                    <p className="text-sm text-[#718276]">
                      {t("common.quantity")}
                    </p>

                    <p className="mt-1 text-2xl font-black">
                      {route.totalQuantity} {t("common.kg")}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#f5f7f3] p-4">
                    <p className="text-sm text-[#718276]">
                      {t("farmer.thDistance")}
                    </p>

                    <p className="mt-1 text-2xl font-black">
                      {route.estimatedDistanceKm} km
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#f5f7f3] p-4">
                    <p className="text-sm text-[#718276]">
                      {t("buyer.routeTime")}
                    </p>

                    <p className="mt-1 text-2xl font-black">
                      {route.estimatedRouteTimeMinutes} min
                    </p>
                  </div>
                </div>

                <div className="mt-6 overflow-hidden rounded-3xl border border-blue-100">
                  <LogisticsMap
                    pickupPoints={
                      route.pickupPoints
                    }
                    routeCoordinates={
                      route.routeCoordinates
                    }
                    destination={
                      destination
                    }
                  />
                </div>

                <div className="mt-6 flex items-center gap-3 rounded-2xl bg-blue-50 p-4 text-sm text-blue-800">
                  <span className="text-xl truck">
                    🚚
                  </span>

                  <span>
                    {route.optimized
                      ? t("buyer.routeOptimizedNote")
                      : t("buyer.routeFallbackNote")}
                  </span>
                </div>
              </section>
            )}

            {/* CREATE ORDER */}

            <section className="fade-up relative overflow-hidden rounded-[2rem] border border-emerald-200 bg-[#e9f7ee] p-6 shadow-sm md:p-7">
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-300/20 blur-3xl" />

              <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-center">
                <div>
                  <p className="text-sm font-black uppercase tracking-wider text-emerald-700">
                    Step 06 · {t("buyer.step6Title")}
                  </p>

                  <h3 className="mt-1 text-2xl font-black text-[#173b2a]">
                    {t("buyer.createOrderTitle")}
                  </h3>

                  <p className="mt-1 max-w-2xl text-sm text-emerald-800">
                    {t("buyer.createOrderDesc")}
                  </p>
                </div>

                <button
                  onClick={createOrder}
                  disabled={
                    loading || !!order
                  }
                  className="button-hover shrink-0 rounded-2xl bg-[#087443] px-7 py-3.5 font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {order
                    ? "✓ " + t("buyer.reservationPlaced")
                    : loading
                      ? t("buyer.matchingSupply")
                      : t("buyer.placeReservation")}
                </button>
              </div>
            </section>

            {/* ORDER PROGRESS */}

            {order && (
              <>
                <section className="fade-up card-hover rounded-[2rem] border border-[#dce6dc] bg-white p-6 shadow-sm md:p-7">
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div>
                      <p className="text-sm font-black uppercase tracking-wider text-blue-600">
                        Step 07 · {t("buyer.step7Title")}
                      </p>

                      <h3 className="mt-1 text-2xl font-black text-[#173b2a]">
                        {t("buyer.orderProgressTitle")}
                      </h3>

                      <p className="mt-1 break-all text-sm text-[#718276]">
                        {t("buyer.orderId")}: {order.id}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />

                      <span
                        className={`rounded-full px-4 py-2 text-sm font-black ${
                          order.status ===
                          "Delivered"
                            ? "bg-emerald-100 text-emerald-700"
                            : order.status ===
                                "Dispatched"
                              ? "bg-blue-100 text-blue-700"
                              : order.status ===
                                  "Disputed"
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                  </div>

                  {/* ORDER DETAILS */}

                  <div className="mt-8">
                    <p className="text-sm font-black uppercase tracking-wider text-[#718276]">
                      {t("buyer.orderDetails")}
                    </p>

                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                      <div className="card-hover rounded-2xl bg-[#f5f7f3] p-4">
                        <p className="text-sm text-[#718276]">
                          {t("transaction.buyer")}
                        </p>
                        <p className="mt-1 font-black text-[#173b2a]">
                          {order.buyer_name}
                        </p>
                      </div>

                      <div className="card-hover rounded-2xl bg-[#f5f7f3] p-4">
                        <p className="text-sm text-[#718276]">
                          {t("buyer.cropRequired")}
                        </p>
                        <p className="mt-1 font-black text-[#173b2a]">
                          {order.produce}
                        </p>
                      </div>

                      <div className="card-hover rounded-2xl bg-[#f5f7f3] p-4">
                        <p className="text-sm text-[#718276]">
                          {t("common.grade")}
                        </p>
                        <p className="mt-1 font-black text-[#173b2a]">
                          {t("common.grade")} {order.required_grade}
                        </p>
                      </div>

                      <div className="card-hover rounded-2xl bg-[#f5f7f3] p-4">
                        <p className="text-sm text-[#718276]">
                          {t("common.destination")}
                        </p>
                        <p className="mt-1 font-black text-[#173b2a]">
                          {order.destination}
                        </p>
                      </div>

                      <div className="card-hover rounded-2xl bg-[#f5f7f3] p-4">
                        <p className="text-sm text-[#718276]">
                          {t("farmer.thCreated")}
                        </p>
                        <p className="mt-1 font-black text-[#173b2a]">
                          {new Date(
                            order.created_at
                          ).toLocaleString()}
                        </p>
                      </div>

                      <div className="card-hover rounded-2xl bg-[#f5f7f3] p-4">
                        <p className="text-sm text-[#718276]">
                          {t("buyer.requested")}
                        </p>
                        <p className="mt-1 font-black text-[#173b2a]">
                          {order.requested_quantity_kg.toLocaleString()} {t("common.kg")}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ORDER SUMMARY */}

                  <div className="mt-8 grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-[#e5ebe4] bg-white p-5">
                      <p className="text-sm text-[#718276]">
                        {t("buyer.requested")}
                      </p>
                      <p className="mt-1 text-2xl font-black">
                        {order.requested_quantity_kg.toLocaleString()} {t("common.kg")}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-[#e5ebe4] bg-white p-5">
                      <p className="text-sm text-[#718276]">
                        {t("buyer.fulfilled")}
                      </p>
                      <p className="mt-1 text-2xl font-black">
                        {order.fulfilled_quantity_kg.toLocaleString()} {t("common.kg")}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-[#e5ebe4] bg-white p-5">
                      <p className="text-sm text-[#718276]">
                        {t("buyer.fulfillmentRate")}
                      </p>
                      <p className="mt-1 text-2xl font-black">
                        {order.fulfillment_percentage}%
                      </p>
                    </div>
                  </div>

                  {/* ORDER PROGRESS BAR */}

                  {order.status !==
                    "Disputed" && (
                    <div className="mt-8">
                      <div className="mb-3 flex justify-between text-sm font-black text-[#607468]">
                        <span>
                          {t("buyer.orderProgressTitle")}
                        </span>

                        <span>
                          {Math.round(
                            progressPercentage
                          )}%
                        </span>
                      </div>

                      <div className="h-3 overflow-hidden rounded-full bg-[#e5ebe4]">
                        <div
                          className="relative h-full rounded-full bg-emerald-500 transition-all duration-700"
                          style={{
                            width: `${progressPercentage}%`,
                          }}
                        >
                          <div className="absolute inset-0 w-1/3 bg-white/25 animate-[progressShine_2.5s_linear_infinite]" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ORDER TIMELINE */}

                  {order.status ===
                  "Disputed" ? (
                    <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-5">
                      <p className="font-black text-red-800">
                        {t("common.disputed")}
                      </p>

                      <p className="mt-1 text-sm text-red-700">
                        {t("buyer.statusDisputedDesc")}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-8">
                      <div className="mb-6 flex items-center justify-between">
                        <p className="text-sm font-black uppercase tracking-wider text-[#718276]">
                          {t("buyer.orderTimeline")}
                        </p>

                        <p className="text-xs font-semibold text-[#9aa79e]">
                          {t("buyer.liveUpdates10s")}
                        </p>
                      </div>

                      <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-0">
                        {orderSteps.map(
                          (
                            step,
                            index
                          ) => {
                            const completed =
                              index <=
                              currentOrderStep;

                            const isCurrent =
                              index ===
                              currentOrderStep;

                            return (
                              <div
                                key={step}
                                className="flex flex-1 items-start md:flex-col md:items-center"
                              >
                                <div className="flex items-center md:w-full">
                                  <div
                                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                                      completed
                                        ? "bg-emerald-600 text-white"
                                        : "bg-[#e7ece7] text-[#718276]"
                                    } ${
                                      isCurrent
                                        ? "ring-4 ring-emerald-100"
                                        : ""
                                    }`}
                                  >
                                    {completed
                                      ? "✓"
                                      : index + 1}
                                  </div>

                                  {index <
                                    orderSteps.length -
                                      1 && (
                                    <div
                                      className={`hidden h-1 flex-1 md:block ${
                                        index <
                                        currentOrderStep
                                          ? "bg-emerald-500"
                                          : "bg-[#e5ebe4]"
                                      }`}
                                    />
                                  )}
                                </div>

                                <div className="ml-4 md:ml-0 md:mt-3 md:text-center">
                                  <p
                                    className={`font-black ${
                                      completed
                                        ? "text-[#173b2a]"
                                        : "text-[#9aa79e]"
                                    }`}
                                  >
                                    {step}
                                  </p>

                                  <p className="mt-1 text-xs text-[#718276]">
                                    {step ===
                                      "Accepted" &&
                                      "Order confirmed"}

                                    {step ===
                                      "Dispatched" &&
                                      "Pickup in transit"}

                                    {step ===
                                      "Delivered" &&
                                      "Order completed"}
                                  </p>
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>
                    </div>
                  )}

                  {/* CURRENT STATUS */}

                  <div className="mt-8 rounded-2xl border border-blue-100 bg-blue-50 p-5">
                    <p className="font-black text-blue-900">
                      Current Status
                    </p>

                    <p className="mt-1 text-sm leading-6 text-blue-800">
                      {order.status ===
                        "Accepted" &&
                        "Your order has been accepted and the selected farmer inventory has been reserved."}

                      {order.status ===
                        "Dispatched" &&
                        "Your order has been dispatched and is currently in transit."}

                      {order.status ===
                        "Delivered" &&
                        "Your order has been delivered successfully."}

                      {order.status ===
                        "Disputed" &&
                        "This order is currently under dispute and requires attention."}
                    </p>
                  </div>
                </section>

                {/* SHIPMENT TRACKING */}

                {shipment && (
                  <section className="fade-up relative overflow-hidden rounded-[2rem] border border-blue-100 bg-white p-6 shadow-sm md:p-7">
                    <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-blue-100/50 blur-3xl" />

                    <div className="relative">
                      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                        <div>
                          <p className="text-sm font-black uppercase tracking-wider text-blue-600">
                            Step 08 · {t("buyer.step8Title")}
                          </p>

                          <h3 className="mt-1 text-2xl font-black text-[#173b2a]">
                            {t("buyer.shipmentTracking")}
                          </h3>

                          <p className="mt-1 break-all text-sm text-[#718276]">
                            {t("buyer.shipmentId")}: {shipment.id}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          {shipment.status !==
                            "Delivered" && (
                            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-blue-500" />
                          )}

                          <span
                            className={`rounded-full px-4 py-2 text-sm font-black ${
                              shipment.status ===
                              "Delivered"
                                ? "bg-emerald-100 text-emerald-700"
                                : shipment.status ===
                                    "In Transit"
                                  ? "bg-blue-100 text-blue-700"
                                  : shipment.status ===
                                      "Delayed"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {shipment.status}
                          </span>
                        </div>
                      </div>

                      {/* SHIPMENT PROGRESS */}

                      {shipment.status !==
                        "Delayed" && (
                        <div className="mt-8">
                          <div className="mb-3 flex justify-between text-sm font-black text-[#607468]">
                            <span>
                              {t("buyer.shipmentProgress")}
                            </span>

                            <span>
                              {Math.round(
                                shipmentProgress
                              )}%
                            </span>
                          </div>

                          <div className="h-4 overflow-hidden rounded-full bg-[#e5eaf0]">
                            <div
                              className="relative h-full rounded-full bg-blue-500 transition-all duration-1000"
                              style={{
                                width: `${shipmentProgress}%`,
                              }}
                            >
                              <div className="absolute inset-0 w-1/3 bg-white/30 animate-[progressShine_2.2s_linear_infinite]" />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* SHIPMENT TIMELINE */}

                      <div className="mt-8">
                        <div className="mb-6 flex items-center justify-between">
                          <p className="text-sm font-black uppercase tracking-wider text-[#718276]">
                            {t("buyer.shipmentTimeline")}
                          </p>

                          <p className="text-xs font-semibold text-[#9aa79e]">
                            {t("buyer.liveUpdates10s")}
                          </p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-4">
                          {shipmentSteps.map(
                            (
                              step,
                              index
                            ) => {
                              const completed =
                                index <=
                                currentShipmentStep;

                              const isCurrent =
                                index ===
                                currentShipmentStep;

                              return (
                                <div
                                  key={step}
                                  className={`card-hover rounded-2xl border p-4 ${
                                    completed
                                      ? "border-blue-200 bg-blue-50"
                                      : "border-[#e5ebe4] bg-[#f7f8f5]"
                                  } ${
                                    isCurrent
                                      ? "ring-2 ring-blue-100"
                                      : ""
                                  }`}
                                >
                                  <div
                                    className={`flex h-10 w-10 items-center justify-center rounded-full font-black ${
                                      completed
                                        ? "bg-blue-600 text-white"
                                        : "bg-[#e4e9e4] text-[#718276]"
                                    }`}
                                  >
                                    {completed
                                      ? "✓"
                                      : index + 1}
                                  </div>

                                  <p
                                    className={`mt-3 font-black ${
                                      completed
                                        ? "text-[#173b2a]"
                                        : "text-[#9aa79e]"
                                    }`}
                                  >
                                    {step}
                                  </p>

                                  {isCurrent && (
                                    <div className="mt-2 flex items-center gap-2 text-xs font-bold text-blue-600">
                                      <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                                      {t("buyer.currentStage")}
                                    </div>
                                  )}
                                </div>
                              );
                            }
                          )}
                        </div>
                      </div>

                      {/* ROUTE */}

                      <div className="mt-8 grid gap-4 md:grid-cols-2">
                        <div className="card-hover rounded-2xl bg-[#f5f7f3] p-5">
                          <p className="text-sm font-semibold text-[#718276]">
                            {t("common.pickup")}
                          </p>

                          <p className="mt-1 text-xl font-black text-[#173b2a]">
                            {shipment.origin ||
                              t("buyer.locationUnavailable")}
                          </p>
                        </div>

                        <div className="card-hover rounded-2xl bg-[#f5f7f3] p-5">
                          <p className="text-sm font-semibold text-[#718276]">
                            {t("common.destination")}
                          </p>

                          <p className="mt-1 text-xl font-black text-[#173b2a]">
                            {shipment.destination}
                          </p>
                        </div>
                      </div>

                      {/* CURRENT LOCATION */}

                      <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-5">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">
                            📍
                          </span>

                          <p className="text-sm font-black text-blue-700">
                            {t("common.currentLocation")}
                          </p>
                        </div>

                        <p className="mt-1 text-lg font-black text-blue-950">
                          {shipment.current_location ||
                            shipment.origin ||
                            t("buyer.locationUnavailable")}
                        </p>

                        <p className="mt-1 text-xs text-blue-700">
                          {t("common.lastUpdated")}{" "}
                          {new Date(
                            shipment.updated_at
                          ).toLocaleString()}
                        </p>
                      </div>

                      {/* SHIPMENT DETAILS */}

                      <div className="mt-6 grid gap-4 md:grid-cols-3">
                        <div className="rounded-2xl border border-[#e5ebe4] bg-white p-5">
                          <p className="text-sm text-[#718276]">
                            {t("common.quantity")}
                          </p>

                          <p className="mt-1 text-2xl font-black text-[#173b2a]">
                            {shipment.total_quantity_kg.toLocaleString()} {t("common.kg")}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-[#e5ebe4] bg-white p-5">
                          <p className="text-sm text-[#718276]">
                            {t("buyer.distanceRemaining")}
                          </p>

                          <p className="mt-1 text-2xl font-black text-[#173b2a]">
                            {shipment.estimated_distance_km !=
                            null
                              ? `${Number(
                                  shipment.estimated_distance_km
                                ).toFixed(1)} km`
                              : "—"}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-[#e5ebe4] bg-white p-5">
                          <p className="text-sm text-[#718276]">
                            {t("buyer.estimatedTime")}
                          </p>

                          <p className="mt-1 text-2xl font-black text-[#173b2a]">
                            {shipment.estimated_time_minutes !=
                            null
                              ? `${Math.round(
                                  Number(
                                    shipment.estimated_time_minutes
                                  )
                                )} min`
                              : "—"}
                          </p>
                        </div>
                      </div>

                      {/* LIVE MOVEMENT */}

                      {shipment.status ===
                        "In Transit" && (
                        <div className="mt-6 overflow-hidden rounded-2xl border border-blue-100 bg-blue-50 p-5">
                          <div className="flex items-center gap-3">
                            <span className="truck text-2xl">
                              🚚
                            </span>

                            <div>
                              <p className="font-black text-blue-950">
                                {t("buyer.movingToward")}{" "}
                                {shipment.destination}
                              </p>

                              <p className="mt-1 text-sm text-blue-800">
                                {t("buyer.autoAdvanceNote")}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 h-2 overflow-hidden rounded-full bg-blue-100">
                            <div
                              className="h-full rounded-full bg-blue-500 transition-all duration-1000"
                              style={{
                                width: `${shipmentProgress}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* DELIVERY COMPLETE */}

                      {shipment.status ===
                        "Delivered" && (
                        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                          <p className="font-black text-emerald-900">
                            ✅ {t("buyer.shipmentDelivered")}
                          </p>

                          <p className="mt-1 text-sm text-emerald-800">
                            {t("buyer.reachedDestination")}
                          </p>
                        </div>
                      )}

                      {/* LIVE INDICATOR */}

                      <div className="mt-6 flex items-center gap-3 rounded-2xl bg-[#f5f7f3] p-4">
                        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />

                        <p className="text-sm font-semibold text-[#607468]">
                          {t("buyer.autoRefreshNote")}
                        </p>
                      </div>
                    </div>
                  </section>
                )}
              </>
            )}
          </>
        )}

        {/* FOOTER */}

        <footer className="border-t border-[#dce6dc] py-8">
          <div className="flex flex-col justify-between gap-3 text-sm text-[#718276] md:flex-row">
            <p>
              <span className="font-black text-[#173b2a]">
                X-MILE
              </span>{" "}
              · Every MILE Matters, Every FARMER Matters
            </p>

            <p>
              Demand → Supply → Quality → Logistics → Delivery
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}