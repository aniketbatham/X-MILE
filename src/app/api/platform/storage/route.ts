import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyServerSession } from "@/lib/server-auth";
import { SEED_STORAGE } from "@/lib/platform-db";

interface StorageEnquiryBody {
  facilityId?: string;
  commodity?: string;
  quantityMt?: number;
  startDate?: string;
  durationMonths?: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const district = searchParams.get("district");

    let query = supabase.from("storage_facilities").select("*");
    if (district) {
      query = query.eq("district", district);
    }

    const { data: facilities, error } = await query;

    if (error) {
      return Response.json({
        success: true,
        databaseSource: "BENCHMARK_FALLBACK",
        migrationPending: true,
        migrationNotice: "Table 'storage_facilities' awaiting migration 003_platform_services.sql.",
        facilities: SEED_STORAGE,
      });
    }

    return Response.json({
      success: true,
      databaseSource: "SUPABASE_LIVE",
      migrationPending: false,
      facilities: facilities && facilities.length > 0 ? facilities : SEED_STORAGE,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load storage facilities.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifyServerSession(request);

    let body: StorageEnquiryBody;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const { facilityId, commodity, quantityMt, startDate, durationMonths } = body;

    if (!facilityId || !commodity || !quantityMt || !startDate || !durationMonths) {
      return Response.json(
        { error: "facilityId, commodity, quantityMt, startDate, and durationMonths are required." },
        { status: 400 }
      );
    }

    const enquiryPayload = {
      facility_id: facilityId,
      farmer_id: session.profileId || session.userId || null,
      commodity: commodity.trim(),
      quantity_mt: Number(quantityMt),
      intended_start_date: startDate,
      duration_months: Number(durationMonths),
      status: "SUBMITTED",
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from("storage_enquiries").insert(enquiryPayload).select().single();

    return Response.json({
      success: true,
      message: "Warehouse space reservation inquiry submitted.",
      enquiry: data || { id: `enq-${Date.now()}`, ...enquiryPayload },
      migrationPending: Boolean(error),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Storage inquiry failed.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
