import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyServerSession } from "@/lib/server-auth";

const SEED_BENCHMARK_PLANS = [
  {
    id: "PLAN-BENCHMARK-01",
    cropName: "Tomato (Hybrid - Shivam)",
    season: "Rabi 2026",
    durationDays: 110,
    expectedYieldKg: 18000,
    targetSellingPricePerKg: 22,
    estimatedCost: 145000,
    estimatedRevenue: 396000,
    breakEvenPricePerKg: 8.05,
    breakEvenYieldKg: 6590,
    isSampleData: true,
  },
  {
    id: "PLAN-BENCHMARK-02",
    cropName: "Paddy (BPT 5204 Sona Masuri)",
    season: "Kharif 2026",
    durationDays: 140,
    expectedYieldKg: 22000,
    targetSellingPricePerKg: 28,
    estimatedCost: 185000,
    estimatedRevenue: 616000,
    breakEvenPricePerKg: 8.41,
    breakEvenYieldKg: 6607,
    isSampleData: true,
  },
];

export async function GET(request: NextRequest) {
  try {
    const session = await verifyServerSession(request);

    // Query Supabase crop_plans
    let query = supabase.from("crop_plans").select("*").order("created_at", { ascending: false });

    // If authenticated, restrict to farmer's own plans
    if (session.isAuthenticated && session.profileId && !session.isAdmin) {
      query = query.eq("farmer_id", session.profileId);
    }

    const { data: plans, error } = await query;

    if (error) {
      // Table not yet migrated in remote Supabase
      return Response.json({
        success: true,
        databaseSource: "BENCHMARK_FALLBACK",
        migrationPending: true,
        migrationNotice: "Supabase table 'crop_plans' awaiting execution of migration 001_complete_platform_schema.sql.",
        plans: SEED_BENCHMARK_PLANS,
      });
    }

    return Response.json({
      success: true,
      databaseSource: "SUPABASE_LIVE",
      migrationPending: false,
      plans: plans && plans.length > 0 ? plans : SEED_BENCHMARK_PLANS,
    });
  } catch (err: any) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifyServerSession(request);

    let body: any;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const {
      cropName,
      variety,
      season,
      durationDays,
      expectedYieldKg,
      targetSellingPricePerKg,
      estimatedCost,
      estimatedRevenue,
      breakEvenPricePerKg,
      breakEvenYieldKg,
      assumptions,
    } = body;

    // Server-side validations
    if (!cropName || typeof cropName !== "string" || !cropName.trim()) {
      return Response.json({ error: "Crop name is required." }, { status: 400 });
    }

    const numYield = Number(expectedYieldKg);
    const numPrice = Number(targetSellingPricePerKg);
    const numCost = Number(estimatedCost);

    if (isNaN(numYield) || numYield <= 0) {
      return Response.json({ error: "Expected yield must be a positive number." }, { status: 400 });
    }
    if (isNaN(numPrice) || numPrice <= 0) {
      return Response.json({ error: "Target price must be a positive number." }, { status: 400 });
    }
    if (isNaN(numCost) || numCost < 0) {
      return Response.json({ error: "Estimated cost cannot be negative." }, { status: 400 });
    }

    // Insert into Supabase
    const { data: newPlan, error } = await supabase
      .from("crop_plans")
      .insert({
        farmer_id: session.profileId || null,
        crop_name: cropName.trim(),
        variety: variety?.trim() || null,
        season: season || "Kharif 2026",
        duration_days: Number(durationDays) || 100,
        expected_yield_kg: numYield,
        target_selling_price_per_kg: numPrice,
        estimated_cost: numCost,
        estimated_revenue: Number(estimatedRevenue) || numYield * numPrice,
        break_even_price_per_kg: Number(breakEvenPricePerKg) || (numYield > 0 ? numCost / numYield : 0),
        break_even_yield_kg: Number(breakEvenYieldKg) || (numPrice > 0 ? numCost / numPrice : 0),
        assumptions: assumptions || {},
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return Response.json({
        success: false,
        error: `Database insertion failed: ${error.message}. Please verify table 'crop_plans' is created in Supabase.`,
        code: "DB_ERROR",
      }, { status: 500 });
    }

    return Response.json({
      success: true,
      message: "Crop plan successfully persisted to Supabase.",
      plan: newPlan,
    });
  } catch (err: any) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
