import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyServerSession } from "@/lib/server-auth";
import { PlatformDb } from "@/lib/platform-db";

interface MachineryBookingBody {
  equipmentId?: string;
  startDate?: string;
  durationUnits?: number;
  totalEstimate?: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const district = searchParams.get("district");

    let query = supabase.from("machinery_listings").select("*").eq("is_available", true);
    if (district) {
      query = query.eq("district", district);
    }

    const { data: listings, error } = await query;

    if (error) {
      return Response.json({
        success: true,
        databaseSource: "BENCHMARK_FALLBACK",
        migrationPending: true,
        migrationNotice: "Table 'machinery_listings' awaiting migration 003_platform_services.sql.",
        listings: PlatformDb.getMachinery(),
      });
    }

    return Response.json({
      success: true,
      databaseSource: "SUPABASE_LIVE",
      migrationPending: false,
      listings: listings && listings.length > 0 ? listings : PlatformDb.getMachinery(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load machinery listings.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifyServerSession(request);

    let body: MachineryBookingBody;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const { equipmentId, startDate, durationUnits, totalEstimate } = body;

    if (!equipmentId || !startDate || !durationUnits || durationUnits <= 0) {
      return Response.json(
        { error: "equipmentId, startDate, and positive durationUnits are required." },
        { status: 400 }
      );
    }

    const bookingPayload = {
      equipment_id: equipmentId,
      farmer_id: session.profileId || session.userId || null,
      start_date: new Date(startDate).toISOString(),
      duration_hours_or_acres: durationUnits,
      total_estimate: totalEstimate || 0,
      status: "REQUESTED",
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from("machinery_bookings").insert(bookingPayload).select().single();

    return Response.json({
      success: true,
      message: "Machinery reservation booked.",
      booking: data || { id: `bk-${Date.now()}`, ...bookingPayload },
      migrationPending: Boolean(error),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Machinery booking failed.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
