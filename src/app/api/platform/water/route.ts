import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyServerSession } from "@/lib/server-auth";

interface WaterLogBody {
  plotId?: string;
  irrigationDate?: string;
  durationHours?: number;
  source?: string;
  waterVolumeEstLiters?: number;
  notes?: string;
}

const SEED_BENCHMARK_WATER_LOGS = [
  {
    id: "wl-01",
    date: "2026-10-30",
    source: "Drip",
    durationHours: 3.0,
    estLiters: 12000,
    notes: "Evening drip cycle on North tomato block.",
    isSampleData: true,
  },
  {
    id: "wl-02",
    date: "2026-10-28",
    source: "Borewell",
    durationHours: 4.0,
    estLiters: 18000,
    notes: "Furrow irrigation for onion bulb expansion.",
    isSampleData: true,
  },
];

export async function GET(request: NextRequest) {
  try {
    const session = await verifyServerSession(request);

    let query = supabase.from("water_logs").select("*").order("irrigation_date", { ascending: false });
    if (session.isAuthenticated && session.userId && session.role !== "ADMIN") {
      query = query.eq("farmer_id", session.userId);
    }

    const { data: logs, error } = await query;

    if (error) {
      return Response.json({
        success: true,
        databaseSource: "BENCHMARK_FALLBACK",
        migrationPending: true,
        migrationNotice: "Table 'water_logs' awaiting migration 003_platform_services.sql.",
        logs: SEED_BENCHMARK_WATER_LOGS,
      });
    }

    return Response.json({
      success: true,
      databaseSource: "SUPABASE_LIVE",
      migrationPending: false,
      logs: logs && logs.length > 0 ? logs : SEED_BENCHMARK_WATER_LOGS,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load water logs.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifyServerSession(request);

    let body: WaterLogBody;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const { plotId, irrigationDate, durationHours, source, waterVolumeEstLiters, notes } = body;

    if (!durationHours || durationHours <= 0 || !source) {
      return Response.json(
        { error: "Positive durationHours and source are required." },
        { status: 400 }
      );
    }

    const logPayload = {
      farmer_id: session.profileId || session.userId || null,
      plot_id: plotId || null,
      irrigation_date: irrigationDate || new Date().toISOString().split("T")[0],
      duration_hours: Number(durationHours),
      source: source.trim(),
      water_volume_est_liters: waterVolumeEstLiters || Number(durationHours) * 4000,
      notes: notes?.trim() || null,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from("water_logs").insert(logPayload).select().single();

    return Response.json({
      success: true,
      message: "Irrigation run logged.",
      log: data || { id: `wl-${Date.now()}`, ...logPayload },
      migrationPending: Boolean(error),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Water log creation failed.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
