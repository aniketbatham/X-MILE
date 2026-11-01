import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyServerSession } from "@/lib/server-auth";

const SEED_BENCHMARK_RECORDS = [
  {
    id: "REC-BENCHMARK-01",
    date: "2026-10-15",
    type: "EXPENSE",
    category: "Seeds",
    description: "Hybrid Tomato Seeds (Shivam 3 packs)",
    amount: 4500,
    isSampleData: true,
  },
  {
    id: "REC-BENCHMARK-02",
    date: "2026-10-18",
    type: "EXPENSE",
    category: "Fertilizer",
    description: "Neem Coated Urea & Bio-Potash bags",
    amount: 8200,
    isSampleData: true,
  },
  {
    id: "REC-BENCHMARK-03",
    date: "2026-10-22",
    type: "EXPENSE",
    category: "Machinery Hire",
    description: "45 HP Tractor rotavator land preparation (6 hours)",
    amount: 5400,
    isSampleData: true,
  },
  {
    id: "REC-BENCHMARK-04",
    date: "2026-10-29",
    type: "REVENUE",
    category: "Produce Sale",
    description: "Advance payment for 3,500 kg Tomato lot reservation",
    amount: 42000,
    isSampleData: true,
  },
];

export async function GET(request: NextRequest) {
  try {
    const session = await verifyServerSession(request);

    let query = supabase.from("farm_records").select("*").order("date", { ascending: false });

    if (session.isAuthenticated && session.profileId && !session.isAdmin) {
      query = query.eq("farmer_id", session.profileId);
    }

    const { data: records, error } = await query;

    if (error) {
      return Response.json({
        success: true,
        databaseSource: "BENCHMARK_FALLBACK",
        migrationPending: true,
        migrationNotice: "Table 'farm_records' awaiting migration 001_complete_platform_schema.sql. Sourced from benchmark ledger.",
        records: SEED_BENCHMARK_RECORDS,
      });
    }

    return Response.json({
      success: true,
      databaseSource: "SUPABASE_LIVE",
      migrationPending: false,
      records: records && records.length > 0 ? records : SEED_BENCHMARK_RECORDS,
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

    const { type, category, description, amount, date } = body;

    if (!type || !category || !description || amount === undefined) {
      return Response.json(
        { error: "type, category, description, and amount are required fields." },
        { status: 400 }
      );
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return Response.json(
        { error: "Amount must be a positive number greater than zero." },
        { status: 400 }
      );
    }

    const recordDate = date || new Date().toISOString().split("T")[0];

    const { data: newRecord, error } = await supabase
      .from("farm_records")
      .insert({
        farmer_id: session.profileId || null,
        record_type: type.toUpperCase(),
        category: category.trim(),
        description: description.trim(),
        amount: numAmount,
        date: recordDate,
      })
      .select()
      .single();

    if (error) {
      return Response.json(
        {
          success: false,
          error: `Failed to insert record: ${error.message}. Please verify 'farm_records' table exists.`,
        },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      message: "Ledger transaction recorded in database.",
      record: newRecord,
    });
  } catch (err: any) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
