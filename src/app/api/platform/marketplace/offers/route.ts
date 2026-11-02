import { NextRequest } from "next/server";
import { supabase as anonClient } from "@/lib/supabase";
import { verifyServerSession, getAuthenticatedClient } from "@/lib/server-auth";
import { getServiceSupabase } from "@/lib/supabase-server";
import crypto from "crypto";

interface OfferBody {
  id?: string;
  offerId?: string;
  listingId?: string;
  listing_id?: string;
  offeredPricePerKg?: number | string;
  offered_price_per_kg?: number | string;
  offeredQuantityKg?: number | string;
  offered_quantity_kg?: number | string;
  destinationCity?: string;
  destination_city?: string;
  paymentTerms?: string;
  payment_terms?: string;
  action?: "ACCEPT" | "REJECT" | "COUNTER" | "CANCEL";
  counterPricePerKg?: number | string;
  items?: Array<{
    inventory_id?: string;
    inventoryId?: string;
    id?: string;
    quantity?: number | string;
    quantity_kg?: number | string;
    allocatedQuantity?: number | string;
  }>;
  idempotencyKey?: string;
}

export async function GET(request: NextRequest) {
  try {
    const session = await verifyServerSession(request);
    if (!session.isAuthenticated || !session.userId) {
      return Response.json({ error: "Authentication required to view offers." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const listingId = searchParams.get("listingId");
    const roleParam = searchParams.get("viewAs"); // 'buyer' | 'farmer'

    const client = session.token ? getAuthenticatedClient(session.token) : anonClient;

    let query = client
      .from("buyer_offers")
      .select(`
        id,
        listing_id,
        buyer_id,
        offered_price_per_kg,
        offered_quantity_kg,
        destination_city,
        payment_terms,
        status,
        created_at,
        produce_listings:listing_id (
          id,
          farmer_id,
          crop_name,
          variety,
          category,
          quantity_kg,
          quality_grade,
          asking_price_per_kg,
          pickup_location,
          district,
          state,
          images,
          status
        ),
        buyer_profiles:buyer_id (
          id,
          full_name,
          district,
          state,
          is_verified
        )
      `);

    if (listingId) {
      query = query.eq("listing_id", listingId);
    }

    // Role-aware filtering
    if (session.isAdmin) {
      // Admins see all matching
    } else if (session.role === "BUYER" || roleParam === "buyer") {
      query = query.eq("buyer_id", session.userId);
    } else if (session.role === "FARMER" || roleParam === "farmer") {
      // Farmer sees offers on their produce listings
      // RLS policy "Buyers and sellers view relevant offers" handles this automatically,
      // but we filter explicitly on listing.farmer_id for security and precision.
      const { data: farmerListings } = await client
        .from("produce_listings")
        .select("id")
        .eq("farmer_id", session.userId);

      const listingIds = (farmerListings || []).map((l) => l.id);
      if (listingIds.length === 0) {
        return Response.json({ success: true, offers: [] });
      }
      query = query.in("listing_id", listingIds);
    } else {
      // General user: show offers where they are buyer
      query = query.eq("buyer_id", session.userId);
    }

    query = query.order("created_at", { ascending: false });

    const { data: offers, error } = await query;

    if (error) {
      return Response.json({ success: false, error: error.message }, { status: 500 });
    }

    return Response.json({
      success: true,
      offers: offers || [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load offers.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifyServerSession(request);
    if (!session.isAuthenticated || !session.userId) {
      return Response.json({ error: "Authentication required to make an offer." }, { status: 401 });
    }

    if ((session.role !== "BUYER" || !session.isVerified) && !session.isAdmin) {
      return Response.json({ error: "Only verified buyers can submit procurement offers." }, { status: 403 });
    }

    let body: OfferBody;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const listingId = (body.listingId ?? body.listing_id)?.trim();
    const offeredPrice = Number(body.offeredPricePerKg ?? body.offered_price_per_kg);
    const offeredQty = Number(body.offeredQuantityKg ?? body.offered_quantity_kg);
    const destinationCity = (body.destinationCity ?? body.destination_city)?.trim();
    const paymentTerms = (body.paymentTerms ?? body.payment_terms)?.trim() || "Escrow on Delivery";

    if (!listingId) {
      return Response.json({ error: "listingId is required." }, { status: 400 });
    }
    if (isNaN(offeredPrice) || offeredPrice <= 0) {
      return Response.json({ error: "Offered price per kg must be greater than zero." }, { status: 400 });
    }
    if (isNaN(offeredQty) || offeredQty <= 0) {
      return Response.json({ error: "Offered quantity must be greater than zero." }, { status: 400 });
    }
    if (!destinationCity) {
      return Response.json({ error: "Destination city is required." }, { status: 400 });
    }

    const client = session.token ? getAuthenticatedClient(session.token) : anonClient;

    // Verify listing is active and exists
    const { data: listing, error: listErr } = await client
      .from("produce_listings")
      .select("id, farmer_id, quantity_kg, status, crop_name, asking_price_per_kg")
      .eq("id", listingId)
      .single();

    if (listErr || !listing) {
      return Response.json({ error: "Produce listing not found." }, { status: 404 });
    }

    if (listing.status !== "ACTIVE") {
      return Response.json({ error: `Cannot make offer on listing with status '${listing.status}'.` }, { status: 400 });
    }

    if (listing.farmer_id === session.userId) {
      return Response.json({ error: "You cannot submit an offer on your own produce listing." }, { status: 400 });
    }

    if (offeredQty > Number(listing.quantity_kg)) {
      return Response.json({
        error: `Offered quantity (${offeredQty} kg) exceeds available quantity (${listing.quantity_kg} kg).`,
      }, { status: 400 });
    }

    const { data: newOffer, error: insertErr } = await client
      .from("buyer_offers")
      .insert({
        listing_id: listingId,
        buyer_id: session.userId,
        offered_price_per_kg: offeredPrice,
        offered_quantity_kg: offeredQty,
        destination_city: destinationCity,
        payment_terms: paymentTerms,
        status: "PENDING",
      })
      .select(`
        *,
        produce_listings:listing_id (
          id,
          crop_name,
          variety,
          asking_price_per_kg,
          pickup_location,
          district,
          state
        ),
        buyer_profiles:buyer_id (
          id,
          full_name,
          district,
          state,
          is_verified
        )
      `)
      .single();

    if (insertErr) {
      return Response.json({ success: false, error: insertErr.message }, { status: 500 });
    }

    return Response.json({
      success: true,
      message: "Procurement offer submitted successfully.",
      offer: newOffer,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to submit offer.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await verifyServerSession(request);
    if (!session.isAuthenticated || !session.userId) {
      return Response.json({ error: "Authentication required to update offer." }, { status: 401 });
    }

    let body: OfferBody;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const offerId = (body.offerId ?? body.id)?.trim();
    const action = body.action;

    if (!offerId || !action) {
      return Response.json({ error: "offerId and action (ACCEPT, REJECT, COUNTER, CANCEL) are required." }, { status: 400 });
    }

    const client = session.token ? getAuthenticatedClient(session.token) : anonClient;

    // Fetch existing offer with its listing
    const { data: offer, error: fetchErr } = await client
      .from("buyer_offers")
      .select(`
        id,
        listing_id,
        buyer_id,
        status,
        offered_price_per_kg,
        offered_quantity_kg,
        produce_listings:listing_id (
          id,
          farmer_id,
          crop_name,
          quantity_kg,
          status
        )
      `)
      .eq("id", offerId)
      .single();

    if (fetchErr || !offer) {
      return Response.json({ error: "Offer not found or access denied." }, { status: 404 });
    }

    interface OfferWithListing {
      id: string;
      listing_id: string;
      buyer_id: string;
      status: string;
      offered_price_per_kg: number;
      offered_quantity_kg: number;
      produce_listings: {
        id: string;
        farmer_id: string;
        crop_name: string;
        quantity_kg: number;
        status: string;
      } | null;
    }
    const typedOffer = offer as unknown as OfferWithListing;
    const listing = typedOffer.produce_listings;

    if (!listing) {
      return Response.json({ error: "Associated produce listing no longer exists." }, { status: 404 });
    }

    if (action === "ACCEPT") {
      // Must be the farmer who owns the listing or admin
      if (listing.farmer_id !== session.userId && !session.isAdmin) {
        return Response.json({
          error: "Forbidden: Only the farmer who owns this produce listing can accept offers.",
        }, { status: 403 });
      }

      if (typedOffer.status !== "PENDING" && typedOffer.status !== "COUNTERED") {
        return Response.json({
          error: `Cannot accept an offer that is already ${typedOffer.status}.`,
        }, { status: 400 });
      }

      const idempotencyKey =
        request.headers.get("x-idempotency-key")?.trim() ||
        (typeof body.idempotencyKey === "string" ? body.idempotencyKey.trim() : null) ||
        `offer-accept-${offerId}`;

      const dbClient = getServiceSupabase();
      let items = body.items;

      if (!items || !Array.isArray(items) || items.length === 0) {
        // Auto-resolve available inventory lots linked to the listing
        const { data: invLots, error: invErr } = await dbClient
          .from("inventory")
          .select("id, quantity_kg, reserved_quantity_kg")
          .eq("listing_id", listing.id)
          .eq("status", "AVAILABLE")
          .eq("available", true)
          .order("id", { ascending: true });

        if (invErr || !invLots || invLots.length === 0) {
          return Response.json({
            error: "No available inventory lots linked to this produce listing. Please specify allocation items.",
            code: "NO_INVENTORY_AVAILABLE"
          }, { status: 400 });
        }

        let remainingToAllocate = Number(typedOffer.offered_quantity_kg);
        const resolvedItems: Array<{ inventory_id: string; quantity: number }> = [];

        for (const lot of invLots) {
          if (remainingToAllocate <= 0) break;
          const availableInLot = Number(lot.quantity_kg) - Number(lot.reserved_quantity_kg || 0);
          if (availableInLot <= 0) continue;
          const alloc = Math.min(remainingToAllocate, availableInLot);
          resolvedItems.push({ inventory_id: lot.id, quantity: alloc });
          remainingToAllocate -= alloc;
        }

        if (remainingToAllocate > 0) {
          return Response.json({
            error: `Insufficient unreserved inventory capacity across linked lots (needed: ${typedOffer.offered_quantity_kg} kg, unreserved capacity short by ${remainingToAllocate} kg).`,
            code: "INSUFFICIENT_STOCK"
          }, { status: 409 });
        }

        items = resolvedItems;
      }

      const canonicalItems = items.map((it) => {
        const invId = (it.inventory_id || it.inventoryId || it.id || "").trim();
        const qty = Number(it.quantity_kg ?? it.quantity ?? it.allocatedQuantity);
        return { inventory_id: invId, quantity: qty };
      }).sort((a, b) => a.inventory_id.localeCompare(b.inventory_id));

      const canonicalPayload = JSON.stringify({
        offer_id: offerId,
        actor_id: session.userId,
        items: canonicalItems,
      });
      const requestHash = crypto.createHash("sha256").update(canonicalPayload).digest("hex");

      const { data: rpcResult, error: rpcError } = await dbClient.rpc(
        "accept_buyer_offer_and_create_order",
        {
          p_actor_id: session.userId,
          p_offer_id: offerId,
          p_items: canonicalItems,
          p_idempotency_key: idempotencyKey,
          p_request_hash: requestHash,
        }
      );

      if (rpcError) {
        console.error("Atomic offer acceptance RPC error:", rpcError);
        const msg = rpcError.message || "";
        if (msg.includes("OFFER_ALREADY_ACCEPTED") || msg.includes("CANNOT_ACCEPT_NON_PENDING_OFFER")) {
          return Response.json({ error: msg, code: "OFFER_ALREADY_PROCESSED" }, { status: 400 });
        }
        if (msg.includes("INSUFFICIENT_INVENTORY") || msg.includes("INVENTORY_NOT_AVAILABLE") || msg.includes("INSUFFICIENT_LISTING_HEADROOM")) {
          return Response.json({ error: msg, code: "INSUFFICIENT_STOCK" }, { status: 409 });
        }
        if (msg.includes("UNAUTHORIZED") || msg.includes("FORBIDDEN")) {
          return Response.json({ error: msg, code: "FORBIDDEN" }, { status: 403 });
        }
        return Response.json({ error: msg, code: "ACCEPT_OFFER_FAILED" }, { status: 500 });
      }

      return Response.json({
        success: true,
        message: "Offer accepted successfully and order created.",
        result: rpcResult,
      });
    }

    let newStatus = "";

    if (action === "REJECT" || action === "COUNTER") {
      // Must be the farmer of the listing or admin
      if (listing.farmer_id !== session.userId && !session.isAdmin) {
        return Response.json({
          error: "Forbidden: Only the farmer who owns this produce listing can reject or counter offers.",
        }, { status: 403 });
      }

      if (typedOffer.status !== "PENDING" && typedOffer.status !== "COUNTERED") {
        return Response.json({
          error: `Cannot ${action.toLowerCase()} an offer that is already ${typedOffer.status}.`,
        }, { status: 400 });
      }

      newStatus = action === "REJECT" ? "REJECTED" : "COUNTERED";
    } else if (action === "CANCEL") {
      // Must be the buyer or admin
      if (typedOffer.buyer_id !== session.userId && !session.isAdmin) {
        return Response.json({
          error: "Forbidden: You can only cancel your own offers.",
        }, { status: 403 });
      }

      if (typedOffer.status !== "PENDING") {
        return Response.json({
          error: `Cannot cancel an offer that is already ${typedOffer.status}.`,
        }, { status: 400 });
      }

      newStatus = "CANCELLED";
    } else {
      return Response.json({ error: "Invalid action. Use ACCEPT, REJECT, COUNTER, or CANCEL." }, { status: 400 });
    }

    const updates: Record<string, unknown> = { status: newStatus };
    if (action === "COUNTER" && body.counterPricePerKg) {
      const cp = Number(body.counterPricePerKg);
      if (cp > 0) updates.offered_price_per_kg = cp;
    }

    const { data: updatedOffer, error: updateErr } = await client
      .from("buyer_offers")
      .update(updates)
      .eq("id", offerId)
      .select(`
        *,
        produce_listings:listing_id (
          id,
          crop_name,
          variety,
          asking_price_per_kg
        ),
        buyer_profiles:buyer_id (
          id,
          full_name,
          district,
          state,
          is_verified
        )
      `)
      .single();

    if (updateErr) {
      return Response.json({ success: false, error: updateErr.message }, { status: 500 });
    }

    return Response.json({
      success: true,
      message: `Offer ${newStatus.toLowerCase()} successfully.`,
      offer: updatedOffer,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update offer.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
