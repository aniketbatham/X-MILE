"use client";

import { useState } from "react";
import Link from "next/link";
import PlatformHeader from "@/components/PlatformHeader";
import ConnectedFarmerJourney from "@/components/ConnectedFarmerJourney";
import { PlatformDb, MarketplaceListing, MarketplaceOffer } from "@/lib/platform-db";

export default function MarketplacePage() {
  const [listings, setListings] = useState<MarketplaceListing[]>(PlatformDb.getListings());
  const [offers, setOffers] = useState<MarketplaceOffer[]>(PlatformDb.getOffers());
  const [categoryFilter, setCategoryFilter] = useState<"all" | "standard" | "surplus">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedListingForOffer, setSelectedListingForOffer] = useState<MarketplaceListing | null>(null);

  // New Listing Form state
  const [newListing, setNewListing] = useState({
    cropName: "Tomato",
    variety: "US-440 Hybrid",
    category: "standard" as "standard" | "surplus",
    quantityKg: 3000,
    qualityGrade: "A" as "A" | "B" | "C",
    askingPricePerKg: 18.0,
    harvestDate: new Date().toISOString().split("T")[0],
    pickupLocation: "Kunigal Taluk Gate",
    district: "Tumakuru",
    state: "Karnataka",
  });

  // Buyer Offer Form state
  const [offerForm, setOfferForm] = useState({
    buyerName: "Deepak Agarwal",
    buyerCompany: "Apex Agri Retailers",
    offeredPricePerKg: 17.5,
    offeredQuantityKg: 3000,
    destinationCity: "Bengaluru",
    paymentTerms: "X-MILE Milestone Escrow",
  });

  const [alertNotice, setAlertNotice] = useState<string | null>(null);

  const filteredListings = listings.filter((l) => {
    const matchesCategory = categoryFilter === "all" || l.category === categoryFilter;
    const matchesSearch =
      l.cropName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.variety.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCreateListing = (e: React.FormEvent) => {
    e.preventDefault();
    const created = PlatformDb.addListing({
      ...newListing,
      farmerId: "usr-farmer-01",
      farmerName: "Rameshwar Patel",
      farmerPhone: "+91 98765 43210",
      qualityScore: newListing.qualityGrade === "A" ? 92 : newListing.qualityGrade === "B" ? 82 : 70,
      images: [],
    });
    setListings(PlatformDb.getListings());
    setIsCreateOpen(false);
    setAlertNotice(`✓ Produce listing for ${created.cropName} (${created.quantityKg} kg) is now LIVE on X-MILE marketplace!`);
    setTimeout(() => setAlertNotice(null), 4000);
  };

  const handleSubmitOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedListingForOffer) return;

    PlatformDb.addOffer({
      listingId: selectedListingForOffer.id,
      cropName: selectedListingForOffer.cropName,
      buyerName: offerForm.buyerName,
      buyerCompany: offerForm.buyerCompany,
      offeredPricePerKg: offerForm.offeredPricePerKg,
      offeredQuantityKg: offerForm.offeredQuantityKg,
      destinationCity: offerForm.destinationCity,
      paymentTerms: offerForm.paymentTerms,
    });

    setOffers(PlatformDb.getOffers());
    setSelectedListingForOffer(null);
    setAlertNotice(`✓ Formal procurement offer submitted for ${selectedListingForOffer.cropName}! Farmer notified.`);
    setTimeout(() => setAlertNotice(null), 4000);
  };

  const handleAcceptOffer = (offerId: string) => {
    PlatformDb.updateOfferStatus(offerId, "ACCEPTED");
    setOffers(PlatformDb.getOffers());
    setAlertNotice("✓ Offer accepted! Order created and linked to Escrow & Transport workflow.");
    setTimeout(() => setAlertNotice(null), 4000);
  };

  return (
    <div className="min-h-screen bg-[#f7faf7] text-[#142319]">
      <PlatformHeader />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <ConnectedFarmerJourney activeStepId="sell" />
        </div>

        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-800">
                Module 04 & 14 — Direct Trade Marketplace
              </span>
              <span className="text-xs text-gray-500">• Farmer Listings & Surplus Exchange</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">
              Produce Marketplace & Surplus Clearinghouse
            </h1>
            <p className="text-xs text-gray-600 mt-1 max-w-2xl">
              Connect verified farmers directly with bulk institutional buyers, supermarkets, and food processors.
              All orders are backed by milestone escrow and AI quality grading.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
            >
              + Create Produce Listing
            </button>
            <Link
              href="/buyer"
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
            >
              Buyer Portal →
            </Link>
          </div>
        </div>

        {alertNotice && (
          <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-100/90 p-3 text-xs font-bold text-emerald-950">
            {alertNotice}
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl bg-white p-4 border border-gray-200 shadow-2xs">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setCategoryFilter("all")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                categoryFilter === "all" ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              All Listings
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter("standard")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                categoryFilter === "standard" ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Standard Harvests
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter("surplus")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                categoryFilter === "surplus" ? "bg-amber-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              ⚡ Surplus Exchange (Discounted)
            </button>
          </div>

          <div className="w-full sm:w-72">
            <input
              type="text"
              placeholder="Search by crop, variety, or district..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3.5 py-1.5 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Listings Grid */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredListings.map((listing) => (
            <div
              key={listing.id}
              className={`rounded-3xl border bg-white p-5 shadow-xs transition hover:shadow-md flex flex-col justify-between ${
                listing.category === "surplus" ? "border-amber-200 hover:border-amber-400" : "border-gray-200 hover:border-emerald-400"
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                        listing.category === "surplus"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {listing.category === "surplus" ? "Surplus / Fast Clearance" : "Standard Lot"}
                    </span>
                    <h3 className="text-lg font-black text-gray-900 mt-1">{listing.cropName}</h3>
                    <p className="text-xs text-gray-500">{listing.variety}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-gray-400">Asking Price</span>
                    <p className="text-base font-black text-emerald-700">₹{listing.askingPricePerKg}/kg</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2 border-t border-gray-100 pt-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Available Volume:</span>
                    <span className="font-bold text-gray-900">{listing.quantityKg.toLocaleString()} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">AI Quality Grade:</span>
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-bold text-emerald-800">
                      Grade {listing.qualityGrade} ({listing.qualityScore}%)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Location:</span>
                    <span className="font-semibold text-gray-700">{listing.pickupLocation}, {listing.district}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Farmer:</span>
                    <span className="font-semibold text-gray-900">{listing.farmerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Ready Date:</span>
                    <span className="font-semibold text-gray-700">{listing.harvestDate}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedListingForOffer(listing);
                    setOfferForm({
                      ...offerForm,
                      offeredPricePerKg: listing.askingPricePerKg,
                      offeredQuantityKg: listing.quantityKg,
                    });
                  }}
                  className="flex-1 rounded-xl bg-emerald-600 px-3 py-2 text-center text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
                >
                  Make Purchase Offer 🛒
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Active Incoming / Outgoing Offers Section */}
        <div className="mt-12 rounded-3xl border border-gray-200 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-gray-900">Procurement Offers & Bids ({offers.length})</h2>
            <span className="text-xs text-gray-400 font-medium">Linked to Escrow & Weighment</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-200 bg-gray-50 text-gray-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3 font-bold">Crop</th>
                  <th className="px-4 py-3 font-bold">Buyer & Company</th>
                  <th className="px-4 py-3 font-bold">Offered Quantity</th>
                  <th className="px-4 py-3 font-bold">Offered Price</th>
                  <th className="px-4 py-3 font-bold">Destination</th>
                  <th className="px-4 py-3 font-bold">Payment Terms</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {offers.map((off) => (
                  <tr key={off.id} className="hover:bg-gray-50/80 transition">
                    <td className="px-4 py-3 font-black text-gray-900">{off.cropName}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-gray-800">{off.buyerName}</div>
                      <div className="text-[10px] text-gray-400">{off.buyerCompany}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold">{off.offeredQuantityKg.toLocaleString()} kg</td>
                    <td className="px-4 py-3 font-bold text-emerald-700">₹{off.offeredPricePerKg}/kg</td>
                    <td className="px-4 py-3 text-gray-600">{off.destinationCity}</td>
                    <td className="px-4 py-3 text-[10px] text-gray-500">{off.paymentTerms}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold ${
                          off.status === "ACCEPTED"
                            ? "bg-emerald-100 text-emerald-800"
                            : off.status === "REJECTED"
                            ? "bg-red-100 text-red-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {off.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {off.status === "PENDING" ? (
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleAcceptOffer(off.id)}
                            className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              PlatformDb.updateOfferStatus(off.id, "REJECTED");
                              setOffers(PlatformDb.getOffers());
                            }}
                            className="rounded-lg border border-gray-200 px-2.5 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-50"
                          >
                            Decline
                          </button>
                        </div>
                      ) : (
                        <Link
                          href="/transaction"
                          className="text-[11px] font-bold text-emerald-700 hover:underline"
                        >
                          View Order →
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Create Produce Listing */}
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 className="text-lg font-black text-gray-900">Post New Produce Listing</h3>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-lg p-1 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateListing} className="mt-4 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Crop Name</label>
                    <input
                      type="text"
                      required
                      value={newListing.cropName}
                      onChange={(e) => setNewListing({ ...newListing, cropName: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Variety</label>
                    <input
                      type="text"
                      required
                      value={newListing.variety}
                      onChange={(e) => setNewListing({ ...newListing, variety: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Category</label>
                    <select
                      value={newListing.category}
                      onChange={(e) => setNewListing({ ...newListing, category: e.target.value as any })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="standard">Standard Harvest Lot</option>
                      <option value="surplus">Surplus / Rapid Clearance</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Quality Grade</label>
                    <select
                      value={newListing.qualityGrade}
                      onChange={(e) => setNewListing({ ...newListing, qualityGrade: e.target.value as any })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="A">Grade A (Premium Quality)</option>
                      <option value="B">Grade B (Standard Market)</option>
                      <option value="C">Grade C (Processing Grade)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Quantity (kg)</label>
                    <input
                      type="number"
                      required
                      value={newListing.quantityKg}
                      onChange={(e) => setNewListing({ ...newListing, quantityKg: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Asking Price (₹/kg)</label>
                    <input
                      type="number"
                      step="0.5"
                      required
                      value={newListing.askingPricePerKg}
                      onChange={(e) => setNewListing({ ...newListing, askingPricePerKg: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Farm Pickup Point</label>
                  <input
                    type="text"
                    required
                    value={newListing.pickupLocation}
                    onChange={(e) => setNewListing({ ...newListing, pickupLocation: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
                  >
                    Publish to Marketplace
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Submit Buyer Offer */}
        {selectedListingForOffer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-gray-100">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <h3 className="text-base font-black text-gray-900">
                    Procurement Offer for {selectedListingForOffer.cropName}
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Farmer: {selectedListingForOffer.farmerName} • Listed: ₹{selectedListingForOffer.askingPricePerKg}/kg
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedListingForOffer(null)}
                  className="rounded-lg p-1 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmitOffer} className="mt-4 space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Buyer / Company Name</label>
                  <input
                    type="text"
                    required
                    value={offerForm.buyerCompany}
                    onChange={(e) => setOfferForm({ ...offerForm, buyerCompany: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Offered Price (₹/kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={offerForm.offeredPricePerKg}
                      onChange={(e) => setOfferForm({ ...offerForm, offeredPricePerKg: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Quantity (kg)</label>
                    <input
                      type="number"
                      required
                      value={offerForm.offeredQuantityKg}
                      onChange={(e) => setOfferForm({ ...offerForm, offeredQuantityKg: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Delivery Destination City</label>
                  <input
                    type="text"
                    required
                    value={offerForm.destinationCity}
                    onChange={(e) => setOfferForm({ ...offerForm, destinationCity: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="rounded-xl bg-gray-50 p-2.5 text-[11px] text-gray-500 border border-gray-100">
                  Total Offer Value: <strong className="text-gray-900">₹{(offerForm.offeredPricePerKg * offerForm.offeredQuantityKg).toLocaleString()}</strong> via Escrow.
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setSelectedListingForOffer(null)}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
                  >
                    Send Binding Offer
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
