"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import PlatformHeader from "@/components/PlatformHeader";
import ConnectedFarmerJourney from "@/components/ConnectedFarmerJourney";
import { useAuth } from "@/context/AuthContext";

export interface LiveProduceListing {
  id: string;
  farmer_id: string;
  crop_name: string;
  variety: string | null;
  category: "standard" | "surplus";
  quantity_kg: number;
  quality_grade: string;
  asking_price_per_kg: number;
  harvest_date: string;
  pickup_location: string;
  district: string;
  state: string;
  images: string[];
  status: string;
  is_verified_lot: boolean;
  created_at: string;
  profiles?: {
    id: string;
    full_name: string;
    district: string;
    state: string;
    is_verified: boolean;
  } | null;
}

export interface LiveBuyerOffer {
  id: string;
  listing_id: string;
  buyer_id: string;
  offered_price_per_kg: number;
  offered_quantity_kg: number;
  destination_city: string;
  payment_terms: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "COUNTERED" | "CANCELLED";
  created_at: string;
  produce_listings?: {
    id: string;
    crop_name: string;
    variety?: string;
    asking_price_per_kg: number;
    pickup_location: string;
    district: string;
    state: string;
  } | null;
  buyer_profiles?: {
    id: string;
    full_name: string;
    district: string;
    state: string;
    is_verified: boolean;
  } | null;
}

