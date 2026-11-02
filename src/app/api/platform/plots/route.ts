import { NextRequest } from "next/server";
import { verifyServerSession, getAuthenticatedClient } from "@/lib/server-auth";
import { supabase as anonClient } from "@/lib/supabase";

interface PlotPayload {
  id?: string;
  farmId?: string;
  farm_id?: string;
  plotCode?: string;
  plot_code?: string;
  areaAcres?: number | string;
  area_acres?: number | string;
  soilType?: string;
  soil_type?: string;
  irrigationSource?: string;
  irrigation_source?: string;
  currentCrop?: string;
  current_crop?: string;
  cropStage?: string;
  crop_stage?: string;
  sowingDate?: string;
  sowing_date?: string;
  expectedHarvestDate?: string;
  expected_harvest_date?: string;
}

export async function GET(request: NextRequest) {
  try {
    const session = await verifyServerSession(request);
    if (!session.isAuthenticated || !session.userId) {
      return Response.json({ error: "Authentication required." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const farmId = searchParams.get("farmId");

    const client = session.token ? getAuthenticatedClient(session.token) : anonClient;

    if (farmId) {
      // Verify farm ownership
      const { data: farm, error: farmErr } = await client
        .from("farms")
        .select("id, farmer_id")
        .eq("id", farmId)
        .single();

      if (farmErr || !farm) {
        return Response.json({ error: "Farm not found or access denied." }, { status: 404 });
      }

      if (farm.farmer_id !== session.userId && !session.isAdmin) {
        return Response.json({ error: "Forbidden: Farm does not belong to you." }, { status: 403 });
      }

      const { data: plots, error: plotsErr } = await client
        .from("plots")
        .select("*")
        .eq("farm_id", farmId)
        .order("plot_code", { ascending: true });

      if (plotsErr) {
        return Response.json({ success: false, error: plotsErr.message }, { status: 500 });
      }

      return Response.json({ success: true, plots: plots || [] });
    }

    // Otherwise return plots for all user's farms
    const { data: userFarms } = await client
      .from("farms")
      .select("id")
      .eq("farmer_id", session.userId);

    const farmIds = (userFarms || []).map((f) => f.id);
    if (farmIds.length === 0) {
      return Response.json({ success: true, plots: [] });
    }

    const { data: allPlots, error: plotsErr } = await client
      .from("plots")
      .select("*")
      .in("farm_id", farmIds)
      .order("created_at", { ascending: true });

    if (plotsErr) {
      return Response.json({ success: false, error: plotsErr.message }, { status: 500 });
    }

    return Response.json({ success: true, plots: allPlots || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load plots.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifyServerSession(request);
    if (!session.isAuthenticated || !session.userId) {
      return Response.json({ error: "Authentication required to add a plot." }, { status: 401 });
    }

    let body: PlotPayload;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const farmId = (body.farmId ?? body.farm_id)?.trim();
    const plotCode = (body.plotCode ?? body.plot_code)?.trim();
    const area = Number(body.areaAcres ?? body.area_acres);
    const soilType = (body.soilType ?? body.soil_type)?.trim() || "Red Loamy";
    const irrigationSource = (body.irrigationSource ?? body.irrigation_source)?.trim() || "Drip Irrigation";
    const currentCrop = (body.currentCrop ?? body.current_crop)?.trim() || null;
    const cropStage = (body.cropStage ?? body.crop_stage)?.trim() || "Sowing";
    const sowingDate = (body.sowingDate ?? body.sowing_date)?.trim() || null;
    const expectedHarvestDate = (body.expectedHarvestDate ?? body.expected_harvest_date)?.trim() || null;

    if (!farmId || !plotCode || isNaN(area) || area <= 0) {
      return Response.json(
        { error: "farmId, plotCode, and positive areaAcres are required." },
        { status: 400 }
      );
    }

    const client = session.token ? getAuthenticatedClient(session.token) : anonClient;

    // Verify farm ownership
    const { data: farm, error: farmErr } = await client
      .from("farms")
      .select("id, farmer_id")
      .eq("id", farmId)
      .single();

    if (farmErr || !farm) {
      return Response.json({ error: "Farm not found or access denied." }, { status: 404 });
    }

    if (farm.farmer_id !== session.userId && !session.isAdmin) {
      return Response.json({ error: "Forbidden: You do not own this farm." }, { status: 403 });
    }

    const { data: newPlot, error: insertError } = await client
      .from("plots")
      .insert({
        farm_id: farmId,
        plot_code: plotCode,
        area_acres: area,
        soil_type: soilType,
        irrigation_source: irrigationSource,
        current_crop: currentCrop,
        crop_stage: cropStage,
        sowing_date: sowingDate,
        expected_harvest_date: expectedHarvestDate,
      })
      .select()
      .single();

    if (insertError) {
      return Response.json({ success: false, error: insertError.message }, { status: 500 });
    }

    // Auto-update total_area_acres on the farm
    const { data: allFarmPlots } = await client
      .from("plots")
      .select("area_acres")
      .eq("farm_id", farmId);

    if (allFarmPlots) {
      const totalAcres = allFarmPlots.reduce((sum, p) => sum + Number(p.area_acres), 0);
      await client
        .from("farms")
        .update({ total_area_acres: totalAcres })
        .eq("id", farmId);
    }

    return Response.json({
      success: true,
      message: "Plot created successfully.",
      plot: newPlot,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create plot.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await verifyServerSession(request);
    if (!session.isAuthenticated || !session.userId) {
      return Response.json({ error: "Authentication required to update plot." }, { status: 401 });
    }

    let body: PlotPayload;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const { id } = body;
    if (!id) {
      return Response.json({ error: "Plot id is required." }, { status: 400 });
    }

    const client = session.token ? getAuthenticatedClient(session.token) : anonClient;

    // Verify ownership via farm
    const { data: plot, error: plotErr } = await client
      .from("plots")
      .select("id, farm_id, farms(farmer_id)")
      .eq("id", id)
      .single();

    if (plotErr || !plot) {
      return Response.json({ error: "Plot not found or access denied." }, { status: 404 });
    }

    interface PlotWithFarm {
      id: string;
      farm_id: string;
      farms: { farmer_id: string } | null;
    }
    const typedPlot = plot as unknown as PlotWithFarm;

    if (typedPlot.farms?.farmer_id !== session.userId && !session.isAdmin) {
      return Response.json({ error: "Forbidden: You do not own this plot's farm." }, { status: 403 });
    }

    const updates: Record<string, unknown> = {};
    if (body.plotCode !== undefined || body.plot_code !== undefined) {
      updates.plot_code = (body.plotCode ?? body.plot_code)?.trim();
    }
    if (body.areaAcres !== undefined || body.area_acres !== undefined) {
      const area = Number(body.areaAcres ?? body.area_acres);
      if (isNaN(area) || area <= 0) {
        return Response.json({ error: "Area must be greater than zero." }, { status: 400 });
      }
      updates.area_acres = area;
    }
    if (body.soilType !== undefined || body.soil_type !== undefined) {
      updates.soil_type = (body.soilType ?? body.soil_type)?.trim();
    }
    if (body.irrigationSource !== undefined || body.irrigation_source !== undefined) {
      updates.irrigation_source = (body.irrigationSource ?? body.irrigation_source)?.trim();
    }
    if (body.currentCrop !== undefined || body.current_crop !== undefined) {
      updates.current_crop = (body.currentCrop ?? body.current_crop)?.trim() || null;
    }
    if (body.cropStage !== undefined || body.crop_stage !== undefined) {
      updates.crop_stage = (body.cropStage ?? body.crop_stage)?.trim();
    }
    if (body.sowingDate !== undefined || body.sowing_date !== undefined) {
      updates.sowing_date = (body.sowingDate ?? body.sowing_date)?.trim() || null;
    }
    if (body.expectedHarvestDate !== undefined || body.expected_harvest_date !== undefined) {
      updates.expected_harvest_date = (body.expectedHarvestDate ?? body.expected_harvest_date)?.trim() || null;
    }

    const { data: updatedPlot, error: updateErr } = await client
      .from("plots")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (updateErr) {
      return Response.json({ success: false, error: updateErr.message }, { status: 500 });
    }

    // Update total farm area if area changed
    if (updates.area_acres !== undefined) {
      const { data: allFarmPlots } = await client
        .from("plots")
        .select("area_acres")
        .eq("farm_id", typedPlot.farm_id);

      if (allFarmPlots) {
        const totalAcres = allFarmPlots.reduce((sum, p) => sum + Number(p.area_acres), 0);
        await client
          .from("farms")
          .update({ total_area_acres: totalAcres })
          .eq("id", typedPlot.farm_id);
      }
    }

    return Response.json({
      success: true,
      message: "Plot updated successfully.",
      plot: updatedPlot,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update plot.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await verifyServerSession(request);
    if (!session.isAuthenticated || !session.userId) {
      return Response.json({ error: "Authentication required." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return Response.json({ error: "Plot id is required." }, { status: 400 });
    }

    const client = session.token ? getAuthenticatedClient(session.token) : anonClient;

    const { data: plot, error: plotErr } = await client
      .from("plots")
      .select("id, farm_id, farms(farmer_id)")
      .eq("id", id)
      .single();

    if (plotErr || !plot) {
      return Response.json({ error: "Plot not found or access denied." }, { status: 404 });
    }

    interface PlotWithFarm {
      id: string;
      farm_id: string;
      farms: { farmer_id: string } | null;
    }
    const typedPlot = plot as unknown as PlotWithFarm;

    if (typedPlot.farms?.farmer_id !== session.userId && !session.isAdmin) {
      return Response.json({ error: "Forbidden: You do not own this plot's farm." }, { status: 403 });
    }

    const { error: delErr } = await client.from("plots").delete().eq("id", id);
    if (delErr) {
      return Response.json({ success: false, error: delErr.message }, { status: 500 });
    }

    // Recalculate total farm area
    const { data: remainingPlots } = await client
      .from("plots")
      .select("area_acres")
      .eq("farm_id", typedPlot.farm_id);

    const totalAcres = (remainingPlots || []).reduce((sum, p) => sum + Number(p.area_acres), 0);
    await client
      .from("farms")
      .update({ total_area_acres: totalAcres })
      .eq("id", typedPlot.farm_id);

    return Response.json({ success: true, message: "Plot deleted successfully." });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete plot.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
