"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

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

export default function BuyerPage() {
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
        "Please enter valid buyer requirements."
      );
      return;
    }

    setLoading(true);

    try {
      /*
        STEP 1
        Load farmer inventory.
      */

      const inventory =
        await getInventory();

      console.log(
        "HARVEX INVENTORY BEFORE AGGREGATION:",
        inventory
      );

      if (inventory.length === 0) {
        setError(
          "No farmer inventory is currently available."
        );
        return;
      }

      /*
        STEP 2
        Aggregate inventory.
      */

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
        "HARVEX AGGREGATION RESULT:",
        aggregation
      );

      setResult(aggregation);

      /*
        STEP 3
        Convert selected farmers into
        logistics pickup points.
      */

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

        /*
          STEP 4
          Optimize route.
        */

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
          : "Failed to find supply."
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
        "Please find supply before creating an order."
      );
      return;
    }

    if (
      result.selectedFarmers.length ===
      0
    ) {
      setError(
        "No farmer inventory has been selected."
      );
      return;
    }

    if (order) {
      setError(
        "This procurement request already has an order."
      );
      return;
    }

    try {
      setLoading(true);
      setError("");

      /*
        Build inventory reservation payload.
      */

      const selectedInventory =
        result.selectedFarmers.map(
          (farmer) => ({
            inventoryId: farmer.id,
            quantity: farmer.quantity,
          })
        );

      /*
        Convert "Any" into a valid
        database grade.
      */

      const orderGrade: Grade =
        grade === "Any"
          ? result.selectedFarmers[0]
              ?.grade ?? "C"
          : grade;

      /*
        Safety check.
      */

      if (
        orderGrade !== "A" &&
        orderGrade !== "B" &&
        orderGrade !== "C"
      ) {
        setError(
          "Invalid order grade. Please select Grade A, B, or C."
        );
        return;
      }

      console.log(
        "HARVEX ORDER GRADE:",
        orderGrade
      );

      console.log(
        "HARVEX INVENTORY BEING RESERVED:",
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
        "HARVEX ORDER API RESPONSE:",
        data
      );

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to create HARVEX order."
        );
      }

      /*
        Save created order.
      */

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
          "HARVEX order not found during refresh:",
          orderId
        );
        return;
      }

      console.log(
        "HARVEX LIVE ORDER STATUS:",
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
  */

  async function refreshShipment(
    orderId: string
  ) {
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
        return;
      }

      const data =
        await response.json();

      const latestShipment =
        data.shipments?.[0];

      if (!latestShipment) {
        return;
      }

      console.log(
        "HARVEX LIVE SHIPMENT:",
        latestShipment
      );

      setShipment(
        latestShipment
      );
    } catch (err) {
      console.error(
        "Live shipment refresh failed:",
        err
      );
    }
  }

  /*
    ADVANCE SHIPMENT

    This is the automatic movement engine.

    Every polling cycle, an In Transit
    shipment moves forward by 10%.
  */

  async function advanceShipment(
    orderId: string
  ) {
    try {
      const response =
        await fetch(
          "/api/shipments",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              action: "advance",
              orderId,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        console.error(
          "Failed to advance shipment:",
          data.error
        );
        return;
      }

      if (data.shipment) {
        console.log(
          "HARVEX SHIPMENT MOVED:",
          data.shipment
        );

        setShipment(
          data.shipment
        );
      }
    } catch (err) {
      console.error(
        "Automatic shipment movement failed:",
        err
      );
    }
  }

  /*
    LIVE ORDER + SHIPMENT POLLING

    Refresh immediately and then every
    10 seconds.

    If the shipment is In Transit,
    HARVEX automatically advances it.
  */

  useEffect(() => {
    if (!order?.id) {
      return;
    }

    const orderId = order.id;

    async function updateLiveTracking() {
      await refreshOrderStatus(
        orderId
      );

      await refreshShipment(
        orderId
      );

      /*
        Only advance shipments that
        are already In Transit.

        We intentionally do not advance
        Preparing shipments.
      */
      if (
        shipment?.status ===
        "In Transit"
      ) {
        await advanceShipment(
          orderId
        );
      }
    }

    /*
      Initial refresh.
    */
    updateLiveTracking();

    const interval =
      setInterval(() => {
        updateLiveTracking();
      }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [
    order?.id,
    shipment?.status,
  ]);

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

  /*
    Use the actual shipment movement
    percentage from the database.
  */
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
    <main className="min-h-screen bg-slate-50">
      {/* NAVBAR */}

      <nav className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              HARVEX
            </h1>

            <p className="text-xs font-medium text-slate-500">
              Smart Agricultural Supply Network
            </p>
          </div>

          <div className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-700">
            Buyer Portal
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl space-y-8 px-6 py-8">
        {/* HEADER */}

        <section>
          <p className="text-sm font-bold uppercase tracking-wider text-emerald-600">
            Procurement Intelligence
          </p>

          <h2 className="mt-2 text-4xl font-black text-slate-900">
            Buyer Demand & Supply
          </h2>

          <p className="mt-2 max-w-3xl text-slate-600">
            HARVEX forecasts demand,
            aggregates fragmented
            farmer inventory, and
            plans efficient pickup
            logistics.
          </p>
        </section>

        {/* BUYER REQUIREMENT */}

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-black text-slate-900">
            Buyer Requirement
          </h3>

          <div className="mt-6 grid gap-5 md:grid-cols-4">
            <div>
              <label className="text-sm font-bold text-slate-700">
                Produce
              </label>

              <select
                value={produce}
                onChange={(e) =>
                  setProduce(
                    e.target.value
                  )
                }
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"
              >
                <option>
                  Tomato
                </option>

                <option>
                  Potato
                </option>

                <option>
                  Onion
                </option>
              </select>
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Quantity (kg)
              </label>

              <input
                type="number"
                value={quantity}
                onChange={(e) =>
                  setQuantity(
                    e.target.value
                  )
                }
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Required Grade
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
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"
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
              <label className="text-sm font-bold text-slate-700">
                Destination
              </label>

              <select
                value={destination}
                onChange={(e) =>
                  setDestination(
                    e.target.value
                  )
                }
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"
              >
                <option>
                  Bengaluru
                </option>

                <option>
                  Tumakuru
                </option>

                <option>
                  Mysuru
                </option>

                <option>
                  Mandya
                </option>

                <option>
                  Hassan
                </option>
              </select>
            </div>
          </div>

          <button
            onClick={findSupply}
            disabled={loading}
            className="mt-6 rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Finding Supply..."
              : "Find Supply"}
          </button>
        </section>

        {/* DEMAND FORECAST */}

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
                Demand Forecast
              </p>

              <h3 className="mt-1 text-2xl font-black text-slate-900">
                Predicted Demand
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Based on recent sample
                demand history.
              </p>
            </div>

            <div className="rounded-2xl bg-blue-50 px-6 py-4 text-center">
              <p className="text-sm font-semibold text-blue-600">
                Forecast
              </p>

              <p className="text-3xl font-black text-blue-900">
                {forecastDemand.toLocaleString()}{" "}
                kg
              </p>
            </div>
          </div>
        </section>

        {/* ERROR */}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* AGGREGATION */}

        {result && (
          <>
            {/* SUPPLY AGGREGATION */}

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wider text-emerald-600">
                    Supply Aggregation
                  </p>

                  <h3 className="mt-1 text-2xl font-black text-slate-900">
                    {result.totalQuantity.toLocaleString()}{" "}
                    kg Fulfilled
                  </h3>

                  <p className="mt-2 max-w-3xl text-slate-600">
                    {
                      result.aggregationSummary
                    }
                  </p>
                </div>

                <div className="rounded-2xl bg-emerald-50 px-6 py-4 text-center">
                  <p className="text-sm font-semibold text-emerald-600">
                    Fulfillment
                  </p>

                  <p className="text-3xl font-black text-emerald-900">
                    {
                      result.fulfillmentPercentage
                    }
                    %
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">
                    Eligible Farmers
                  </p>

                  <p className="mt-1 text-2xl font-black">
                    {
                      result.eligibleFarmerCount
                    }
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">
                    Selected Farmers
                  </p>

                  <p className="mt-1 text-2xl font-black">
                    {
                      result
                        .selectedFarmers
                        .length
                    }
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">
                    Remaining
                  </p>

                  <p className="mt-1 text-2xl font-black">
                    {
                      result.remainingQuantity
                    }{" "}
                    kg
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl bg-slate-50 p-4">
                <p className="font-bold text-slate-800">
                  Quality Priority
                </p>

                <p className="mt-1 text-sm text-slate-600">
                  {
                    result.qualityPriority
                  }
                </p>
              </div>
            </section>

            {/* FARMER SELECTION */}

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-bold uppercase tracking-wider text-emerald-600">
                Farmer Selection
              </p>

              <h3 className="mt-1 text-2xl font-black text-slate-900">
                Selected Inventory
              </h3>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[700px] text-left">
                  <thead>
                    <tr className="border-b text-sm text-slate-500">
                      <th className="pb-3">
                        Farmer
                      </th>

                      <th className="pb-3">
                        Produce
                      </th>

                      <th className="pb-3">
                        Allocated
                      </th>

                      <th className="pb-3">
                        Grade
                      </th>

                      <th className="pb-3">
                        AI Score
                      </th>

                      <th className="pb-3">
                        Location
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {result.selectedFarmers.map(
                      (farmer) => (
                        <tr
                          key={farmer.id}
                          className="border-b last:border-0"
                        >
                          <td className="py-4 font-bold">
                            {farmer.name}
                          </td>

                          <td className="py-4">
                            {farmer.produce}
                          </td>

                          <td className="py-4 font-bold">
                            {
                              farmer.quantity
                            }{" "}
                            kg
                          </td>

                          <td className="py-4">
                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                              Grade{" "}
                              {
                                farmer.grade
                              }
                            </span>
                          </td>

                          <td className="py-4">
                            {
                              farmer.qualityScore ??
                              "—"
                            }
                          </td>

                          <td className="py-4">
                            {
                              farmer.location
                            }
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
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
                    Logistics Intelligence
                  </p>

                  <h3 className="mt-1 text-2xl font-black text-slate-900">
                    Optimized Pickup Route
                  </h3>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-4">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">
                      Pickup Points
                    </p>

                    <p className="mt-1 text-2xl font-black">
                      {
                        route
                          .pickupPoints
                          .length
                      }
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">
                      Total Quantity
                    </p>

                    <p className="mt-1 text-2xl font-black">
                      {
                        route.totalQuantity
                      }{" "}
                      kg
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">
                      Distance
                    </p>

                    <p className="mt-1 text-2xl font-black">
                      {
                        route.estimatedDistanceKm
                      }{" "}
                      km
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">
                      Route Time
                    </p>

                    <p className="mt-1 text-2xl font-black">
                      {
                        route.estimatedRouteTimeMinutes
                      }{" "}
                      min
                    </p>
                  </div>
                </div>

                <div className="mt-6">
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

                <div className="mt-6 rounded-2xl bg-blue-50 p-4 text-sm text-blue-800">
                  {route.optimized
                    ? "OSRM road-network routing optimized the pickup sequence."
                    : "Route optimization was unavailable, so HARVEX used the fallback logistics plan."}
                </div>
              </section>
            )}

            {/* CREATE ORDER */}

            <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
              <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wider text-emerald-700">
                    Procurement
                  </p>

                  <h3 className="mt-1 text-2xl font-black text-emerald-950">
                    Create HARVEX Order
                  </h3>

                  <p className="mt-1 text-sm text-emerald-800">
                    The selected inventory
                    quantities will be
                    attached to this
                    order for reservation.
                  </p>
                </div>

                <button
                  onClick={createOrder}
                  disabled={
                    loading || !!order
                  }
                  className="rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {order
                    ? "Order Created"
                    : loading
                      ? "Processing..."
                      : "Create HARVEX Order"}
                </button>
              </div>
            </section>

            {/* ORDER PROGRESS */}

            {order && (
              <>
                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div>
                      <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
                        Order Tracking
                      </p>

                      <h3 className="mt-1 text-2xl font-black text-slate-900">
                        HARVEX Order Progress
                      </h3>

                      <p className="mt-1 break-all text-sm text-slate-500">
                        Order ID:{" "}
                        {order.id}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />

                      <span
                        className={`rounded-full px-4 py-2 text-sm font-bold ${
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
                        {
                          order.status
                        }
                      </span>
                    </div>
                  </div>

                  {/* ORDER DETAILS */}

                  <div className="mt-8">
                    <p className="text-sm font-bold uppercase tracking-wider text-slate-500">
                      Order Details
                    </p>

                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-sm text-slate-500">
                          Buyer
                        </p>

                        <p className="mt-1 font-black text-slate-900">
                          {
                            order.buyer_name
                          }
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-sm text-slate-500">
                          Produce
                        </p>

                        <p className="mt-1 font-black text-slate-900">
                          {
                            order.produce
                          }
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-sm text-slate-500">
                          Required Grade
                        </p>

                        <p className="mt-1 font-black text-slate-900">
                          Grade{" "}
                          {
                            order.required_grade
                          }
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-sm text-slate-500">
                          Destination
                        </p>

                        <p className="mt-1 font-black text-slate-900">
                          {
                            order.destination
                          }
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-sm text-slate-500">
                          Created
                        </p>

                        <p className="mt-1 font-black text-slate-900">
                          {new Date(
                            order.created_at
                          ).toLocaleString()}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-sm text-slate-500">
                          Requested
                        </p>

                        <p className="mt-1 font-black text-slate-900">
                          {order.requested_quantity_kg.toLocaleString()}{" "}
                          kg
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ORDER SUMMARY */}

                  <div className="mt-8 grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">
                        Requested
                      </p>

                      <p className="mt-1 text-2xl font-black text-slate-900">
                        {order.requested_quantity_kg.toLocaleString()}{" "}
                        kg
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">
                        Fulfilled
                      </p>

                      <p className="mt-1 text-2xl font-black text-slate-900">
                        {order.fulfilled_quantity_kg.toLocaleString()}{" "}
                        kg
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">
                        Fulfillment
                      </p>

                      <p className="mt-1 text-2xl font-black text-slate-900">
                        {
                          order.fulfillment_percentage
                        }
                        %
                      </p>
                    </div>
                  </div>

                  {/* PROGRESS BAR */}

                  {order.status !==
                    "Disputed" && (
                    <div className="mt-8">
                      <div className="mb-3 flex justify-between text-sm font-bold text-slate-600">
                        <span>
                          Order Progress
                        </span>

                        <span>
                          {Math.round(
                            progressPercentage
                          )}
                          %
                        </span>
                      </div>

                      <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                          style={{
                            width: `${progressPercentage}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* ORDER TIMELINE */}

                  {order.status ===
                  "Disputed" ? (
                    <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-5">
                      <p className="font-black text-red-800">
                        Order Disputed
                      </p>

                      <p className="mt-1 text-sm text-red-700">
                        This order has
                        been marked as
                        disputed and
                        requires
                        attention.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-8">
                      <div className="mb-6 flex items-center justify-between">
                        <p className="text-sm font-bold uppercase tracking-wider text-slate-500">
                          Order Timeline
                        </p>

                        <p className="text-xs font-semibold text-slate-400">
                          Live updates
                          every 10
                          seconds
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
                                key={
                                  step
                                }
                                className="flex flex-1 items-start md:flex-col md:items-center"
                              >
                                <div className="flex items-center md:w-full">
                                  <div
                                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                                      completed
                                        ? "bg-emerald-600 text-white"
                                        : "bg-slate-200 text-slate-500"
                                    } ${
                                      isCurrent
                                        ? "ring-4 ring-emerald-100"
                                        : ""
                                    }`}
                                  >
                                    {completed
                                      ? "✓"
                                      : index +
                                        1}
                                  </div>

                                  {index <
                                    orderSteps.length -
                                      1 && (
                                    <div
                                      className={`hidden h-1 flex-1 md:block ${
                                        index <
                                        currentOrderStep
                                          ? "bg-emerald-500"
                                          : "bg-slate-200"
                                      }`}
                                    />
                                  )}
                                </div>

                                <div className="ml-4 md:ml-0 md:mt-3 md:text-center">
                                  <p
                                    className={`font-bold ${
                                      completed
                                        ? "text-slate-900"
                                        : "text-slate-400"
                                    }`}
                                  >
                                    {
                                      step
                                    }
                                  </p>

                                  <p className="mt-1 text-xs text-slate-500">
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

                  <div className="mt-8 rounded-2xl bg-blue-50 p-5">
                    <p className="font-bold text-blue-900">
                      Current Status
                    </p>

                    <p className="mt-1 text-sm text-blue-800">
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
                  <section className="rounded-3xl border border-blue-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                      <div>
                        <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
                          Live Shipment
                        </p>

                        <h3 className="mt-1 text-2xl font-black text-slate-900">
                          Shipment Tracking
                        </h3>

                        <p className="mt-1 break-all text-sm text-slate-500">
                          Shipment ID:{" "}
                          {shipment.id}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        {shipment.status !==
                          "Delivered" && (
                          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-blue-500" />
                        )}

                        <span
                          className={`rounded-full px-4 py-2 text-sm font-bold ${
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
                          {
                            shipment.status
                          }
                        </span>
                      </div>
                    </div>

                    {/* SHIPMENT PROGRESS */}

                    {shipment.status !==
                      "Delayed" && (
                      <div className="mt-8">
                        <div className="mb-3 flex justify-between text-sm font-bold text-slate-600">
                          <span>
                            Shipment Progress
                          </span>

                          <span>
                            {Math.round(
                              shipmentProgress
                            )}
                            %
                          </span>
                        </div>

                        <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-blue-500 transition-all duration-1000"
                            style={{
                              width: `${shipmentProgress}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* SHIPMENT TIMELINE */}

                    <div className="mt-8">
                      <div className="mb-6 flex items-center justify-between">
                        <p className="text-sm font-bold uppercase tracking-wider text-slate-500">
                          Shipment Timeline
                        </p>

                        <p className="text-xs font-semibold text-slate-400">
                          Live updates
                          every 10
                          seconds
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
                                key={
                                  step
                                }
                                className={`rounded-2xl border p-4 ${
                                  completed
                                    ? "border-blue-200 bg-blue-50"
                                    : "border-slate-200 bg-slate-50"
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
                                      : "bg-slate-200 text-slate-500"
                                  }`}
                                >
                                  {completed
                                    ? "✓"
                                    : index +
                                      1}
                                </div>

                                <p
                                  className={`mt-3 font-bold ${
                                    completed
                                      ? "text-slate-900"
                                      : "text-slate-400"
                                  }`}
                                >
                                  {
                                    step
                                  }
                                </p>
                              </div>
                            );
                          }
                        )}
                      </div>
                    </div>

                    {/* ROUTE */}

                    <div className="mt-8 grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl bg-slate-50 p-5">
                        <p className="text-sm font-semibold text-slate-500">
                          Pickup
                        </p>

                        <p className="mt-1 text-xl font-black text-slate-900">
                          {
                            shipment.origin ||
                            "Pickup location"
                          }
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-5">
                        <p className="text-sm font-semibold text-slate-500">
                          Destination
                        </p>

                        <p className="mt-1 text-xl font-black text-slate-900">
                          {
                            shipment.destination
                          }
                        </p>
                      </div>
                    </div>

                    {/* CURRENT LOCATION */}

                    <div className="mt-4 rounded-2xl bg-blue-50 p-5">
                      <p className="text-sm font-bold text-blue-700">
                        📍 Current
                        Location
                      </p>

                      <p className="mt-1 text-lg font-black text-blue-950">
                        {shipment.current_location ||
                          shipment.origin ||
                          "Location unavailable"}
                      </p>

                      <p className="mt-1 text-xs text-blue-700">
                        Last updated{" "}
                        {new Date(
                          shipment.updated_at
                        ).toLocaleString()}
                      </p>
                    </div>

                    {/* SHIPMENT DETAILS */}

                    <div className="mt-6 grid gap-4 md:grid-cols-3">
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-sm text-slate-500">
                          Quantity
                        </p>

                        <p className="mt-1 text-2xl font-black text-slate-900">
                          {shipment.total_quantity_kg.toLocaleString()}{" "}
                          kg
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-sm text-slate-500">
                          Distance Remaining
                        </p>

                        <p className="mt-1 text-2xl font-black text-slate-900">
                          {shipment.estimated_distance_km !=
                          null
                            ? `${Number(
                                shipment.estimated_distance_km
                              ).toFixed(1)} km`
                            : "—"}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-sm text-slate-500">
                          Estimated Time
                        </p>

                        <p className="mt-1 text-2xl font-black text-slate-900">
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
                      <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-5">
                        <div className="flex items-center gap-3">
                          <span className="h-3 w-3 animate-pulse rounded-full bg-blue-600" />

                          <p className="font-black text-blue-950">
                            🚚 Shipment moving
                            toward{" "}
                            {
                              shipment.destination
                            }
                          </p>
                        </div>

                        <p className="mt-2 text-sm text-blue-800">
                          HARVEX automatically
                          updates the shipment
                          position every 10
                          seconds.
                        </p>
                      </div>
                    )}

                    {/* DELIVERY COMPLETE */}

                    {shipment.status ===
                      "Delivered" && (
                      <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                        <p className="font-black text-emerald-900">
                          ✅ Shipment Delivered
                        </p>

                        <p className="mt-1 text-sm text-emerald-800">
                          The shipment has
                          reached{" "}
                          {
                            shipment.destination
                          }{" "}
                          successfully.
                        </p>
                      </div>
                    )}

                    {/* LIVE INDICATOR */}

                    <div className="mt-6 flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
                      <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />

                      <p className="text-sm font-semibold text-slate-600">
                        Shipment data refreshes
                        automatically every 10
                        seconds.
                      </p>
                    </div>
                  </section>
                )}
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}