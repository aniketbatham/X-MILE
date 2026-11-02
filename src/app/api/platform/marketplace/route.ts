import { NextRequest } from "next/server";
import { supabase as anonClient } from "@/lib/supabase";
import { verifyServerSession, getAuthenticatedClient } from "@/lib/server-auth";
import { getServiceSupabase } from "@/lib/supabase-server";

interface MarketplaceBody {
  id?: string;
  cropName?: string;
  crop_name?: string;
  variety?: string;
  category?: "standard" | "surplus";
  quantityKg?: number | string;
  quantity_kg?: number | string;
  qualityGrade?: string;
  quality_grade?: string;
  askingPricePerKg?: number | string;
  asking_price_per_kg?: number | string;
  harvestDate?: string;
  harvest_date?: string;
  pickupLocation?: string;
  pickup_location?: string;
  district?: string;
  state?: string;
  images?: string[];
  status?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const cropName = searchParams.get("cropName") || searchParams.get("search");
    const qualityGrade = searchParams.get("qualityGrade");
    const district = searchParams.get("district");
    const state = searchParams.get("state");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const sort = searchParams.get("sort") || "date_desc";
    const farmerId = searchParams.get("farmerId");
    const listingId = searchParams.get("listingId") || searchParams.get("id");

    const session = await verifyServerSession(request);
    const client = session.token ? getAuthenticatedClient(session.token) : anonClient;

    let query = client
      .from("produce_listings")
      .select(`
        id,
        farmer_id,
        crop_name,
        variety,
        category,
        quantity_kg,
        quality_grade,
        asking_price_per_kg,
        harvest_date,
        pickup_location,
        district,
        state,
        images,
        status,
        is_verified_lot,
        created_at
      `);

    // If specific listing requested
    if (listingId) {
      query = query.eq("id", listingId);
      const { data: singleListing, error } = await query.maybeSingle();
      if (error) {
        return Response.json({ success: false, error: error.message }, { status: 500 });
      }
      if (!singleListing) {
        return Response.json({ success: false, error: "Listing not found." }, { status: 404 });
      }

      let profileData = null;
      if (singleListing.farmer_id) {
        try {
          const serviceDb = getServiceSupabase();
          const { data: profiles } = await serviceDb
            .from("profiles")
            .select("id, full_name, district, state, is_verified")
            .eq("id", singleListing.farmer_id);
          if (profiles && profiles.length > 0) {
            profileData = profiles[0];
          }
        } catch {
          // Graceful fallback if service key unavailable
        }
      }

      return Response.json({
        success: true,
        listing: {
          ...singleListing,
          profiles: profileData,
        },
      });
    }

    // Filter by farmer
    if (farmerId) {
      query = query.eq("farmer_id", farmerId);
      // If the authenticated user is NOT this farmer and NOT an admin, only show ACTIVE
      if (session.userId !== farmerId && !session.isAdmin) {
        query = query.eq("status", "ACTIVE");
      }
    } else {
      // By default for public marketplace, show ACTIVE listings
      query = query.eq("status", "ACTIVE");
    }

    if (category && category !== "all") {
      query = query.eq("category", category);
    }
    if (qualityGrade && qualityGrade !== "all") {
      query = query.eq("quality_grade", qualityGrade);
    }
    if (district && district !== "all") {
      query = query.ilike("district", `%${district}%`);
    }
    if (state && state !== "all") {
      query = query.ilike("state", `%${state}%`);
    }
    if (cropName && cropName.trim()) {
      query = query.ilike("crop_name", `%${cropName.trim()}%`);
    }
    if (minPrice && !isNaN(Number(minPrice))) {
      query = query.gte("asking_price_per_kg", Number(minPrice));
    }
    if (maxPrice && !isNaN(Number(maxPrice))) {
      query = query.lte("asking_price_per_kg", Number(maxPrice));
    }

    // Sorting
    switch (sort) {
      case "price_asc":
        query = query.order("asking_price_per_kg", { ascending: true });
        break;
      case "price_desc":
        query = query.order("asking_price_per_kg", { ascending: false });
        break;
      case "quantity_desc":
        query = query.order("quantity_kg", { ascending: false });
        break;
      case "date_asc":
        query = query.order("created_at", { ascending: true });
        break;
      case "date_desc":
      default:
        query = query.order("created_at", { ascending: false });
        break;
    }

    const { data: rawListings, error } = await query;

