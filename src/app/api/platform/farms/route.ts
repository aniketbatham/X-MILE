import { NextRequest } from "next/server";
import { verifyServerSession, getAuthenticatedClient } from "@/lib/server-auth";
import { supabase as anonClient } from "@/lib/supabase";

interface FarmPayload {
  id?: string;
  name?: string;
  totalAreaAcres?: number | string;
  total_area_acres?: number | string;
  state?: string;
  district?: string;
  village?: string;
  surveyNumber?: string;
  survey_number?: string;
}

export async function GET(request: NextRequest) {
  try {
    const session = await verifyServerSession(request);
    if (!session.isAuthenticated || !session.userId) {
      return Response.json({ error: "Authentication required to view farms." }, { status: 401 });
    }

    const client = session.token ? getAuthenticatedClient(session.token) : anonClient;

    // Fetch user farms
    const { data: farms, error: farmsError } = await client
      .from("farms")
      .select("*")
      .eq("farmer_id", session.userId)
      .order("created_at", { ascending: false });

    if (farmsError) {
      return Response.json({ success: false, error: farmsError.message }, { status: 500 });
    }

    if (!farms || farms.length === 0) {
      return Response.json({ success: true, farms: [] });
    }

    const farmIds = farms.map((f) => f.id);
    const { data: plots, error: plotsError } = await client
      .from("plots")
      .select("*")
      .in("farm_id", farmIds)
      .order("created_at", { ascending: true });

    if (plotsError) {
      return Response.json({ success: false, error: plotsError.message }, { status: 500 });
    }

    const farmsWithPlots = farms.map((farm) => ({
      ...farm,
      plots: (plots || []).filter((p) => p.farm_id === farm.id),
    }));

    return Response.json({
      success: true,
      farms: farmsWithPlots,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load farm details.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifyServerSession(request);
    if (!session.isAuthenticated || !session.userId) {
      return Response.json({ error: "Authentication required to create a farm." }, { status: 401 });
    }

    if (session.role !== "FARMER" && !session.isAdmin) {
      return Response.json({ error: "Only registered farmers can create farm profiles." }, { status: 403 });
    }

    let body: FarmPayload;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const name = body.name?.trim();
    const area = Number(body.totalAreaAcres ?? body.total_area_acres ?? 0);
    const state = body.state?.trim() || "Karnataka";
    const district = body.district?.trim() || "Tumakuru";
    const village = body.village?.trim() || null;
    const surveyNumber = (body.surveyNumber ?? body.survey_number)?.trim() || null;

    if (!name) {
      return Response.json({ error: "Farm name is required." }, { status: 400 });
    }

    if (isNaN(area) || area < 0) {
      return Response.json({ error: "Total area in acres must be a valid positive number." }, { status: 400 });
    }

    const client = session.token ? getAuthenticatedClient(session.token) : anonClient;

    const { data: newFarm, error: insertError } = await client
      .from("farms")
      .insert({
        farmer_id: session.userId,
        name,
        total_area_acres: area,
        state,
        district,
        village,
        survey_number: surveyNumber,
      })
      .select()
      .single();

    if (insertError) {
      return Response.json({ success: false, error: insertError.message }, { status: 500 });
    }

    return Response.json({
      success: true,
      message: "Farm created successfully.",
      farm: { ...newFarm, plots: [] },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create farm.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await verifyServerSession(request);
    if (!session.isAuthenticated || !session.userId) {
      return Response.json({ error: "Authentication required to update a farm." }, { status: 401 });
    }

    let body: FarmPayload;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const { id } = body;
    if (!id) {
      return Response.json({ error: "Farm id is required for updates." }, { status: 400 });
    }

    const client = session.token ? getAuthenticatedClient(session.token) : anonClient;

    // Verify ownership
    const { data: existing, error: checkError } = await client
      .from("farms")
      .select("id, farmer_id")
      .eq("id", id)
      .single();

    if (checkError || !existing) {
      return Response.json({ error: "Farm not found or access denied." }, { status: 404 });
    }

    if (existing.farmer_id !== session.userId && !session.isAdmin) {
      return Response.json({ error: "Forbidden: You can only edit your own farm." }, { status: 403 });
    }

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.totalAreaAcres !== undefined || body.total_area_acres !== undefined) {
      const area = Number(body.totalAreaAcres ?? body.total_area_acres);
      if (isNaN(area) || area < 0) {
        return Response.json({ error: "Total area in acres must be non-negative." }, { status: 400 });
      }
      updates.total_area_acres = area;
    }
    if (body.state !== undefined) updates.state = body.state.trim();
    if (body.district !== undefined) updates.district = body.district.trim();
    if (body.village !== undefined) updates.village = body.village.trim();
    if (body.surveyNumber !== undefined || body.survey_number !== undefined) {
      updates.survey_number = (body.surveyNumber ?? body.survey_number)?.trim() || null;
    }

    const { data: updated, error: updateError } = await client
      .from("farms")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return Response.json({ success: false, error: updateError.message }, { status: 500 });
    }

    return Response.json({
      success: true,
      message: "Farm updated successfully.",
      farm: updated,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update farm.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await verifyServerSession(request);
    if (!session.isAuthenticated || !session.userId) {
      return Response.json({ error: "Authentication required to delete a farm." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return Response.json({ error: "Farm id is required." }, { status: 400 });
    }

    const client = session.token ? getAuthenticatedClient(session.token) : anonClient;

    const { data: existing, error: checkError } = await client
      .from("farms")
      .select("id, farmer_id")
      .eq("id", id)
      .single();

    if (checkError || !existing) {
      return Response.json({ error: "Farm not found or access denied." }, { status: 404 });
    }

    if (existing.farmer_id !== session.userId && !session.isAdmin) {
      return Response.json({ error: "Forbidden: You can only delete your own farm." }, { status: 403 });
    }

    const { error: delError } = await client.from("farms").delete().eq("id", id);
    if (delError) {
      return Response.json({ success: false, error: delError.message }, { status: 500 });
    }

    return Response.json({ success: true, message: "Farm deleted successfully." });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete farm.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