export default function MarketplacePage() {
  const { user, token, isAuthenticated } = useAuth();
  const [listings, setListings] = useState<LiveProduceListing[]>([]);
  const [offers, setOffers] = useState<LiveBuyerOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<"all" | "standard" | "surplus">("all");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date_desc");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedListingForOffer, setSelectedListingForOffer] = useState<LiveProduceListing | null>(null);
  const [detailedListing, setDetailedListing] = useState<LiveProduceListing | null>(null);

  // New Listing Form state
  const [newListing, setNewListing] = useState({
    cropName: "Tomato",
    variety: "US-440 Hybrid",
    category: "standard" as "standard" | "surplus",
    quantityKg: 3000,
    qualityGrade: "A",
    askingPricePerKg: 18.0,
    harvestDate: new Date().toISOString().split("T")[0],
    pickupLocation: "Kunigal Taluk Gate",
    district: user?.district || "Tumakuru",
    state: user?.state || "Karnataka",
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Buyer Offer Form state
  const [offerForm, setOfferForm] = useState({
    offeredPricePerKg: 17.5,
    offeredQuantityKg: 3000,
    destinationCity: "Bengaluru",
    paymentTerms: "Escrow on Delivery",
  });
  const [offerSubmitting, setOfferSubmitting] = useState(false);

  const [alertNotice, setAlertNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadListings = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== "all") params.append("category", categoryFilter);
      if (gradeFilter !== "all") params.append("qualityGrade", gradeFilter);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());
      if (sortBy) params.append("sort", sortBy);

      const res = await fetch(`/api/platform/marketplace?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.listings)) {
        setListings(data.listings);
      } else {
        setListings([]);
      }
    } catch {
      setListings([]);
    } finally {
      setIsLoading(false);
    }
  }, [categoryFilter, gradeFilter, searchQuery, sortBy, token]);

  const loadOffers = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch("/api/platform/marketplace/offers", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.offers)) {
        setOffers(data.offers);
      }
    } catch {
      // Ignore offer load error if unauthenticated
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadListings();
      loadOffers();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadListings, loadOffers]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setErrorMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/platform/marketplace/upload", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to upload image.");
      }

      setUploadedImages((prev) => [...prev, data.url]);
      setAlertNotice("✓ Produce photo uploaded to marketplace-listings bucket.");
      setTimeout(() => setAlertNotice(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Image upload failed.";
      setErrorMessage(msg);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/platform/marketplace", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ...newListing,
          images: uploadedImages,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create produce listing.");
      }

      setIsCreateOpen(false);
      setUploadedImages([]);
      setAlertNotice(`✓ Produce listing for ${newListing.cropName} (${newListing.quantityKg} kg) is now LIVE!`);
      setTimeout(() => setAlertNotice(null), 5000);
      await loadListings();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to publish listing.";
      setErrorMessage(msg);
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleSubmitOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedListingForOffer) return;
    setOfferSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/platform/marketplace/offers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          listingId: selectedListingForOffer.id,
          offeredPricePerKg: offerForm.offeredPricePerKg,
          offeredQuantityKg: offerForm.offeredQuantityKg,
          destinationCity: offerForm.destinationCity,
          paymentTerms: offerForm.paymentTerms,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit procurement offer.");
      }

      setSelectedListingForOffer(null);
      setAlertNotice(`✓ Formal procurement offer submitted for ${selectedListingForOffer.crop_name}! Farmer notified.`);
      setTimeout(() => setAlertNotice(null), 5000);
      await loadOffers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Offer submission failed.";
      setErrorMessage(msg);
    } finally {
      setOfferSubmitting(false);
    }
  };

  const handleUpdateOfferStatus = async (offerId: string, action: "ACCEPT" | "REJECT") => {
    try {
      const res = await fetch("/api/platform/marketplace/offers", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ offerId, action }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Failed to ${action.toLowerCase()} offer.`);
      }

      setAlertNotice(`✓ Offer successfully ${action === "ACCEPT" ? "accepted" : "declined"}.`);
      setTimeout(() => setAlertNotice(null), 4000);
      await loadOffers();
      await loadListings();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update offer.";
      setErrorMessage(msg);
    }
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
                Authoritative Marketplace
              </span>
              <span className="text-xs text-gray-500">• Live Staging Network</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">
              Produce Marketplace & Surplus Clearinghouse
            </h1>
            <p className="text-xs text-gray-600 mt-1 max-w-2xl">
              Connect verified farmers directly with bulk institutional buyers. Zero fabricated data. 
              All listings and offers backed by PostgreSQL RLS security.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated && (user?.role === "FARMER" || user?.role === "ADMIN") ? (
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
              >
                + Create Produce Listing
              </button>
            ) : (
              <Link
                href="/farmer"
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
              >
                Farmer Hub →
              </Link>
            )}
            <Link
              href="/buyer"
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
            >
              Buyer Portal →
            </Link>
          </div>
        </div>

        {alertNotice && (
          <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-bold text-emerald-950 animate-in fade-in">
            {alertNotice}
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-xs font-bold text-red-900 animate-in fade-in">
            {errorMessage}
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4 rounded-2xl bg-white p-4 border border-gray-200 shadow-2xs">
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
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
              Standard Lots
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter("surplus")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                categoryFilter === "surplus" ? "bg-amber-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              ⚡ Surplus Lots
            </button>

            {/* Quality Grade Filter */}
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700"
            >
              <option value="all">All Grades</option>
              <option value="A">Grade A</option>
              <option value="B">Grade B</option>
              <option value="C">Grade C</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700"
            >
              <option value="date_desc">Newest First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="quantity_desc">Quantity: High to Low</option>
            </select>
          </div>

          <div className="w-full md:w-72">
            <input
              type="text"
              placeholder="Search by crop, variety, district..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3.5 py-1.5 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Listings Grid */}
        {isLoading ? (
          <div className="mt-12 text-center py-16">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-r-transparent" />
            <p className="mt-3 text-xs font-bold text-gray-500">Querying live staging marketplace...</p>
          </div>
        ) : listings.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <span className="text-3xl">🌾</span>
            <h3 className="mt-3 text-base font-bold text-gray-900">No produce listings found</h3>
            <p className="mt-1 text-xs text-gray-500 max-w-md mx-auto">
              There are currently no active listings matching your filters.
              {isAuthenticated && (user?.role === "FARMER" || user?.role === "ADMIN")
                ? " You can publish the first produce listing using the button below!"
                : " Log in as a Farmer to publish produce listings, or check back soon."}
            </p>
            {isAuthenticated && (user?.role === "FARMER" || user?.role === "ADMIN") && (
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
              >
                + Publish First Listing
              </button>
            )}
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <div
                key={listing.id}
                className={`rounded-3xl border bg-white p-5 shadow-xs transition hover:shadow-md flex flex-col justify-between ${
                  listing.category === "surplus" ? "border-amber-200 hover:border-amber-400" : "border-gray-200 hover:border-emerald-400"
                }`}
              >
                <div>
                  {listing.images && listing.images.length > 0 && (
                    <div className="mb-3 overflow-hidden rounded-2xl h-40 bg-gray-100 relative">
                      <img
                        src={listing.images[0]}
                        alt={listing.crop_name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}

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
                      <h3 className="text-lg font-black text-gray-900 mt-1">{listing.crop_name}</h3>
                      <p className="text-xs text-gray-500">{listing.variety || "Local Hybrid"}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-gray-400">Asking Price</span>
                      <p className="text-base font-black text-emerald-700">₹{listing.asking_price_per_kg}/kg</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 border-t border-gray-100 pt-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Available Volume:</span>
                      <span className="font-bold text-gray-900">{Number(listing.quantity_kg).toLocaleString()} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Quality Grade:</span>
                      <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-bold text-emerald-800">
                        Grade {listing.quality_grade}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Location:</span>
                      <span className="font-semibold text-gray-700">{listing.pickup_location}, {listing.district}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Seller:</span>
                      <span className="font-semibold text-gray-900 flex items-center gap-1">
                        {listing.profiles?.full_name || "Verified Local Farmer"}
                        {listing.profiles?.is_verified && (
                          <span className="text-[10px] text-emerald-600" title="Verified Producer">✓</span>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Ready Date:</span>
                      <span className="font-semibold text-gray-700">{listing.harvest_date}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex gap-2 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setDetailedListing(listing)}
                    className="rounded-xl border border-gray-200 px-3 py-2 text-center text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
                  >
                    View Details
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedListingForOffer(listing);
                      setOfferForm({
                        ...offerForm,
                        offeredPricePerKg: listing.asking_price_per_kg,
                        offeredQuantityKg: listing.quantity_kg,
                      });
                    }}
                    className="flex-1 rounded-xl bg-emerald-600 px-3 py-2 text-center text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
                  >
                    Make Offer 🛒
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Active Offers Section */}
        {isAuthenticated && offers.length > 0 && (
          <div className="mt-12 rounded-3xl border border-gray-200 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-gray-900">Procurement Offers & Bids ({offers.length})</h2>
              <span className="text-xs text-gray-400 font-medium">Authoritative Database Status</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-gray-200 bg-gray-50 text-gray-500 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3 font-bold">Crop</th>
                    <th className="px-4 py-3 font-bold">Buyer</th>
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
                      <td className="px-4 py-3 font-black text-gray-900">
                        {off.produce_listings?.crop_name || "Produce"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-gray-800">
                          {off.buyer_profiles?.full_name || "Verified Buyer"}
                        </div>
                        <div className="text-[10px] text-gray-400">{off.buyer_profiles?.district || "India"}</div>
                      </td>
                      <td className="px-4 py-3 font-semibold">{Number(off.offered_quantity_kg).toLocaleString()} kg</td>
                      <td className="px-4 py-3 font-bold text-emerald-700">₹{off.offered_price_per_kg}/kg</td>
                      <td className="px-4 py-3 text-gray-600">{off.destination_city}</td>
                      <td className="px-4 py-3 text-[10px] text-gray-500">{off.payment_terms}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold ${
                            off.status === "ACCEPTED"
                              ? "bg-emerald-100 text-emerald-800"
                              : off.status === "REJECTED"
                              ? "bg-red-100 text-red-800"
                              : off.status === "CANCELLED"
                              ? "bg-gray-100 text-gray-600"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {off.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {off.status === "PENDING" && (user?.role === "FARMER" || user?.role === "ADMIN") ? (
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateOfferStatus(off.id, "ACCEPT")}
                              className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700"
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateOfferStatus(off.id, "REJECT")}
                              className="rounded-lg border border-gray-200 px-2.5 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-50"
                            >
                              Decline
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

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
                    <label className="block font-bold text-gray-700 mb-1">Crop Name *</label>
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
                      value={newListing.variety}
                      onChange={(e) => setNewListing({ ...newListing, variety: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Category *</label>
                    <select
                      value={newListing.category}
                      onChange={(e) => setNewListing({ ...newListing, category: e.target.value as "standard" | "surplus" })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="standard">Standard Harvest Lot</option>
                      <option value="surplus">Surplus / Rapid Clearance</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Quality Grade *</label>
                    <select
                      value={newListing.qualityGrade}
                      onChange={(e) => setNewListing({ ...newListing, qualityGrade: e.target.value })}
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
                    <label className="block font-bold text-gray-700 mb-1">Quantity (kg) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={newListing.quantityKg}
                      onChange={(e) => setNewListing({ ...newListing, quantityKg: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Asking Price (₹/kg) *</label>
                    <input
                      type="number"
                      step="0.5"
                      required
                      min="0.5"
                      value={newListing.askingPricePerKg}
                      onChange={(e) => setNewListing({ ...newListing, askingPricePerKg: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Expected Harvest Date *</label>
                    <input
                      type="date"
                      required
                      value={newListing.harvestDate}
                      onChange={(e) => setNewListing({ ...newListing, harvestDate: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">District *</label>
                    <input
                      type="text"
                      required
                      value={newListing.district}
                      onChange={(e) => setNewListing({ ...newListing, district: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Farm Pickup Location *</label>
                  <input
                    type="text"
                    required
                    value={newListing.pickupLocation}
                    onChange={(e) => setNewListing({ ...newListing, pickupLocation: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Storage Photo Upload to marketplace-listings bucket */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Produce Photo (Uploaded to marketplace-listings bucket)
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-1 file:text-xs file:font-bold file:text-emerald-700"
                  />
                  {uploadingImage && <p className="mt-1 text-[11px] text-emerald-600">Uploading photo to Supabase storage...</p>}
                  {uploadedImages.length > 0 && (
                    <div className="mt-2 flex gap-2">
                      {uploadedImages.map((img, idx) => (
                        <div key={idx} className="h-16 w-16 overflow-hidden rounded-lg border border-gray-200">
                          <img src={img} alt="Uploaded produce" className="h-full w-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
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
                    disabled={createSubmitting}
                    className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {createSubmitting ? "Publishing..." : "Publish to Marketplace"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Detailed Listing View */}
        {detailedListing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 className="text-lg font-black text-gray-900">{detailedListing.crop_name} — Lot #{detailedListing.id.slice(0, 8)}</h3>
                <button
                  type="button"
                  onClick={() => setDetailedListing(null)}
                  className="rounded-lg p-1 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {detailedListing.images && detailedListing.images.length > 0 && (
                <div className="mt-4 overflow-hidden rounded-2xl h-52 bg-gray-100">
                  <img
                    src={detailedListing.images[0]}
                    alt={detailedListing.crop_name}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}

              <div className="mt-4 space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-2xl">
                  <div>
                    <span className="text-gray-500">Asking Price</span>
                    <p className="text-base font-black text-emerald-700">₹{detailedListing.asking_price_per_kg}/kg</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Total Lot Volume</span>
                    <p className="text-base font-black text-gray-900">{Number(detailedListing.quantity_kg).toLocaleString()} kg</p>
                  </div>
                </div>

                <div className="space-y-1.5 border-t border-gray-100 pt-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Variety:</span>
                    <span className="font-semibold text-gray-900">{detailedListing.variety || "Standard Hybrid"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Quality Grade:</span>
                    <span className="font-semibold text-gray-900">Grade {detailedListing.quality_grade}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Expected Harvest:</span>
                    <span className="font-semibold text-gray-900">{detailedListing.harvest_date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Pickup Location:</span>
                    <span className="font-semibold text-gray-900">{detailedListing.pickup_location}, {detailedListing.district}, {detailedListing.state}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Seller:</span>
                    <span className="font-semibold text-gray-900">
                      {detailedListing.profiles?.full_name || "Verified Local Producer"}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl bg-emerald-50 p-3 text-[11px] text-emerald-900 border border-emerald-100">
                  🔒 <strong>Privacy Protected:</strong> Seller contact details are kept private and released upon mutual offer acceptance under Milestone Escrow.
                </div>
              </div>

              <div className="mt-5 flex gap-3 justify-end border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={() => setDetailedListing(null)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const l = detailedListing;
                    setDetailedListing(null);
                    setSelectedListingForOffer(l);
                    setOfferForm({
                      ...offerForm,
                      offeredPricePerKg: l.asking_price_per_kg,
                      offeredQuantityKg: l.quantity_kg,
                    });
                  }}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                >
                  Make Offer →
                </button>
              </div>
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
                    Procurement Offer for {selectedListingForOffer.crop_name}
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Listed Price: ₹{selectedListingForOffer.asking_price_per_kg}/kg • Available: {Number(selectedListingForOffer.quantity_kg).toLocaleString()} kg
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Offered Price (₹/kg) *</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      min="0.1"
                      value={offerForm.offeredPricePerKg}
                      onChange={(e) => setOfferForm({ ...offerForm, offeredPricePerKg: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Quantity (kg) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max={selectedListingForOffer.quantity_kg}
                      value={offerForm.offeredQuantityKg}
                      onChange={(e) => setOfferForm({ ...offerForm, offeredQuantityKg: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Delivery Destination City *</label>
                  <input
                    type="text"
                    required
                    value={offerForm.destinationCity}
                    onChange={(e) => setOfferForm({ ...offerForm, destinationCity: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Payment & Escrow Terms</label>
                  <select
                    value={offerForm.paymentTerms}
                    onChange={(e) => setOfferForm({ ...offerForm, paymentTerms: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="Escrow on Delivery">Milestone Escrow on Delivery</option>
                    <option value="Advance 20% + Balance Escrow">Advance 20% + Balance Escrow</option>
                    <option value="Immediate APMC Settlement">Immediate APMC Settlement</option>
                  </select>
                </div>

                <div className="rounded-xl bg-gray-50 p-2.5 text-[11px] text-gray-500 border border-gray-100">
                  Total Offer Commitment: <strong className="text-gray-900">₹{(offerForm.offeredPricePerKg * offerForm.offeredQuantityKg).toLocaleString()}</strong>
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
                    disabled={offerSubmitting}
                    className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {offerSubmitting ? "Submitting..." : "Send Binding Offer"}
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
