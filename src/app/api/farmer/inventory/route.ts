import { NextRequest } from "next/server";
import { verifyServerSession } from "@/lib/server-auth";
import { getServiceSupabase } from "@/lib/supabase-server";

interface InventoryPayload {
  id?: string;
  produce?: string;
  quantityKg?: number | string;
  quantity_kg?: number | string;
  qualityGrade?: string;
  quality_grade?: string;
  qualityScore?: number;
  qualityConfidence?: number;
  qualityObservations?: string[];
  imageUrl?: string;
  publishToMarketplace?: boolean;
  askingPricePerKg?: number | string;
  pickupLocation?: string;
}

/**
 * Resolves or creates the linked farmer record for the authenticated user.
 */
async function resolveFarmerEntity(
  dbClient: ReturnType<typeof getServiceSupabase>,
  userId: string,
  userName: string,
  district?: string
): Promise<{ id: string } | null> {
  const { data: existingFarmer } = await dbClient
    .from("farmers")
    .select("id")
    .eq("profile_id", userId)
    .maybeSingle();

  if (existingFarmer) {
    return existingFarmer;
  }

  // Create linked farmer record if not yet created
  const { data: newFarmer, error } = await dbClient
    .from("farmers")
    .insert({
      profile_id: userId,
      name: userName || "Verified Farmer",
      location: district || "Tumakuru, Karnataka",
    })
    .select("id")
    .single();

  if (error || !newFarmer) {
    console.error("Failed to auto-create farmer record:", error);
    return null;
  }

  return newFarmer;
}

