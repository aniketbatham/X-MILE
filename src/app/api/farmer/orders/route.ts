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
 *      If a farmerName filter is supplied that does not match their verified identity, returns 403 Forbidden.
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
    // If a non-admin supplies a farmerName, verify it matches caller's verified name.
    // Callers are NEVER allowed to probe or read another farmer's orders.
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
      // Administrator: Filter by specific name if requested, otherwise view all
      if (filterFarmerName) {
        farmerQuery = farmerQuery.eq("name", filterFarmerName.trim());
      }
    } else {
      // Farmer: Derive identity strictly from verified session
      // Match by profile_id linked to the authenticated user ID
      // or by verified name for legacy farmer rows
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

    if (inventoryIds.length === 0) {
      return Response.json({
        success: true,
        orders: [],
      });
    }

    // 6. Find order items connected to this farmer's inventory
    const { data: orderItems, error: orderItemsError } = await dbClient
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
          created_at
        )
      `)
      .in("inventory_id", inventoryIds)
      .order("id", { ascending: false });

    if (orderItemsError) {
      console.error("Failed to load farmer order items:", orderItemsError);
      return Response.json(
        { error: "Failed to load order items.", code: "DATABASE_ERROR" },
        { status: 500 }
      );
    }

    const inventoryMap = new Map((inventory ?? []).map((item) => [item.id, item]));
    const farmerMap = new Map(farmers.map((farmer) => [farmer.id, farmer]));

    interface OrderItemJoined {
      id: string;
      quantity_kg: number;
      inventory_id: string;
      orders: unknown;
    }

    const orders = ((orderItems as unknown as OrderItemJoined[]) ?? []).map((item) => {
      const inventoryItem = inventoryMap.get(item.inventory_id);
      const farmer = inventoryItem ? farmerMap.get(inventoryItem.farmer_id) : null;

      return {
        id: item.id,
        quantity_kg: item.quantity_kg,
        inventory_id: item.inventory_id,
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
