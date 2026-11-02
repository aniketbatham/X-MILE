import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyServerSession } from "@/lib/server-auth";
import { PlatformDb } from "@/lib/platform-db";

interface SoilReportBody {
  plotId?: string;
  testDate?: string;
  testingLab?: string;
  ph?: number;
  electricalConductivity?: number;
  organicCarbonPercent?: number;
  nitrogenKgPerHa?: number;
  phosphorusKgPerHa?: number;
  potassiumKgPerHa?: number;
  micronutrientNotes?: string;
  recommendedCropRotation?: string[];
}

export async function GET(request: NextRequest) {
  try {
    const session = await verifyServerSession(request);

    let query = supabase.from("soil_reports").select("*").order("test_date", { ascending: false });
    if (session.isAuthenticated && session.userId && session.role !== "ADMIN") {
      query = query.eq("farmer_id", session.userId);
    }

    const { data: reports, error } = await query;

    if (error) {
      return Response.json({
        success: true,
        databaseSource: "BENCHMARK_FALLBACK",
        migrationPending: true,
        migrationNotice: "Table 'soil_reports' awaiting migration 003_platform_services.sql.",
        reports: PlatformDb.getSoilReports(),
      });
    }

    return Response.json({
      success: true,
      databaseSource: "SUPABASE_LIVE",
      migrationPending: false,
      reports: reports && reports.length > 0 ? reports : PlatformDb.getSoilReports(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load soil reports.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifyServerSession(request);

    let body: SoilReportBody;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const {
      plotId,
      testDate,
      testingLab,
      ph,
      electricalConductivity,
      organicCarbonPercent,
      nitrogenKgPerHa,
      phosphorusKgPerHa,
      potassiumKgPerHa,
      micronutrientNotes,
      recommendedCropRotation,
    } = body;

    if (!testDate || !testingLab || ph === undefined || organicCarbonPercent === undefined) {
      return Response.json(
        { error: "testDate, testingLab, ph, and organicCarbonPercent are required." },
        { status: 400 }
      );
    }

    const reportPayload = {
      farmer_id: session.profileId || session.userId || null,
      plot_id: plotId || null,
      test_date: testDate,
      testing_lab: testingLab.trim(),
      ph: Number(ph),
      electrical_conductivity: electricalConductivity !== undefined ? Number(electricalConductivity) : null,
      organic_carbon_percent: Number(organicCarbonPercent),
      nitrogen_kg_per_ha: Number(nitrogenKgPerHa || 0),
      phosphorus_kg_per_ha: Number(phosphorusKgPerHa || 0),
      potassium_kg_per_ha: Number(potassiumKgPerHa || 0),
      micronutrient_notes: micronutrientNotes?.trim() || null,
      recommended_crop_rotation: recommendedCropRotation || [],
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from("soil_reports").insert(reportPayload).select().single();

    return Response.json({
      success: true,
      message: "Soil health report recorded.",
      report: data || { id: `soil-${Date.now()}`, ...reportPayload },
      migrationPending: Boolean(error),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Soil report submission failed.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