export async function GET(request: NextRequest) {
  try {
    const session = await verifyServerSession(request);
    if (!session.isAuthenticated || !session.userId) {
      return Response.json({ error: "Authentication required to view inventory." }, { status: 401 });
    }

    if (session.role !== "FARMER" && !session.isAdmin) {
      return Response.json({ error: "Forbidden: Access restricted to authorized farmers." }, { status: 403 });
    }

    const dbClient = getServiceSupabase();

    // Resolve farmer record
    const farmer = await resolveFarmerEntity(dbClient, session.userId, session.name);
    if (!farmer) {
      return Response.json({ success: true, inventory: [] });
    }

    const { data: inventoryRows, error: invError } = await dbClient
      .from("inventory")
      .select(`
        id,
        farmer_id,
        produce,
        quantity_kg,
        quality_grade,
        reserved_quantity_kg,
        status,
        available,
        quality_score,
        quality_confidence,
        quality_observations,
        image_url,
        listing_id,
        created_at,
        updated_at
      `)
      .eq("farmer_id", farmer.id)
      .order("created_at", { ascending: false });

    if (invError) {
      console.error("Failed to load inventory:", invError);
      return Response.json({ success: false, error: invError.message }, { status: 500 });
    }

    // Attach active listing information if linked
    const listingIds = (inventoryRows || []).map((r) => r.listing_id).filter(Boolean);
    let listingMap = new Map();
    if (listingIds.length > 0) {
      const { data: listings } = await dbClient
        .from("produce_listings")
        .select("id, status, asking_price_per_kg, pickup_location")
        .in("id", listingIds);

      if (listings) {
        listingMap = new Map(listings.map((l) => [l.id, l]));
      }
    }

    const inventory = (inventoryRows || []).map((item) => {
      const listing = item.listing_id ? listingMap.get(item.listing_id) : null;
      return {
        ...item,
        listing: listing || null,
        available_quantity_kg: Math.max(0, Number(item.quantity_kg) - Number(item.reserved_quantity_kg || 0)),
      };
    });

    return Response.json({
      success: true,
      inventory,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load inventory.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifyServerSession(request);
    if (!session.isAuthenticated || !session.userId) {
      return Response.json({ error: "Authentication required to add inventory." }, { status: 401 });
    }

    if (session.role !== "FARMER" && !session.isAdmin) {
      return Response.json({ error: "Forbidden: Only farmers can add inventory." }, { status: 403 });
    }

    let body: InventoryPayload;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const produce = body.produce?.trim();
    const quantityKg = Number(body.quantityKg ?? body.quantity_kg);
    const qualityGrade = (body.qualityGrade ?? body.quality_grade)?.trim().toUpperCase() || "A";
    const qualityScore = typeof body.qualityScore === "number" ? body.qualityScore : null;
    const qualityConfidence = typeof body.qualityConfidence === "number" ? body.qualityConfidence : null;
    const qualityObservations = Array.isArray(body.qualityObservations) ? body.qualityObservations : [];
    const imageUrl = body.imageUrl || null;

    if (!produce) {
      return Response.json({ error: "Produce name is required." }, { status: 400 });
    }
    if (isNaN(quantityKg) || quantityKg <= 0) {
      return Response.json({ error: "Quantity must be a positive number." }, { status: 400 });
    }
    if (!["A", "B", "C"].includes(qualityGrade)) {
      return Response.json({ error: "Quality grade must be 'A', 'B', or 'C'." }, { status: 400 });
    }

    const dbClient = getServiceSupabase();

    // 1. Resolve farmer entity
    const farmer = await resolveFarmerEntity(dbClient, session.userId, session.name);
    if (!farmer) {
      return Response.json({ error: "Failed to resolve farmer account." }, { status: 500 });
    }

    // 2. Create inventory record
    const { data: newInventory, error: invError } = await dbClient
      .from("inventory")
      .insert({
        farmer_id: farmer.id,
        produce,
        quantity_kg: quantityKg,
        quality_grade: qualityGrade,
        reserved_quantity_kg: 0,
        status: "AVAILABLE",
        available: true,
        quality_score: qualityScore,
        quality_confidence: qualityConfidence,
        quality_observations: qualityObservations,
        image_url: imageUrl,
      })
      .select()
      .single();

    if (invError || !newInventory) {
      return Response.json({ success: false, error: invError?.message || "Failed to create inventory lot." }, { status: 500 });
    }

    let createdListing = null;

    // 3. Optionally publish directly to marketplace
    if (body.publishToMarketplace) {
      const askingPrice = Number(body.askingPricePerKg || 25);
      const pickupLocation = body.pickupLocation?.trim() || "Farm Gate Hub";

      const { data: newListing, error: listError } = await dbClient
        .from("produce_listings")
        .insert({
          farmer_id: session.userId,
          crop_name: produce,
          category: "standard",
          quantity_kg: quantityKg,
          quality_grade: qualityGrade,
          asking_price_per_kg: askingPrice > 0 ? askingPrice : 25,
          harvest_date: new Date().toISOString().split("T")[0],
          pickup_location: pickupLocation,
          district: "Tumakuru",
          state: "Karnataka",
          status: "ACTIVE",
          is_verified_lot: true,
        })
        .select()
        .single();

      if (!listError && newListing) {
        createdListing = newListing;
        // Link inventory to listing
        await dbClient
          .from("inventory")
          .update({ listing_id: newListing.id })
          .eq("id", newInventory.id);
      }
    }

    return Response.json({
      success: true,
      message: "Inventory lot recorded successfully.",
      inventory: { ...newInventory, listing_id: createdListing?.id || null },
      listing: createdListing,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to record inventory.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await verifyServerSession(request);
    if (!session.isAuthenticated || !session.userId) {
      return Response.json({ error: "Authentication required." }, { status: 401 });
    }

    const body = await request.json();
    const id = body.id;
    if (!id) {
      return Response.json({ error: "Inventory ID is required." }, { status: 400 });
    }

    const dbClient = getServiceSupabase();

    // Verify ownership
    const farmer = await resolveFarmerEntity(dbClient, session.userId, session.name);
    if (!farmer) {
      return Response.json({ error: "Farmer entity not found." }, { status: 404 });
    }

    const { data: existing, error: fetchErr } = await dbClient
      .from("inventory")
      .select("id, farmer_id, reserved_quantity_kg, status")
      .eq("id", id)
      .single();

    if (fetchErr || !existing) {
      return Response.json({ error: "Inventory record not found." }, { status: 404 });
    }

    if (existing.farmer_id !== farmer.id && !session.isAdmin) {
      return Response.json({ error: "Forbidden: You do not own this inventory lot." }, { status: 403 });
    }

    const updates: Record<string, unknown> = {};
    if (body.quantityKg !== undefined) {
      const q = Number(body.quantityKg);
      if (isNaN(q) || q < Number(existing.reserved_quantity_kg || 0)) {
        return Response.json({
          error: `Quantity cannot be less than already reserved quantity (${existing.reserved_quantity_kg} kg).`,
        }, { status: 400 });
      }
      updates.quantity_kg = q;
    }
    if (body.available !== undefined) {
      updates.available = Boolean(body.available);
    }

    const { data: updated, error: updateErr } = await dbClient
      .from("inventory")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (updateErr) {
      return Response.json({ success: false, error: updateErr.message }, { status: 500 });
    }

    return Response.json({
      success: true,
      message: "Inventory updated successfully.",
      inventory: updated,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update inventory.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
