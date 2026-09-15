"use client";

import { useEffect, useState } from "react";
import { addInventoryItem, getInventory } from "@/lib/inventory";
import type { Farmer } from "@/lib/aggregation";

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
  const [produce, setProduce] = useState("Tomato");
  const [quantity, setQuantity] = useState("");
  const [location, setLocation] = useState("Tumakuru");
  const [image, setImage] = useState<File | null>(null);

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

  // -----------------------------------------
  // LOAD INVENTORY
  // -----------------------------------------

  async function loadInventory() {
    const data = await getInventory();
    setInventory(data);
  }

  // -----------------------------------------
  // LOAD INCOMING ORDERS
  // -----------------------------------------

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

  // -----------------------------------------
  // INITIAL LOAD
  // -----------------------------------------

  useEffect(() => {
    loadInventory();
    loadIncomingOrders();
  }, []);

  // -----------------------------------------
  // AI QUALITY ANALYSIS
  // -----------------------------------------

  async function analyzeQuality() {
    setError("");
    setQuality(null);

    if (!image) {
      setError(
        "Please upload a produce image."
      );
      return;
    }

    if (!produce.trim()) {
      setError(
        "Please select the produce type."
      );
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();

      formData.append("image", image);
      formData.append("produce", produce);

      const response = await fetch(
        "/api/quality",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Quality analysis failed."
        );
      }

      const parsed: QualityResult =
        JSON.parse(data.result);

      setQuality(parsed);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Quality analysis failed."
      );
    } finally {
      setLoading(false);
    }
  }

  // -----------------------------------------
  // CONFIRM INVENTORY LISTING
  // -----------------------------------------

  async function confirmListing() {
    setError("");

    const quantityNumber = Number(quantity);

    if (!produce.trim()) {
      setError(
        "Please select the produce."
      );
      return;
    }

    if (
      !quantityNumber ||
      quantityNumber <= 0
    ) {
      setError(
        "Please enter a valid quantity."
      );
      return;
    }

    if (!quality) {
      setError(
        "Please analyze the produce image first."
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
        "Produce successfully added to HARVEX pooled inventory."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save listing."
      );
    } finally {
      setSaving(false);
    }
  }

  // -----------------------------------------
  // UPDATE ORDER STATUS
  // -----------------------------------------

   async function updateOrderStatus(
  orderId: string,
  status: OrderStatus
) {
  setError("");
  setUpdatingOrderId(orderId);

  try {
    /*
      STEP 1
      Update the main HARVEX order status.
    */
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
        data.error || "Failed to update order status."
      );
    }

    /*
      STEP 2
      When the farmer dispatches the order,
      create the shipment if it does not already exist.
    */
    if (status === "Dispatched") {
      const orderResponse = await fetch(
        `/api/orders?id=${orderId}`,
        {
          cache: "no-store",
        }
      );

      const orderData = await orderResponse.json();

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

      /*
        Create shipment.
        The API safely returns the existing shipment
        if one already exists.
      */
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

      /*
        STEP 3
        Immediately move the shipment into
        IN TRANSIT.

        This makes Farmer "Mark Dispatched"
        correspond to actual shipment movement.
      */
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
          "HARVEX SHIPMENT NOW IN TRANSIT:",
          shipmentUpdateData
        );
      }
    }

    /*
      STEP 4
      Refresh Farmer orders immediately.
    */
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

  // -----------------------------------------
  // STATUS STYLES
  // -----------------------------------------

  function getStatusClass(
    status: string
  ) {
    switch (status) {
      case "Delivered":
        return "bg-green-100 text-green-700";

      case "Dispatched":
        return "bg-blue-100 text-blue-700";

      case "Disputed":
        return "bg-red-100 text-red-700";

      default:
        return "bg-yellow-100 text-yellow-700";
    }
  }

  // -----------------------------------------
  // STATUS ACTIONS
  // -----------------------------------------

  function renderStatusActions(
    order: any
  ) {
    if (!order?.id) {
      return null;
    }

    const status =
      order.status as OrderStatus;

    const isUpdating =
      updatingOrderId === order.id;

    if (status === "Disputed") {
      return (
        <span className="text-xs font-medium text-red-600">
          Order disputed
        </span>
      );
    }

    if (status === "Delivered") {
      return (
        <span className="text-xs font-semibold text-green-600">
          ✓ Completed
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
          className="rounded-xl bg-green-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isUpdating
            ? "Updating..."
            : "Mark Delivered"}
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
        className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isUpdating
          ? "Updating..."
          : "Mark Dispatched"}
      </button>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f8f5] text-[#172019]">
      {/* -----------------------------------------
          HEADER
      ----------------------------------------- */}

      <header className="border-b border-black/10 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-black tracking-tight">
              HARVEX
            </h1>

            <p className="text-sm text-gray-500">
              Farmer Dashboard
            </p>
          </div>

          <div className="rounded-full bg-green-100 px-4 py-2 text-xs font-bold text-green-700">
            FARMER
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* -----------------------------------------
            PAGE INTRO
        ----------------------------------------- */}

        <section className="mb-10">
          <h2 className="text-3xl font-black tracking-tight">
            Manage Your Produce
          </h2>

          <p className="mt-2 max-w-2xl text-gray-500">
            List your produce, verify quality with
            HARVEX AI, and track orders reserved from
            your inventory.
          </p>
        </section>

        {/* -----------------------------------------
            ERROR
        ----------------------------------------- */}

        {error && (
          <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {/* -----------------------------------------
            PRODUCE LISTING
        ----------------------------------------- */}

        <section className="rounded-3xl border border-black/10 bg-white p-7 shadow-sm">
          <div className="mb-7">
            <h2 className="text-xl font-bold">
              List Produce
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Add fresh produce to the HARVEX
              pooled inventory.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* PRODUCE */}

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Produce
              </label>

              <select
                value={produce}
                onChange={(e) =>
                  setProduce(e.target.value)
                }
                className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-green-500"
              >
                <option value="Tomato">
                  Tomato
                </option>

                <option value="Onion">
                  Onion
                </option>

                <option value="Potato">
                  Potato
                </option>

                <option value="Carrot">
                  Carrot
                </option>

                <option value="Cabbage">
                  Cabbage
                </option>

                <option value="Chilli">
                  Chilli
                </option>
              </select>
            </div>

            {/* QUANTITY */}

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Quantity (kg)
              </label>

              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) =>
                  setQuantity(e.target.value)
                }
                placeholder="Enter quantity"
                className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-green-500"
              />
            </div>

            {/* LOCATION */}

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Location
              </label>

              <input
                type="text"
                value={location}
                onChange={(e) =>
                  setLocation(e.target.value)
                }
                className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-green-500"
              />
            </div>

            {/* IMAGE */}

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Produce Image
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
                className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm"
              />
            </div>
          </div>

          {/* AI ANALYSIS */}

          <div className="mt-7 rounded-2xl bg-[#f7f8f5] p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="font-bold">
                  AI Quality Assessment
                </h3>

                <p className="mt-1 text-xs text-gray-500">
                  Analyze the produce image before
                  listing your inventory.
                </p>
              </div>

              <button
                type="button"
                onClick={analyzeQuality}
                disabled={loading}
                className="rounded-xl bg-black px-5 py-3 text-sm font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Analyzing..."
                  : "Analyze with HARVEX AI"}
              </button>
            </div>
          </div>

          {/* QUALITY RESULT */}

          {quality && (
            <div className="mt-7 rounded-2xl border border-green-200 bg-green-50 p-6">
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-green-700">
                    Quality Grade
                  </p>

                  <p className="mt-1 text-4xl font-black text-green-800">
                    {quality.grade}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-green-700">
                    Score
                  </p>

                  <p className="mt-1 text-xl font-black text-green-800">
                    {quality.score}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-green-700">
                    Confidence
                  </p>

                  <p className="mt-1 text-xl font-black text-green-800">
                    {quality.confidence}%
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-green-700">
                    Suitability
                  </p>

                  <p className="mt-1 text-xl font-black text-green-800">
                    {quality.suitability}
                  </p>
                </div>
              </div>

              {quality.observations?.length >
                0 && (
                <div className="mt-6">
                  <p className="text-sm font-bold">
                    Observations
                  </p>

                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                    {quality.observations.map(
                      (item, index) => (
                        <li key={index}>
                          {item}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}

              {quality.visibleDefects
                ?.length > 0 && (
                <div className="mt-5">
                  <p className="text-sm font-bold">
                    Visible Defects
                  </p>

                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                    {quality.visibleDefects.map(
                      (item, index) => (
                        <li key={index}>
                          {item}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* CONFIRM */}

          <div className="mt-7 flex justify-end">
            <button
              type="button"
              onClick={confirmListing}
              disabled={saving}
              className="rounded-xl bg-green-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : "Confirm & List Produce"}
            </button>
          </div>
        </section>

        {/* -----------------------------------------
            INVENTORY
        ----------------------------------------- */}

        <section className="mt-10 rounded-3xl border border-black/10 bg-white p-7 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold">
                Inventory Dashboard
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Produce currently available in the
                HARVEX pooled inventory.
              </p>
            </div>

            <div className="rounded-full bg-green-100 px-4 py-2 text-xs font-bold text-green-700">
              {inventory.length} ITEMS
            </div>
          </div>

          {inventory.length === 0 ? (
            <div className="mt-8 rounded-2xl bg-[#f7f8f5] p-8 text-center text-sm text-gray-500">
              No inventory listed yet.
            </div>
          ) : (
            <div className="mt-8 overflow-x-auto">
              <table className="w-full min-w-[700px] text-left">
                <thead>
                  <tr className="border-b border-black/10 text-xs uppercase tracking-wider text-gray-500">
                    <th className="pb-4 pr-5">
                      Produce
                    </th>

                    <th className="pb-4 pr-5">
                      Quantity
                    </th>

                    <th className="pb-4 pr-5">
                      Grade
                    </th>

                    <th className="pb-4 pr-5">
                      Location
                    </th>

                    <th className="pb-4">
                      Distance
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
                        className="border-b border-black/5 last:border-0"
                      >
                        <td className="py-5 pr-5 font-semibold">
                          {item.produce}
                        </td>

                        <td className="py-5 pr-5">
                          {item.quantity} kg
                        </td>

                        <td className="py-5 pr-5">
                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                            Grade{" "}
                            {item.grade}
                          </span>
                        </td>

                        <td className="py-5 pr-5 text-sm text-gray-600">
                          {item.location}
                        </td>

                        <td className="py-5 text-sm text-gray-600">
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

        {/* -----------------------------------------
            INCOMING ORDERS
        ----------------------------------------- */}

        <section className="mt-10 rounded-3xl border border-black/10 bg-white p-7 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold">
                Incoming Orders
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Orders containing produce reserved
                from your inventory.
              </p>
            </div>

            <div className="rounded-full bg-orange-100 px-4 py-2 text-xs font-bold text-orange-700">
              {incomingOrders.length} ORDERS
            </div>
          </div>

          {ordersLoading ? (
            <div className="mt-8 rounded-2xl bg-[#f7f8f5] p-8 text-center text-sm text-gray-500">
              Loading incoming orders...
            </div>
          ) : incomingOrders.length ===
            0 ? (
            <div className="mt-8 rounded-2xl bg-[#f7f8f5] p-8 text-center text-sm text-gray-500">
              No incoming orders found.
            </div>
          ) : (
            <div className="mt-8 overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left">
                <thead>
                  <tr className="border-b border-black/10 text-xs uppercase tracking-wider text-gray-500">
                    <th className="pb-4 pr-5">
                      Buyer
                    </th>

                    <th className="pb-4 pr-5">
                      Produce
                    </th>

                    <th className="pb-4 pr-5">
                      Reserved
                    </th>

                    <th className="pb-4 pr-5">
                      Grade
                    </th>

                    <th className="pb-4 pr-5">
                      Destination
                    </th>

                    <th className="pb-4 pr-5">
                      Order Status
                    </th>

                    <th className="pb-4 pr-5">
                      Action
                    </th>

                    <th className="pb-4">
                      Created
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
                          className="border-b border-black/5 last:border-0"
                        >
                          {/* BUYER */}

                          <td className="py-5 pr-5 font-semibold">
                            {
                              order.buyer_name
                            }
                          </td>

                          {/* PRODUCE */}

                          <td className="py-5 pr-5">
                            {order.produce}
                          </td>

                          {/* RESERVED */}

                          <td className="py-5 pr-5">
                            <span className="font-semibold">
                              {
                                item.quantity_kg
                              }{" "}
                              kg
                            </span>

                            {inventoryItem
                              ?.reserved_quantity_kg !=
                              null && (
                              <p className="mt-1 text-xs text-gray-400">
                                Inventory
                                reserved
                              </p>
                            )}
                          </td>

                          {/* GRADE */}

                          <td className="py-5 pr-5">
                            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold">
                              {
                                order.required_grade
                              }
                            </span>
                          </td>

                          {/* DESTINATION */}

                          <td className="py-5 pr-5 text-sm text-gray-600">
                            {
                              order.destination
                            }
                          </td>

                          {/* STATUS */}

                          <td className="py-5 pr-5">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(
                                order.status
                              )}`}
                            >
                              {
                                order.status
                              }
                            </span>
                          </td>

                          {/* ACTION */}

                          <td className="py-5 pr-5">
                            {renderStatusActions(
                              order
                            )}
                          </td>

                          {/* CREATED */}

                          <td className="py-5 text-sm text-gray-500">
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
      </div>
    </main>
  );
}
