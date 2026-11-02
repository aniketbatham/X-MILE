import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyServerSession, getAuthenticatedClient } from "@/lib/server-auth";

const SEED_TRANSPORT_REQUESTS = [
  {
    id: "tr-01",
    order_id: "ORD-8821",
    pickup_location: "Kunigal APMC Gate 2",
    destination_location: "Bengaluru KR Market Yard",
    produce_type: "Tomato (Grade A)",
    quantity_kg: 3500,
    required_vehicle_type: "Canter (5 Ton Capacity)",
    pickup_date: "2026-11-02",
    quoted_amount: 3200,
    transporter_name: "Kisan Express Multi-Axle Logistics",
    status: "CONFIRMED",
    isSampleData: true,
  },
];

interface TransportRequestBody {
  orderId?: string;
  pickupLocation?: string;
  destinationLocation?: string;
  produceType?: string;
  quantityKg?: number;
  requiredVehicleType?: string;
  pickupDate?: string;
}

export async function GET(request: NextRequest) {
  try {
    const session = await verifyServerSession(request);
    const client = session.token ? getAuthenticatedClient(session.token) : supabase;

    let query = client.from("open_transport_requests_discovery").select("*").order("created_at", { ascending: false });
    if (session.isAuthenticated && session.userId && session.role !== "ADMIN" && session.role !== "TRANSPORT_PROVIDER") {
      query = query.eq("requester_id", session.userId);
    }

    const { data: requests, error } = await query;

    if (error) {
      // Fallback query directly on transport_requests if view is restricted
      const { data: fallbackRequests, error: fallbackError } = await client
        .from("transport_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (fallbackError) {
        return Response.json({
          success: true,
          databaseSource: "BENCHMARK_FALLBACK",
          migrationPending: true,
          migrationNotice: fallbackError.message,
          requests: SEED_TRANSPORT_REQUESTS,
        });
      }

      return Response.json({
        success: true,
        databaseSource: "SUPABASE_LIVE",
        migrationPending: false,
        requests: fallbackRequests && fallbackRequests.length > 0 ? fallbackRequests : SEED_TRANSPORT_REQUESTS,
      });
    }

    return Response.json({
      success: true,
      databaseSource: "SUPABASE_LIVE",
      migrationPending: false,
      requests: requests && requests.length > 0 ? requests : SEED_TRANSPORT_REQUESTS,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load transport requests.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifyServerSession(request);
    if (!session.isAuthenticated || !session.userId) {
      return Response.json({ error: "Authentication required to create transport request." }, { status: 401 });
    }

    const client = session.token ? getAuthenticatedClient(session.token) : supabase;

    let body: TransportRequestBody;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const {
      orderId,
      pickupLocation,
      destinationLocation,
      produceType,
      quantityKg,
      requiredVehicleType,
      pickupDate,
    } = body;

    if (!pickupLocation || !destinationLocation || !produceType || !quantityKg || !requiredVehicleType || !pickupDate) {
      return Response.json(
        { error: "pickupLocation, destinationLocation, produceType, quantityKg, requiredVehicleType, and pickupDate are required." },
        { status: 400 }
      );
    }

    const transportPayload = {
      order_id: orderId || null,
      requester_id: session.userId,
      pickup_location: pickupLocation.trim(),
      destination_location: destinationLocation.trim(),
      produce_type: produceType.trim(),
      quantity_kg: Number(quantityKg),
      required_vehicle_type: requiredVehicleType.trim(),
      pickup_date: pickupDate,
      status: "LOOKING_FOR_TRANSPORTER",
      created_at: new Date().toISOString(),
    };

    const { data, error } = await client.from("transport_requests").insert(transportPayload).select().single();

    if (error) {
      return Response.json({ error: error.message, code: error.code }, { status: 400 });
    }

    return Response.json({
      success: true,
      message: "Transport request registered.",
      request: data,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Transport request creation failed.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await verifyServerSession(request);
    if (!session.isAuthenticated || !session.userId) {
      return Response.json({ error: "Authentication required." }, { status: 401 });
    }

    let body: {
      requestId?: string;
      quotedAmount?: number;
      transporterName?: string;
      transporterPhone?: string;
      transporterId?: string;
    };
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const { requestId, quotedAmount, transporterName, transporterPhone, transporterId } = body;

    if (!requestId || quotedAmount === undefined || Number(quotedAmount) <= 0) {
      return Response.json({ error: "requestId and positive quotedAmount are required." }, { status: 400 });
    }

    const client = session.token ? getAuthenticatedClient(session.token) : supabase;
    const { data: result, error } = await client.rpc("assign_transporter_to_job", {
      p_request_id: requestId,
      p_transporter_id: session.role === "ADMIN" ? (transporterId || session.userId) : session.userId,
      p_quoted_amount: Number(quotedAmount),
      p_transporter_name: transporterName || session.name || null,
      p_transporter_phone: transporterPhone || null,
    });

    if (error) {
      return Response.json({ error: error.message, code: error.code }, { status: 400 });
    }

    return Response.json({ success: true, result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Transporter assignment failed.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