    if (error) {
      return Response.json({ success: false, error: error.message }, { status: 500 });
    }

    type ListingWithProfile = {
      id: string;
      farmer_id: string;
      crop_name: string;
      variety: string;
      category: string;
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
      profiles: {
        id: string;
        full_name: string;
        district: string;
        state: string;
        is_verified: boolean;
      } | null;
    };

    const listings: ListingWithProfile[] = (rawListings || []).map((l) => ({
      ...l,
      profiles: null,
    }));

    const farmerIds = Array.from(new Set(listings.map((l) => l.farmer_id).filter(Boolean)));
    if (farmerIds.length > 0) {
      try {
        const serviceDb = getServiceSupabase();
        const { data: publicProfiles } = await serviceDb
          .from("profiles")
          .select("id, full_name, district, state, is_verified")
          .in("id", farmerIds);

        if (publicProfiles && Array.isArray(publicProfiles)) {
          const profileMap = new Map<string, { id: string; full_name: string; district: string; state: string; is_verified: boolean }>();
          for (const p of publicProfiles) {
            profileMap.set(p.id, p);
          }
          for (const listing of listings) {
            if (profileMap.has(listing.farmer_id)) {
              listing.profiles = profileMap.get(listing.farmer_id) || null;
            }
          }
        }
      } catch {
        // Fallback without profile expansion
      }
    }

