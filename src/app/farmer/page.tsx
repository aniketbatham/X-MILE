"use client";

import { useEffect, useState } from "react";
import { addInventoryItem, getInventory } from "@/lib/inventory";
import type { Farmer } from "@/lib/aggregation";
import { useLanguage } from "@/i18n/LanguageContext";
import LanguageSelector from "@/components/LanguageSelector";
import PlatformHeader from "@/components/PlatformHeader";
import ConnectedFarmerJourney from "@/components/ConnectedFarmerJourney";

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

export default function FarmerPage() {
  const { t, formatNumber, formatDate } = useLanguage();
  const [produce, setProduce] = useState("Tomato");
  const [quantity, setQuantity] = useState("");
  const [location, setLocation] = useState("Tumakuru");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [quality, setQuality] =
    useState<QualityResult | null>(null);

  const [inventory, setInventory] =
    useState<Farmer[]>([]);

  const [incomingOrders, setIncomingOrders] =
    useState<any[]>([]);

  const [ordersLoading, setOrdersLoading] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [updatingOrderId, setUpdatingOrderId] =
    useState<string | null>(null);

  const [error, setError] = useState("");

  useEffect(() => {
    loadInventory();
    loadIncomingOrders();
  }, []);

  useEffect(() => {
    if (!image) {
      setPreview(null);
      return;
    }

    const url = URL.createObjectURL(image);
    setPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [image]);

  async function loadInventory() {
    const data = await getInventory();
    setInventory(data);
  }

  async function loadIncomingOrders() {
    setOrdersLoading(true);

    try {
      const response = await fetch(
        "/api/farmer/orders?farmerName=Demo%20Farmer",
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to load incoming orders."
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
  }

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
      const farmer: Farmer = {
        id: crypto.randomUUID(),
        name: "Demo Farmer",
        produce,
        quantity: quantityNumber,
        grade: quality.grade,
        location,
        distanceKm: 0,
      };

      const saved = await addInventoryItem(
        farmer,
        quality.score,
        quality.confidence,
        quality.observations
      );

      if (!saved) {
        throw new Error(
          "Failed to save inventory."
        );
      }

      await loadInventory();
      await loadIncomingOrders();

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
        t("validation.produceAddedSuccess")
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

      if (status === "Dispatched") {
        const orderResponse = await fetch(
          `/api/orders?id=${orderId}`,
          {
            cache: "no-store",
          }
        );

        const orderData =
          await orderResponse.json();

        if (!orderResponse.ok) {
          throw new Error(
            orderData.error ||
              "Failed to load order details."
          );
        }

        const order = orderData.orders?.[0];

        if (!order) {
          throw new Error(
            "Order details could not be found."
          );
        }

        const shipmentResponse = await fetch(
          "/api/shipments",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              orderId: order.id,
              origin: location,
              destination: order.destination,
              totalQuantityKg:
                order.fulfilled_quantity_kg,
            }),
          }
        );

        const shipmentData =
          await shipmentResponse.json();

        if (!shipmentResponse.ok) {
          throw new Error(
            shipmentData.error ||
              "Failed to create shipment."
          );
        }

        const shipment =
          shipmentData.shipment;

        if (shipment?.id) {
          const shipmentUpdateResponse =
            await fetch("/api/shipments", {
              method: "PATCH",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                id: shipment.id,
                status: "In Transit",
                currentLocation: location,
              }),
            });

          const shipmentUpdateData =
            await shipmentUpdateResponse.json();

          if (!shipmentUpdateResponse.ok) {
            throw new Error(
              shipmentUpdateData.error ||
                "Failed to update shipment status."
            );
          }

          console.log(
            "X-MILE SHIPMENT NOW IN TRANSIT:",
            shipmentUpdateData
          );
        }
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

  function renderStatusActions(order: any) {
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
              value: incomingOrders.length,
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
                {t("farmer.quantityLabel")}
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
                {t("farmer.myListingsTitle")}
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                {t("farmer.inventoryDesc")}
              </p>
            </div>

            <div className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700">
              {inventory.length} {t("farmer.itemsCount")}
            </div>
          </div>

          {inventory.length === 0 ? (
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