import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyServerSession } from "@/lib/server-auth";

const SEED_BENCHMARK_WEIGHMENTS = [
  {
    id: "WB-2026-0081",
    orderId: "ORD-9421",
    farmerName: "Siddaramaiah Gowda",
    buyerName: "Reliance Retail Hub",
    produceName: "Tomato (Grade A)",
    grossWeightKg: 3820,
    tareWeightKg: 320,
    netWeightKg: 3500,
    moisturePercent: 11.2,
    agreedGrade: "A",
    weighmentTimestamp: "2026-11-01T10:30:00Z",
    collectorName: "Kunigal APMC Weighbridge Gate 2",
    farmerConfirmed: true,
    buyerConfirmed: true,
    status: "CONFIRMED",
    isSampleData: true,
  },
  {
    id: "WB-2026-0082",
    orderId: "ORD-9425",
    farmerName: "Anand Murthy",
    buyerName: "Apex Agri Retailers",
    produceName: "Paddy (Sona Masuri)",
    grossWeightKg: 5350,
    tareWeightKg: 350,
    netWeightKg: 5000,
    moisturePercent: 13.8,
    agreedGrade: "A",
    weighmentTimestamp: "2026-11-01T11:45:00Z",
    collectorName: "Sira Road Industrial Weighbridge",
    farmerConfirmed: true,
    buyerConfirmed: false,
    status: "PENDING_BUYER",
    isSampleData: true,
  },
];

interface WeighmentBody {
  orderId?: string;
  produceName?: string;
  farmerId?: string;
  buyerId?: string;
  grossWeightKg?: number | string;
  tareWeightKg?: number | string;
  agreedGrade?: string;
  collectorName?: string;
}

export async function GET(request: NextRequest) {
  try {
    const session = await verifyServerSession(request);

    let query = supabase.from("weighment_records").select("*").order("weighment_timestamp", { ascending: false });

    if (session.isAuthenticated && session.userId && session.role !== "ADMIN") {
      query = query.or(`farmer_id.eq.${session.userId},buyer_id.eq.${session.userId}`);
    }

    const { data: records, error } = await query;

    if (error) {
      return Response.json({
        success: true,
        databaseSource: "BENCHMARK_FALLBACK",
        migrationPending: true,
        migrationNotice: "Table 'weighment_records' awaiting migration 003_platform_services.sql.",
        receipts: SEED_BENCHMARK_WEIGHMENTS,
      });
    }

    return Response.json({
      success: true,
      databaseSource: "SUPABASE_LIVE",
      migrationPending: false,
      receipts: records && records.length > 0 ? records : SEED_BENCHMARK_WEIGHMENTS,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load weighment records.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifyServerSession(request);

    let body: WeighmentBody;
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
    const effectiveFarmerId = session.userId || body.farmerId || "DEMO-FARMER-01";

    const insertPayload = {
      order_id: body.orderId || null,
      farmer_id: effectiveFarmerId,
      buyer_id: body.buyerId || null,
      produce_name: produceName.trim(),
      gross_weight_kg: gross,
      tare_weight_kg: tare,
      net_weight_kg: net,
      agreed_grade: agreedGrade || "A",
      collector_name: collectorName?.trim() || "Local Digital Weighbridge",
      farmer_confirmed: true,
      buyer_confirmed: false,
      status: "PENDING_BUYER",
    };

    const { data: newReceipt, error } = await supabase
      .from("weighment_records")
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      // Graceful fallback when table awaits migration
      if (error.code === "42P01" || error.code === "PGRST205" || error.message?.includes("schema cache")) {
        const fallbackReceipt = {
          id: `WB-SIM-${Date.now()}`,
          orderId: body.orderId || "ORD-8821",
          produceName: produceName.trim(),
          grossWeightKg: gross,
          tareWeightKg: tare,
          netWeightKg: net,
          agreedGrade: agreedGrade || "A",
          collectorName: collectorName?.trim() || "Local Digital Weighbridge",
          farmerConfirmed: true,
          buyerConfirmed: false,
          status: "PENDING_BUYER",
          weighmentTimestamp: new Date().toISOString(),
          isSampleData: true,
        };
        return Response.json({
          success: true,
          migrationPending: true,
          migrationNotice: "Table 'weighment_records' awaiting migration 003_platform_services.sql. Generated staged digital slip.",
          receipt: fallbackReceipt,
        });
      }

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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error generating weighment slip.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
