import { NextRequest } from "next/server";
import { getServiceSupabase } from "@/lib/supabase-server";
import { verifyServerSession } from "@/lib/server-auth";

/**
 * Validates whether an authenticated user is party to the order associated with a shipment.
 */
async function isPartyToShipmentOrder(
  dbClient: ReturnType<typeof getServiceSupabase>,
  orderId: string,
  userId: string,
  role: string
): Promise<{ isBuyer: boolean; isSeller: boolean; isAssignedTransporter: boolean }> {
  // 1. Check if user is buyer or creator
  const { data: order } = await dbClient
    .from("orders")
    .select("id, buyer_id, created_by, assigned_transporter_id, listing_id")
    .eq("id", orderId)
    .maybeSingle();

  const isBuyer = Boolean(order && (order.buyer_id === userId || order.created_by === userId));
  const isAssignedTransporter = Boolean(order && order.assigned_transporter_id === userId);

  // 2. Check if user is seller farmer for this order
  let isSeller = false;
  if (role === "FARMER") {
    // Check direct listing linkage
    if (order?.listing_id) {
      const { data: listing } = await dbClient
        .from("produce_listings")
        .select("farmer_id")
        .eq("id", order.listing_id)
        .maybeSingle();

      if (listing?.farmer_id === userId) {
        isSeller = true;
      }
    }

    if (!isSeller) {
      // Check farmer entity and order items
      const { data: farmerRecs } = await dbClient
        .from("farmers")
        .select("id")
        .eq("profile_id", userId);

      const farmerIds = (farmerRecs || []).map((f) => f.id);
      if (farmerIds.length > 0) {
        const { data: invRecs } = await dbClient
          .from("inventory")
          .select("id")
          .in("farmer_id", farmerIds);

        const invIds = (invRecs || []).map((i) => i.id);
        if (invIds.length > 0) {
          const { data: matchItem } = await dbClient
            .from("order_items")
            .select("id")
            .eq("order_id", orderId)
            .in("inventory_id", invIds)
            .limit(1);

          if (matchItem && matchItem.length > 0) {
            isSeller = true;
          }
        }
      }
    }
  }

  return { isBuyer, isSeller, isAssignedTransporter };
}

