import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyServerSession } from "@/lib/server-auth";

const SEED_BENCHMARK_LISTINGS = [
  {
    id: "LIST-BENCHMARK-01",
    farmerName: "Siddaramaiah Gowda",
    cropName: "Tomato (Hybrid - Shivam)",
    category: "standard",
    quantityKg: 3500,
    qualityGrade: "A",
    askingPricePerKg: 24,
    harvestDate: "2026-11-04",
    pickupLocation: "Gubbi Gate, Tumakuru",
    district: "Tumakuru",
    state: "Karnataka",
    status: "ACTIVE",
    isSampleData: true,
  },
  {
    id: "LIST-BENCHMARK-02",
    farmerName: "Anand Murthy",
    cropName: "Paddy (Sona Masuri)",
    category: "standard",
    quantityKg: 5000,
    qualityGrade: "A",
    askingPricePerKg: 28,
    harvestDate: "2026-11-02",
    pickupLocation: "Kunigal Road, Tumakuru",
    district: "Tumakuru",
    state: "Karnataka",
    status: "ACTIVE",
    isSampleData: true,
  },
  {
    id: "LIST-BENCHMARK-03",
    farmerName: "Renuka Devi",
    cropName: "Carrot (Ooty Early)",
    category: "surplus",
    quantityKg: 1200,
    qualityGrade: "B",
    askingPricePerKg: 15,
    harvestDate: "2026-10-31",
    pickupLocation: "Sira Town, Tumakuru",
    district: "Tumakuru",
    state: "Karnataka",
    status: "ACTIVE",
    isSampleData: true,
  },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category"); // 'standard' | 'surplus' | null

    // 1. Try querying Supabase produce_listings
    let query = supabase.from("produce_listings").select("*").eq("status", "ACTIVE");
    if (category) {
      query = query.eq("category", category);
    }

    const { data: listings, error } = await query;

    if (error) {
      // If table produce_listings not yet migrated, attempt to pull from existing inventory table
      const { data: invData } = await supabase
        .from("inventory")
        .select("id, produce, quantity_kg, quality_grade, farmers(name, location)")
        .eq("available", true)
        .limit(10);

      const combined = [
        ...(invData || []).map((item: any) => ({
          id: item.id,
          farmerName: item.farmers?.name || "Verified Local Farmer",
          cropName: item.produce,
          category: "standard",
          quantityKg: Number(item.quantity_kg),
          qualityGrade: item.quality_grade || "A",
          askingPricePerKg: 22,
          harvestDate: new Date().toISOString().split("T")[0],
          pickupLocation: item.farmers?.location || "Tumakuru APMC",
          district: "Tumakuru",
          state: "Karnataka",
          status: "ACTIVE",
          isSampleData: false,
        })),
        ...SEED_BENCHMARK_LISTINGS,
      ];

      return Response.json({
        success: true,
        databaseSource: "HYBRID_INVENTORY_BENCHMARK",
        migrationPending: true,
        migrationNotice: "Table 'produce_listings' awaiting migration 001_complete_platform_schema.sql. Sourced from active inventory table.",
        listings: combined,
      });
    }

    return Response.json({
      success: true,
      databaseSource: "SUPABASE_LIVE",
      migrationPending: false,
      listings: listings && listings.length > 0 ? listings : SEED_BENCHMARK_LISTINGS,
    });
  } catch (err: any) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifyServerSession(request);

    let body: any;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const { type } = body;

    // Handle Buyer Offer submission
    if (type === "offer") {
      const { listingId, offeredPricePerKg, offeredQuantityKg, destinationCity } = body;

      if (!listingId || !offeredPricePerKg || !offeredQuantityKg || !destinationCity) {
        return Response.json(
          { error: "listingId, offeredPricePerKg, offeredQuantityKg, and destinationCity are required." },
          { status: 400 }
        );
      }

      const { data: newOffer, error: offerErr } = await supabase
        .from("buyer_offers")
        .insert({
          listing_id: listingId,
          buyer_id: session.profileId || null,
          offered_price_per_kg: Number(offeredPricePerKg),
          offered_quantity_kg: Number(offeredQuantityKg),
          destination_city: destinationCity.trim(),
          payment_terms: "Escrow on Delivery",
          status: "PENDING",
        })
        .select()
        .single();

      if (offerErr) {
        return Response.json(
          {
            success: false,
            error: `Failed to record offer in Supabase: ${offerErr.message}. Verify 'buyer_offers' table exists.`,
          },
          { status: 500 }
        );
      }

      return Response.json({
        success: true,
        message: "Procurement offer submitted and recorded in database.",
        offer: newOffer,
      });
    }

    // Otherwise handle new Produce Listing submission
    const { cropName, category, quantityKg, qualityGrade, askingPricePerKg, pickupLocation, district, state } = body;

    if (!cropName || !quantityKg || !askingPricePerKg || !pickupLocation) {
      return Response.json(
        { error: "cropName, quantityKg, askingPricePerKg, and pickupLocation are required." },
        { status: 400 }
      );
    }

    const numQty = Number(quantityKg);
    const numPrice = Number(askingPricePerKg);

    if (numQty <= 0 || numPrice <= 0) {
      return Response.json(
        { error: "Quantity and asking price must be greater than zero." },
        { status: 400 }
      );
    }

    const { data: newListing, error: listErr } = await supabase
      .from("produce_listings")
      .insert({
        farmer_id: session.profileId || null,
        crop_name: cropName.trim(),
        category: category === "surplus" ? "surplus" : "standard",
        quantity_kg: numQty,
        quality_grade: qualityGrade || "A",
        asking_price_per_kg: numPrice,
        harvest_date: new Date().toISOString().split("T")[0],
        pickup_location: pickupLocation.trim(),
        district: district?.trim() || "Tumakuru",
        state: state?.trim() || "Karnataka",
        status: "ACTIVE",
      })
      .select()
      .single();

    if (listErr) {
      return Response.json(
        {
          success: false,
          error: `Failed to create listing: ${listErr.message}. Verify 'produce_listings' table exists.`,
        },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      message: "Produce listing created and saved to database.",
      listing: newListing,
    });
  } catch (err: any) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
