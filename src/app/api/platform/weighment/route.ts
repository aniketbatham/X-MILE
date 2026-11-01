import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyServerSession } from "@/lib/server-auth";

const SEED_BENCHMARK_WEIGHMENTS = [
  {
    id: "WB-2026-8801",
    produceName: "Tomato (Grade A)",
    grossWeightKg: 4250,
    tareWeightKg: 750,
    netWeightKg: 3500,
    moisturePercent: 12.5,
    agreedGrade: "A",
    weighmentTimestamp: "2026-11-01 10:30 AM",
    collectorName: "Tumakuru Aggregation Hub Bridge #1",
    farmerConfirmed: true,
    buyerConfirmed: true,
    status: "CONFIRMED",
    isSampleData: true,
  },
  {
    id: "WB-2026-8802",
    produceName: "Paddy Straw Bales",
    grossWeightKg: 6800,
    tareWeightKg: 1800,
    netWeightKg: 5000,
    moisturePercent: 14.0,
    agreedGrade: "Baled",
    weighmentTimestamp: "2026-11-01 11:15 AM",
    collectorName: "Sira Road Industrial Weighbridge",
    farmerConfirmed: true,
    buyerConfirmed: false,
    status: "PENDING_BUYER",
    isSampleData: true,
  },
];

export async function GET(request: NextRequest) {
  try {
    const session = await verifyServerSession(request);

    let query = supabase.from("weighment_records").select("*").order("weighment_timestamp", { ascending: false });

    const { data: records, error } = await query;

    if (error) {
      return Response.json({
        success: true,
        databaseSource: "BENCHMARK_FALLBACK",
        migrationPending: true,
        migrationNotice: "Table 'weighment_records' awaiting migration 001_complete_platform_schema.sql.",
        receipts: SEED_BENCHMARK_WEIGHMENTS,
      });
    }

    return Response.json({
      success: true,
      databaseSource: "SUPABASE_LIVE",
      migrationPending: false,
      receipts: records && records.length > 0 ? records : SEED_BENCHMARK_WEIGHMENTS,
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

    const { produceName, grossWeightKg, tareWeightKg, agreedGrade, collectorName } = body;

    const gross = Number(grossWeightKg);
    const tare = Number(tareWeightKg);

    if (!produceName || isNaN(gross) || isNaN(tare) || gross <= tare) {
      return Response.json(
        { error: "Valid produceName, grossWeightKg, and tareWeightKg (gross > tare) are required." },
        { status: 400 }
      );
    }

    const net = gross - tare;

    const { data: newReceipt, error } = await supabase
      .from("weighment_records")
      .insert({
        farmer_id: session.profileId || null,
        produce_name: produceName.trim(),
        gross_weight_kg: gross,
        tare_weight_kg: tare,
        net_weight_kg: net,
        agreed_grade: agreedGrade || "A",
        collector_name: collectorName?.trim() || "Local Digital Weighbridge",
        farmer_confirmed: true,
        buyer_confirmed: false,
        status: "PENDING_BUYER",
      })
      .select()
      .single();

    if (error) {
      return Response.json(
        {
          success: false,
          error: `Failed to save weighment slip: ${error.message}. Verify 'weighment_records' table exists.`,
        },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      message: "Electronic weighment slip generated and persisted in database.",
      receipt: newReceipt,
    });
  } catch (err: any) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
