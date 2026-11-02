import { NextRequest } from "next/server";
import { verifyServerSession } from "@/lib/server-auth";
import { getServiceSupabase } from "@/lib/supabase-server";

/**
 * GET /api/farmer/orders
 * Secure retrieval of incoming orders for an authorized farmer.
 *
 * Security Model:
 * 1. Cryptographic Authentication: Verified server session or Supabase JWT is strictly required.
 * 2. Role-Based Access Control: Restricted to FARMER and ADMIN roles.
 * 3. Identity Derivation: Caller's farmer identity is derived from verified session (profiles.id / auth.uid),
 *    NEVER trusted from client-supplied query parameters or headers.
 * 4. Authorization Enforcement:
 *    - FARMER callers may ONLY access orders for their own linked farmer records.
 *    - ADMIN callers retain legitimate access to inspect all farmer orders or filter by a specific farmerName.
 */
export async function GET(request: Request | NextRequest) {
  try {
    // 1. Cryptographic Authentication Gate
    const session = await verifyServerSession(request);

    if (!session.isAuthenticated || !session.userId) {
      return Response.json(
        {
          error: "Authentication required. Please sign in to view farmer orders.",
          code: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    // 2. Role-Based Access Control Gate
    if (session.role !== "ADMIN" && session.role !== "FARMER") {
      return Response.json(
        {
          error: "Forbidden: Access restricted to authorized farmers and platform administrators.",
          code: "FORBIDDEN",
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const filterFarmerName = searchParams.get("farmerName");

    // 3. Ownership & Authorization Check
    if (!session.isAdmin && filterFarmerName) {
      const normalizedFilter = filterFarmerName.trim().toLowerCase();
      const normalizedCaller = (session.name || "").trim().toLowerCase();

      if (normalizedFilter !== normalizedCaller) {
        return Response.json(
          {
            error: "Forbidden: You are not authorized to view orders belonging to another farmer.",
            code: "FORBIDDEN",
          },
          { status: 403 }
        );
      }
    }

    const dbClient = getServiceSupabase();

    // 4. Derive Farmer Records
    let farmerQuery = dbClient
      .from("farmers")
      .select("id, name, location, profile_id");

    if (session.isAdmin) {
      if (filterFarmerName) {
        farmerQuery = farmerQuery.eq("name", filterFarmerName.trim());
      }
    } else {
      farmerQuery = farmerQuery.or(
        `profile_id.eq.${session.userId},name.eq.${session.name}`
      );
    }

    const { data: farmers, error: farmerError } = await farmerQuery;

    if (farmerError) {
      console.error("Farmer lookup failed:", farmerError);
      return Response.json(
        { error: "Failed to resolve farmer profile.", code: "DATABASE_ERROR" },
        { status: 500 }
      );
    }

    if (!farmers || farmers.length === 0) {
      return Response.json({
        success: true,
        orders: [],
      });
    }

    const farmerIds = farmers.map((farmer) => farmer.id);

    // 5. Find inventory belonging to the verified farmer
    const { data: inventory, error: inventoryError } = await dbClient
      .from("inventory")
      .select(`
        id,
        farmer_id,
        produce,
        quantity_kg,
        quality_grade,
        status,
        reserved_quantity_kg
      `)
      .in("farmer_id", farmerIds);

    if (inventoryError) {
      console.error("Farmer inventory lookup failed:", inventoryError);
      return Response.json(
        { error: "Failed to resolve farmer inventory lots.", code: "DATABASE_ERROR" },
        { status: 500 }
      );
    }

    const inventoryIds = (inventory ?? []).map((item) => item.id);

    // Also find listings belonging to this farmer
    const { data: farmerListings } = await dbClient
      .from("produce_listings")
      .select("id, crop_name, asking_price_per_kg")
      .eq("farmer_id", session.userId);

    const farmerListingIds = (farmerListings || []).map((l) => l.id);

    if (inventoryIds.length === 0 && farmerListingIds.length === 0) {
      return Response.json({
        success: true,
        orders: [],
      });
    }

    // 6. Find order items connected to this farmer's inventory
    let orderItems: Array<{
      id: string;
      quantity_kg: number;
      inventory_id: string;
      orders: {
        id: string;
        buyer_name: string;
        produce: string;
        requested_quantity_kg: number;
        required_grade: string;
        destination: string;
        fulfilled_quantity_kg: number;
        fulfillment_percentage: number;
        status: string;
        created_at: string;
        offer_id?: string | null;
        listing_id?: string | null;
      } | null;
    }> = [];

    if (inventoryIds.length > 0) {
      const { data: items, error: itemsErr } = await dbClient
        .from("order_items")
        .select(`
          id,
          quantity_kg,
          inventory_id,
          orders (
            id,
            buyer_name,
            produce,
            requested_quantity_kg,
            required_grade,
            destination,
            fulfilled_quantity_kg,
            fulfillment_percentage,
            status,
            created_at,
            offer_id,
            listing_id
          )
        `)
        .in("inventory_id", inventoryIds)
        .order("id", { ascending: false });

      if (!itemsErr && items) {
        orderItems = (items as unknown as Array<{ id: string; quantity_kg: number; inventory_id: string; orders: unknown }>).map((it) => ({
          id: it.id,
          quantity_kg: it.quantity_kg,
          inventory_id: it.inventory_id,
          orders: (Array.isArray(it.orders) ? it.orders[0] : it.orders) as typeof orderItems[0]["orders"],
        }));
      }
    }

    // Also fetch orders linked via listing_id that might not be in order_items yet
    if (farmerListingIds.length > 0) {
      const { data: listingOrders } = await dbClient
        .from("orders")
        .select(`
          id,
          buyer_name,
          produce,
          requested_quantity_kg,
          required_grade,
          destination,
          fulfilled_quantity_kg,
          fulfillment_percentage,
          status,
          created_at,
          offer_id,
          listing_id
        `)
        .in("listing_id", farmerListingIds)
        .order("created_at", { ascending: false });

      if (listingOrders && listingOrders.length > 0) {
        const existingOrderIds = new Set(orderItems.map((oi) => oi.orders?.id).filter(Boolean));
        for (const lo of listingOrders) {
          if (!existingOrderIds.has(lo.id)) {
            orderItems.push({
              id: `lo-${lo.id}`,
              quantity_kg: lo.requested_quantity_kg,
              inventory_id: inventoryIds[0] || "",
              orders: lo,
            });
          }
        }
      }
    }

    // 7. Resolve unit prices from buyer_offers or listings
    const offerIds = orderItems.map((item) => item.orders?.offer_id).filter(Boolean) as string[];
    const listingIdMap = new Map((farmerListings || []).map((l) => [l.id, l]));

    let offerMap = new Map<string, { offered_price_per_kg: number; payment_terms: string }>();
    if (offerIds.length > 0) {
      const { data: offers } = await dbClient
        .from("buyer_offers")
        .select("id, offered_price_per_kg, payment_terms")
        .in("id", offerIds);

      if (offers) {
        offerMap = new Map(offers.map((o) => [o.id, o]));
      }
    }

    const inventoryMap = new Map((inventory ?? []).map((item) => [item.id, item]));
    const farmerMap = new Map(farmers.map((farmer) => [farmer.id, farmer]));

    const orders = orderItems.map((item) => {
      const inventoryItem = inventoryMap.get(item.inventory_id);
      const farmer = inventoryItem ? farmerMap.get(inventoryItem.farmer_id) : farmers[0];
      const offer = item.orders?.offer_id ? offerMap.get(item.orders.offer_id) : null;
      const listing = item.orders?.listing_id ? listingIdMap.get(item.orders.listing_id) : null;

      const unitPrice = offer?.offered_price_per_kg || listing?.asking_price_per_kg || 25;
      const paymentTerms = offer?.payment_terms || "ESCROW";

      return {
        id: item.id,
        quantity_kg: item.quantity_kg,
        inventory_id: item.inventory_id,
        unit_price_per_kg: unitPrice,
        payment_terms: paymentTerms,
        total_value: (Number(item.quantity_kg) || 0) * unitPrice,
        orders: item.orders,
        inventory: inventoryItem ?? null,
        farmer: farmer
          ? {
              id: farmer.id,
              name: farmer.name,
              location: farmer.location,
            }
          : null,
      };
    });

    return Response.json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error("Farmer orders API error:", error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Internal server error.",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
