"use client";

import { useState } from "react";
import PlatformHeader from "@/components/PlatformHeader";
import ConnectedFarmerJourney from "@/components/ConnectedFarmerJourney";
import { AgriInputItem, SEED_AGRI_INPUTS } from "@/lib/platform-db";

export default function InputsPage() {
  const [inputs] = useState<AgriInputItem[]>(SEED_AGRI_INPUTS);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const categories = ["ALL", "Certified Seeds", "Bio-Fertilizer", "Micro-Nutrients", "Drip Equipment"];

  const filtered = inputs.filter((item) => {
    const matchesCategory = selectedCategory === "ALL" || item.category === selectedCategory;
    const matchesSearch =
      item.productName.toLowerCase().includes(search.toLowerCase()) ||
      item.brand.toLowerCase().includes(search.toLowerCase()) ||
      item.sellerName.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#f7faf7] text-[#142319]">
      <PlatformHeader />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <ConnectedFarmerJourney activeStepId="prepare" />
        </div>

        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-800">
                Module 16 — Farm Inputs Transparency
              </span>
              <span className="text-xs text-gray-500">• Licensed Retailers & Transparent Pricing</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">
              Agri Input Price & Licensed Dealer Comparison
            </h1>
            <p className="text-xs text-gray-600 mt-1 max-w-2xl">
              Compare prices on certified hybrid seeds, bio-fertilizers, and drip components across licensed dealers.
              Eliminate counterfeit products and excessive retail markups.
            </p>
          </div>
        </div>

        {/* Category Pills & Search */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  selectedCategory === cat
                    ? "bg-emerald-600 text-white"
                    : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="w-full sm:w-72">
            <input
              type="text"
              placeholder="Search product, brand, or dealer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Inputs Comparison Grid */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filtered.map((item) => {
            const savings = item.mrp - item.bestPrice;
            const savingsPercent = Math.round((savings / item.mrp) * 100);

            return (
              <div
                key={item.id}
                className="rounded-3xl border border-gray-200 bg-white p-5 shadow-xs hover:border-emerald-400 hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-800">
                        {item.category}
                      </span>
                      <h3 className="text-base font-black text-gray-900 mt-1">{item.productName}</h3>
                      <p className="text-xs text-gray-500">Brand: {item.brand}</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl bg-gray-50 p-3 border border-gray-100">
                    <span className="text-[10px] text-gray-400 font-bold uppercase">Pack Size: {item.packSize}</span>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-xl font-black text-emerald-800">₹{item.bestPrice}</span>
                      <span className="text-xs text-gray-400 line-through">MRP ₹{item.mrp}</span>
                      {savings > 0 && (
                        <span className="rounded-md bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800">
                          {savingsPercent}% OFF
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 space-y-1.5 text-xs border-t border-gray-100 pt-3">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Licensed Dealer:</span>
                      <span className="font-bold text-gray-800">{item.sellerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Location:</span>
                      <span className="font-semibold text-gray-600">{item.sellerLocation}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Stock Status:</span>
                      <span className={`font-bold ${item.inStock ? "text-emerald-700" : "text-red-600"}`}>
                        {item.inStock ? "✓ In Stock" : "Out of Stock"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Verification:</span>
                      <span className="font-bold text-blue-700">✓ Authorized Distributor</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      alert(`Direct booking / price guarantee enquiry sent to ${item.sellerName} for ${item.productName}. Pick up with verified QR coupon.`);
                    }}
                    className="w-full rounded-xl bg-emerald-600 px-3 py-2 text-center text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
                  >
                    Lock Best Price 🏷️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
