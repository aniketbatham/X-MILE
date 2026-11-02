import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyServerSession } from "@/lib/server-auth";
import { PlatformDb } from "@/lib/platform-db";

interface CalendarEventBody {
  plotId?: string;
  cropPlanId?: string;
  eventType?: string;
  title?: string;
  cropName?: string;
  scheduledDate?: string;
  notes?: string;
}

export async function GET(request: NextRequest) {
  try {
    const session = await verifyServerSession(request);

    let query = supabase.from("crop_calendar_events").select("*").order("scheduled_date", { ascending: true });
    if (session.isAuthenticated && session.userId && session.role !== "ADMIN") {
      query = query.eq("user_id", session.userId);
    }

    const { data: events, error } = await query;

    if (error) {
      return Response.json({
        success: true,
        databaseSource: "BENCHMARK_FALLBACK",
        migrationPending: true,
        migrationNotice: "Table 'crop_calendar_events' awaiting migration 003_platform_services.sql.",
        events: PlatformDb.getCalendarEvents(),
      });
    }

    return Response.json({
      success: true,
      databaseSource: "SUPABASE_LIVE",
      migrationPending: false,
      events: events && events.length > 0 ? events : PlatformDb.getCalendarEvents(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load calendar events.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifyServerSession(request);

    let body: CalendarEventBody;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const { plotId, cropPlanId, eventType, title, cropName, scheduledDate, notes } = body;

    if (!eventType || !title || !cropName || !scheduledDate) {
      return Response.json(
        { error: "eventType, title, cropName, and scheduledDate are required." },
        { status: 400 }
      );
    }

    const eventPayload = {
      user_id: session.profileId || session.userId || "00000000-0000-0000-0000-000000000000",
      plot_id: plotId || null,
      crop_plan_id: cropPlanId || null,
      event_type: eventType.trim(),
      title: title.trim(),
      crop_name: cropName.trim(),
      scheduled_date: scheduledDate,
      notes: notes?.trim() || null,
      status: "UPCOMING",
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from("crop_calendar_events").insert(eventPayload).select().single();

    return Response.json({
      success: true,
      message: "Calendar event scheduled.",
      event: data || { id: `cal-${Date.now()}`, ...eventPayload },
      migrationPending: Boolean(error),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Calendar event creation failed.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