    return Response.json({
      success: true,
      databaseSource: "SUPABASE_LIVE",
      listings,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load marketplace listings.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifyServerSession(request);
    if (!session.isAuthenticated || !session.userId) {
      return Response.json({ error: "Authentication required to create a produce listing." }, { status: 401 });
    }

    if ((session.role !== "FARMER" || !session.isVerified) && !session.isAdmin) {
      return Response.json({ error: "Only verified farmers can publish produce listings." }, { status: 403 });
    }

    let body: MarketplaceBody;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const cropName = (body.cropName ?? body.crop_name)?.trim();
    const variety = body.variety?.trim() || null;
    const category = body.category === "surplus" ? "surplus" : "standard";
    const quantityKg = Number(body.quantityKg ?? body.quantity_kg);
    const qualityGrade = (body.qualityGrade ?? body.quality_grade)?.trim() || "A";
    const askingPricePerKg = Number(body.askingPricePerKg ?? body.asking_price_per_kg);
    const harvestDate = (body.harvestDate ?? body.harvest_date)?.trim() || new Date().toISOString().split("T")[0];
    const pickupLocation = (body.pickupLocation ?? body.pickup_location)?.trim();
    const district = body.district?.trim() || "Tumakuru";
    const state = body.state?.trim() || "Karnataka";
    const images = Array.isArray(body.images) ? body.images : [];

    if (!cropName) {
      return Response.json({ error: "Crop name is required." }, { status: 400 });
    }
    if (isNaN(quantityKg) || quantityKg <= 0) {
      return Response.json({ error: "Quantity must be a positive number." }, { status: 400 });
    }
    if (isNaN(askingPricePerKg) || askingPricePerKg <= 0) {
      return Response.json({ error: "Asking price per kg must be greater than zero." }, { status: 400 });
    }
    if (!pickupLocation) {
      return Response.json({ error: "Pickup location is required." }, { status: 400 });
    }

    const client = session.token ? getAuthenticatedClient(session.token) : anonClient;

    const { data: newListing, error: insertError } = await client
      .from("produce_listings")
      .insert({
        farmer_id: session.userId,
        crop_name: cropName,
        variety,
        category,
        quantity_kg: quantityKg,
        quality_grade: qualityGrade,
        asking_price_per_kg: askingPricePerKg,
        harvest_date: harvestDate,
        pickup_location: pickupLocation,
        district,
        state,
        images,
        status: "ACTIVE",
        is_verified_lot: true,
      })
      .select(`
        *,
        profiles:farmer_id (
          id,
          full_name,
          district,
          state,
          is_verified
        )
      `)
      .single();

    if (insertError) {
      return Response.json({ success: false, error: insertError.message }, { status: 500 });
    }

    return Response.json({
      success: true,
      message: "Produce listing published successfully.",
      listing: newListing,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error creating produce listing.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await verifyServerSession(request);
    if (!session.isAuthenticated || !session.userId) {
      return Response.json({ error: "Authentication required to update listing." }, { status: 401 });
    }

    let body: MarketplaceBody;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const { id } = body;
    if (!id) {
      return Response.json({ error: "Listing id is required." }, { status: 400 });
    }

    const client = session.token ? getAuthenticatedClient(session.token) : anonClient;

    // Verify ownership
    const { data: existing, error: checkError } = await client
      .from("produce_listings")
      .select("id, farmer_id, status")
      .eq("id", id)
      .single();

    if (checkError || !existing) {
      return Response.json({ error: "Listing not found or access denied." }, { status: 404 });
    }

    if (existing.farmer_id !== session.userId && !session.isAdmin) {
      return Response.json({ error: "Forbidden: You can only edit your own produce listings." }, { status: 403 });
    }

    const updates: Record<string, unknown> = {};
    if (body.cropName !== undefined || body.crop_name !== undefined) {
      updates.crop_name = (body.cropName ?? body.crop_name)?.trim();
    }
    if (body.variety !== undefined) updates.variety = body.variety?.trim() || null;
    if (body.category !== undefined) updates.category = body.category === "surplus" ? "surplus" : "standard";
    if (body.quantityKg !== undefined || body.quantity_kg !== undefined) {
      const q = Number(body.quantityKg ?? body.quantity_kg);
      if (isNaN(q) || q < 0) return Response.json({ error: "Quantity cannot be negative." }, { status: 400 });
      updates.quantity_kg = q;
    }
    if (body.qualityGrade !== undefined || body.quality_grade !== undefined) {
      updates.quality_grade = (body.qualityGrade ?? body.quality_grade)?.trim();
    }
    if (body.askingPricePerKg !== undefined || body.asking_price_per_kg !== undefined) {
      const p = Number(body.askingPricePerKg ?? body.asking_price_per_kg);
      if (isNaN(p) || p <= 0) return Response.json({ error: "Price must be greater than zero." }, { status: 400 });
      updates.asking_price_per_kg = p;
    }
    if (body.harvestDate !== undefined || body.harvest_date !== undefined) {
      updates.harvest_date = (body.harvestDate ?? body.harvest_date)?.trim();
    }
    if (body.pickupLocation !== undefined || body.pickup_location !== undefined) {
      updates.pickup_location = (body.pickupLocation ?? body.pickup_location)?.trim();
    }
    if (body.district !== undefined) updates.district = body.district.trim();
    if (body.state !== undefined) updates.state = body.state.trim();
    if (body.images !== undefined && Array.isArray(body.images)) {
      updates.images = body.images;
    }
    if (body.status !== undefined) {
      const allowed = ["ACTIVE", "PAUSED", "SOLD", "CANCELLED", "FULFILLED"];
      if (!allowed.includes(body.status.toUpperCase())) {
        return Response.json({ error: `Invalid status. Allowed: ${allowed.join(", ")}` }, { status: 400 });
      }
      updates.status = body.status.toUpperCase();
    }

    const { data: updatedListing, error: updateError } = await client
      .from("produce_listings")
      .update(updates)
      .eq("id", id)
      .select(`
        *,
        profiles:farmer_id (
          id,
          full_name,
          district,
          state,
          is_verified
        )
      `)
      .single();

    if (updateError) {
      return Response.json({ success: false, error: updateError.message }, { status: 500 });
    }

    return Response.json({
      success: true,
      message: "Produce listing updated successfully.",
      listing: updatedListing,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error updating produce listing.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await verifyServerSession(request);
    if (!session.isAuthenticated || !session.userId) {
      return Response.json({ error: "Authentication required." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return Response.json({ error: "Listing id is required." }, { status: 400 });
    }

    const client = session.token ? getAuthenticatedClient(session.token) : anonClient;

    const { data: existing, error: checkError } = await client
      .from("produce_listings")
      .select("id, farmer_id")
      .eq("id", id)
      .single();

    if (checkError || !existing) {
      return Response.json({ error: "Listing not found or access denied." }, { status: 404 });
    }

    if (existing.farmer_id !== session.userId && !session.isAdmin) {
      return Response.json({ error: "Forbidden: You do not own this listing." }, { status: 403 });
    }

    const { error: delError } = await client.from("produce_listings").delete().eq("id", id);
    if (delError) {
      return Response.json({ success: false, error: delError.message }, { status: 500 });
    }

    return Response.json({ success: true, message: "Listing deleted successfully." });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete listing.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