/*
  CREATE SHIPMENT
  Idempotent shipment initialization for an order.
*/
export async function POST(request: NextRequest) {
  try {
    const session = await verifyServerSession(request);
    if (!session.isAuthenticated || !session.userId) {
      return Response.json(
        { error: "Authentication required to create shipments." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      orderId,
      origin,
      destination,
      totalQuantityKg,
      estimatedDistanceKm,
      estimatedTimeMinutes,
    } = body;

    if (!orderId || !destination) {
      return Response.json(
        { error: "Order ID and destination are required." },
        { status: 400 }
      );
    }

    const dbClient = getServiceSupabase();

    // Verify order exists
    const { data: order, error: orderError } = await dbClient
      .from("orders")
      .select("id, status, buyer_id, created_by, fulfilled_quantity_kg, assigned_transporter_id")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return Response.json(
        { error: "Order not found." },
        { status: 404 }
      );
    }

    // Authorization: Caller must be order buyer, admin, seller farmer, or assigned transporter
    const party = await isPartyToShipmentOrder(dbClient, orderId, session.userId, session.role || "");
    const isAuthorized =
      session.role === "ADMIN" ||
      party.isBuyer ||
      party.isSeller ||
      party.isAssignedTransporter ||
      order.assigned_transporter_id === session.userId;

    if (!isAuthorized) {
      return Response.json(
        { error: "Forbidden: Not authorized to create a shipment for this order." },
        { status: 403 }
      );
    }

    // Idempotency: Prevent duplicate shipments for the same order
    const { data: existingShipment } = await dbClient
      .from("shipments")
      .select("*")
      .eq("order_id", orderId)
      .maybeSingle();

    if (existingShipment) {
      return Response.json({
        success: true,
        shipment: existingShipment,
        message: "Shipment already exists for this order.",
      });
    }

    // Create shipment starting at Preparing and 0%
    const { data: shipment, error } = await dbClient
      .from("shipments")
      .insert({
        order_id: orderId,
        status: "Preparing",
        origin: origin ?? null,
        destination,
        total_quantity_kg: totalQuantityKg ?? order.fulfilled_quantity_kg ?? 0,
        current_location: origin ?? null,
        estimated_distance_km: estimatedDistanceKm ?? null,
        estimated_time_minutes: estimatedTimeMinutes ?? null,
        progress_percentage: 0,
        assigned_transporter_id: order.assigned_transporter_id ?? null,
      })
      .select()
      .single();

    if (error || !shipment) {
      console.error("Failed to create shipment:", error);
      return Response.json(
        { error: error?.message ?? "Failed to create shipment." },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      shipment,
    });
  } catch (error) {
    console.error("Shipment creation error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/*
  GET SHIPMENTS
  Enforces role-based read access across buyers, farmers, assigned transporters, and admins.
*/
export async function GET(request: NextRequest) {
  try {
    const session = await verifyServerSession(request);
    if (!session.isAuthenticated || !session.userId) {
      return Response.json(
        { error: "Authentication required to view shipments." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");
    const shipmentId = searchParams.get("id");

    const dbClient = getServiceSupabase();

    let query = dbClient
      .from("shipments")
      .select("*")
      .order("created_at", { ascending: false });

    if (orderId) {
      query = query.eq("order_id", orderId);
    }
    if (shipmentId) {
      query = query.eq("id", shipmentId);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Failed to load shipments:", error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    const allShipments = data ?? [];

    // Admins view all
    if (session.role === "ADMIN") {
      return Response.json({ success: true, shipments: allShipments });
    }

    // Filter shipments by role relationship
    const filteredShipments = [];
    for (const sh of allShipments) {
      // If caller is the assigned transporter on the shipment
      if (sh.assigned_transporter_id === session.userId) {
        filteredShipments.push(sh);
        continue;
      }

      // Check relation to the underlying order
      if (sh.order_id) {
        const party = await isPartyToShipmentOrder(dbClient, sh.order_id, session.userId, session.role || "");
        if (party.isBuyer || party.isSeller || party.isAssignedTransporter) {
          filteredShipments.push(sh);
        }
      }
    }

    return Response.json({
      success: true,
      shipments: filteredShipments,
    });
  } catch (error) {
    console.error("Get shipments error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/*
  UPDATE SHIPMENT TELEMETRY
  Restricted exclusively to the assigned, verified transporter or administrator.
  Rejects direct status mutations that bypass transactional order RPCs.
*/
export async function PATCH(request: NextRequest) {
  try {
    const session = await verifyServerSession(request);
    if (!session.isAuthenticated || !session.userId) {
      return Response.json(
        { error: "Authentication required to update shipments." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      id,
      status,
      currentLocation,
      progressPercentage,
    } = body;

    if (!id) {
      return Response.json(
        { error: "Shipment ID is required." },
        { status: 400 }
      );
    }

    const dbClient = getServiceSupabase();

    // 1. Fetch existing shipment
    const { data: existingShipment, error: fetchError } = await dbClient
      .from("shipments")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchError || !existingShipment) {
      return Response.json(
        { error: fetchError?.message ?? "Shipment not found." },
        { status: 404 }
      );
    }

    // 2. Strict Transporter / Admin Authorization
    // Only an ADMIN or the explicitly assigned transporter can update telemetry
    const isAssignedTransporter = existingShipment.assigned_transporter_id === session.userId;
    if (session.role !== "ADMIN" && !isAssignedTransporter) {
      return Response.json(
        { error: "Forbidden: Only the assigned transport provider or an administrator can update this shipment." },
        { status: 403 }
      );
    }

    // 3. Reject direct status mutations that bypass transactional order RPCs
    // Dispatched must be triggered via dispatch_order RPC (on /api/orders)
    // Delivered must be triggered via finalize_order_fulfillment RPC (on /api/orders)
    if (status === "Dispatched" || status === "Delivered") {
      return Response.json(
        {
          error: `Direct mutation to '${status}' is prohibited. Order dispatch and delivery completion must be executed via the authoritative order lifecycle endpoints to ensure transactional stock and status consistency.`,
          code: "DIRECT_STATUS_MUTATION_PROHIBITED",
        },
        { status: 400 }
      );
    }

    // Terminal check: Cannot update telemetry if already Delivered or Failed
    if (existingShipment.status === "Delivered" || existingShipment.status === "Failed") {
      return Response.json(
        {
          error: `Cannot update telemetry for shipment in terminal status '${existingShipment.status}'.`,
          code: "TERMINAL_SHIPMENT_IMMUTABLE",
        },
        { status: 400 }
      );
    }

    // 4. Validate and calculate progress percentage
    let nextProgress = existingShipment.progress_percentage ?? 0;
    if (progressPercentage !== undefined) {
      const numericProgress = Number(progressPercentage);
      if (!Number.isFinite(numericProgress) || numericProgress < 0 || numericProgress > 100) {
        return Response.json(
          { error: "Progress percentage must be between 0 and 100." },
          { status: 400 }
        );
      }
      nextProgress = Math.round(numericProgress);
    }

    // Allowed intermediate telemetry statuses: In Transit, Delayed
    const allowedTelemetryStatuses = ["Preparing", "In Transit", "Delayed"];
    const targetStatus = status && allowedTelemetryStatuses.includes(status) 
      ? status 
      : existingShipment.status;

    const updateData: {
      status: string;
      progress_percentage: number;
      current_location?: string;
      updated_at: string;
    } = {
      status: targetStatus,
      progress_percentage: nextProgress,
      updated_at: new Date().toISOString(),
    };

    if (currentLocation !== undefined) {
      updateData.current_location = currentLocation;
    }

    const { data: updatedShipment, error: updateError } = await dbClient
      .from("shipments")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError || !updatedShipment) {
      console.error("Failed to update shipment telemetry:", updateError);
      return Response.json(
        { error: updateError?.message ?? "Failed to update shipment." },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      shipment: updatedShipment,
    });
  } catch (error) {
    console.error("Update shipment error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
