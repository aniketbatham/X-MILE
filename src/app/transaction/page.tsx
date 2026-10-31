"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import LanguageSelector from "@/components/LanguageSelector";

type TransactionStatus =
  | "Accepted"
  | "Dispatched"
  | "Delivered"
  | "Disputed";

type Order = {
  id: string;
  buyer_name: string;
  produce: string;
  requested_quantity_kg: number;
  required_grade: string;
  destination: string;
  fulfilled_quantity_kg: number;
  fulfillment_percentage: number;
  status: TransactionStatus;
  created_at: string;
};

export default function TransactionPage() {
  const { t, formatNumber, formatDate } = useLanguage();
  const [order, setOrder] = useState<Order | null>(null);

  const milestones = [
    {
      name: t("transaction.milestoneAccepted"),
      percentage: 20,
      description: t("transaction.milestoneAcceptedDesc"),
    },
    {
      name: t("transaction.milestoneDispatched"),
      percentage: 40,
      description: t("transaction.milestoneDispatchedDesc"),
    },
    {
      name: t("transaction.milestoneDelivered"),
      percentage: 40,
      description: t("transaction.milestoneDeliveredDesc"),
    },
  ];

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [updating, setUpdating] = useState(false);

  const [showDispute, setShowDispute] =
    useState(false);

  useEffect(() => {
    loadLatestOrder();
  }, []);

  async function loadLatestOrder() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/orders"
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to load order."
        );
      }

      if (!data.orders || data.orders.length === 0) {
        setError(
          "No X-MILE order found. Create an order from the Buyer page first."
        );
        return;
      }

      setOrder(data.orders[0]);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load order."
      );
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(
    newStatus: TransactionStatus
  ) {
    if (!order) return;

    setUpdating(true);
    setError("");

    try {
      const response = await fetch(
        "/api/orders",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: order.id,
            status: newStatus,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to update transaction."
        );
      }

      setOrder(data.order);

      setShowDispute(false);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to update transaction."
      );
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="text-4xl">⏳</div>

          <p className="mt-3 font-semibold">
            Loading X-MILE transaction...
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Fetching the latest procurement order.
          </p>
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <nav className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
            <div className="flex items-center gap-3">
              <a href="/" className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#172019] text-sm font-black text-white shadow-sm">
                X
              </a>
              <div>
                <h1 className="text-xl font-bold">
                  X-MILE
                </h1>

                <p className="text-xs text-slate-500">
                  Every MILE Matters, Every FARMER Matters
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <LanguageSelector />

              <a
                href="/buyer"
                className="rounded-lg border px-4 py-2 text-sm hover:bg-slate-50"
              >
                ← {t("common.buyerPortal")}
              </a>
            </div>
          </div>
        </nav>

        <section className="mx-auto max-w-3xl px-6 py-20">
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center">
            <div className="text-5xl">📦</div>

            <h2 className="mt-4 text-2xl font-bold">
              {t("transaction.title")}
            </h2>

            <p className="mt-2 text-sm text-amber-900">
              {error}
            </p>

            <a
              href="/buyer"
              className="mt-6 inline-block rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white"
            >
              ← {t("common.buyerPortal")}
            </a>
          </div>
        </section>
      </main>
    );
  }

  const currentMilestone =
    order.status === "Accepted"
      ? 1
      : order.status === "Dispatched"
        ? 2
        : order.status === "Delivered"
          ? 3
          : 0;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* NAVBAR */}

      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <a href="/" className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#172019] text-sm font-black text-white shadow-sm">
              X
            </a>
            <div>
              <h1 className="text-xl font-bold">
                X-MILE
              </h1>

              <p className="text-xs text-slate-500">
                Every MILE Matters, Every FARMER Matters
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSelector />

            <a
              href="/buyer"
              className="rounded-lg border px-4 py-2 text-sm hover:bg-slate-50"
            >
              ← {t("common.buyerPortal")}
            </a>
          </div>
        </div>
      </nav>

      <section className="mx-auto max-w-6xl px-6 py-10">
        {/* HEADER */}

        <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">
          {t("nav.transaction")}
        </p>

        <h2 className="mt-2 text-4xl font-bold">
          {t("transaction.title")}
        </h2>

        <p className="mt-3 max-w-2xl text-slate-600">
          {t("transaction.subtitle")}
        </p>

        {/* ORDER CARD */}

        <section className="mt-8 rounded-3xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                X-MILE Order
              </p>

              <h3 className="mt-1 break-all text-xl font-bold font-mono">
                {order.id}
              </h3>
            </div>

            <div
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                order.status === "Accepted"
                  ? "bg-amber-50 text-amber-700"
                  : order.status === "Dispatched"
                    ? "bg-blue-50 text-blue-700"
                    : order.status === "Delivered"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-red-50 text-red-700"
              }`}
            >
              {order.status}
            </div>
          </div>

          {/* ORDER DETAILS */}

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">
                {t("transaction.buyer")}
              </p>

              <p className="mt-1 font-semibold">
                {order.buyer_name}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">
                {t("transaction.crop")}
              </p>

              <p className="mt-1 font-semibold">
                {order.produce}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">
                {t("farmer.quantityLabel")}
              </p>

              <p className="mt-1 font-semibold">
                {Number(
                  order.requested_quantity_kg
                ).toLocaleString()}{" "}
                kg
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">
                {t("quality.gradeLabel")}
              </p>

              <p className="mt-1 font-semibold">
                Grade {order.required_grade}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">
                {t("buyer.destinationCity")}
              </p>

              <p className="mt-1 font-semibold">
                {order.destination}
              </p>
            </div>
          </div>

          {/* FULFILLMENT */}

          <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
            <div className="flex justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                  {t("transaction.supplyFulfillment")}
                </p>

                <p className="mt-1 text-lg font-bold text-emerald-950">
                  {Number(
                    order.fulfilled_quantity_kg
                  ).toLocaleString()}{" "}
                  {t("transaction.kgAggregated")}
                </p>
              </div>

              <div className="text-right">
                <p className="text-2xl font-bold text-emerald-700">
                  {Number(
                    order.fulfillment_percentage
                  )}
                  %
                </p>

                <p className="text-xs text-emerald-800">
                  {t("buyer.fulfillmentRate")}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ESCROW */}

        <section className="mt-6 rounded-3xl border bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
            {t("transaction.escrowProgress")}
          </p>

          <h3 className="mt-1 text-2xl font-bold">
            {t("transaction.milestoneRelease")}
          </h3>

          <div className="mt-8 space-y-7">
            {milestones.map(
              (milestone, index) => {
                const completed =
                  currentMilestone > index;

                const active =
                  currentMilestone === index + 1;

                return (
                  <div
                    key={milestone.name}
                    className="flex items-start gap-4"
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        completed
                          ? "bg-emerald-600 text-white"
                          : active
                            ? "bg-slate-900 text-white"
                            : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {completed
                        ? "✓"
                        : index + 1}
                    </div>

                    <div className="flex-1">
                      <div className="flex justify-between gap-4">
                        <h4 className="font-semibold">
                          {milestone.name}
                        </h4>

                        <span className="font-bold text-emerald-700">
                          {milestone.percentage}%
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-slate-500">
                        {milestone.description}
                      </p>

                      <p className="mt-2 text-xs font-medium text-slate-400">
                        {completed
                          ? t("common.completed")
                          : active
                            ? t("buyer.currentStage")
                            : t("common.ready")}
                      </p>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </section>

        {/* CONTROLS */}

        <section className="mt-6 rounded-3xl border bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            {t("transaction.transactionControls")}
          </p>

          <h3 className="mt-1 text-xl font-bold">
            {t("transaction.updateOrderStatus")}
          </h3>

          <div className="mt-5 flex flex-wrap gap-3">
            {order.status !== "Delivered" &&
              order.status !== "Disputed" && (
                <button
                  onClick={() =>
                    updateStatus(
                      order.status ===
                        "Accepted"
                        ? "Dispatched"
                        : "Delivered"
                    )
                  }
                  disabled={updating}
                  className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {updating
                    ? t("common.processing")
                    : order.status ===
                        "Accepted"
                      ? `${t("transaction.stepDispatched")} →`
                      : `${t("transaction.deliveryConfirmed")} →`}
                </button>
              )}

            {order.status !== "Delivered" &&
              order.status !== "Disputed" && (
                <button
                  onClick={() =>
                    setShowDispute(true)
                  }
                  disabled={updating}
                  className="rounded-xl border border-red-200 px-5 py-3 font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  {t("transaction.raiseDispute")}
                </button>
              )}

            <button
              onClick={loadLatestOrder}
              disabled={loading}
              className="rounded-xl border border-slate-300 px-5 py-3 font-semibold hover:bg-slate-50"
            >
              ↻ {t("common.refresh")}
            </button>
          </div>
        </section>

        {/* DISPUTE */}

        {showDispute && (
          <section className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-red-700">
              {t("common.disputed")}
            </p>

            <h3 className="mt-1 text-xl font-bold text-red-950">
              {t("transaction.raiseDispute")}
            </h3>

            <p className="mt-2 text-sm leading-6 text-red-900">
              {t("transaction.msgDisputeHeld")}
            </p>

            <div className="mt-5 flex gap-3">
              <button
                onClick={() =>
                  updateStatus("Disputed")
                }
                disabled={updating}
                className="rounded-xl bg-red-700 px-5 py-3 font-semibold text-white hover:bg-red-800 disabled:opacity-50"
              >
                {updating
                  ? t("common.processing")
                  : t("transaction.confirmDispute")}
              </button>

              <button
                onClick={() =>
                  setShowDispute(false)
                }
                disabled={updating}
                className="rounded-xl border border-red-300 px-5 py-3 font-semibold text-red-700 hover:bg-white"
              >
                {t("common.cancel")}
              </button>
            </div>
          </section>
        )}

        {/* STATUS MESSAGE */}

        <section className="mt-6 rounded-3xl border bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="text-3xl">
              {order.status === "Accepted"
                ? "🤝"
                : order.status ===
                    "Dispatched"
                  ? "🚚"
                  : order.status ===
                      "Delivered"
                    ? "✅"
                    : "⚠️"}
            </div>

            <div>
              <h3 className="font-semibold">
                {order.status ===
                  "Accepted" &&
                  t("transaction.msgAccepted")}

                {order.status ===
                  "Dispatched" &&
                  t("transaction.msgDispatched")}

                {order.status ===
                  "Delivered" &&
                  t("transaction.msgDelivered")}

                {order.status ===
                  "Disputed" &&
                  t("transaction.msgDisputed")}
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                {order.status ===
                "Disputed"
                  ? t("transaction.msgDisputeHeld")
                  : t("transaction.msgPersisted")}
              </p>
            </div>
          </div>
        </section>

        {/* PROTOTYPE NOTE */}

        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {t("transaction.prototypeEscrowNote")}
        </div>
      </section>
    </main>
  );
}
