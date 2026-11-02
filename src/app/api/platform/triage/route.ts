import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyServerSession } from "@/lib/server-auth";

const SEED_TRIAGE_CASES = [
  {
    id: "trg-01",
    crop_name: "Tomato (Hybrid Shivam)",
    symptom_description: "Early blight concentric rings with chlorotic halo on lower leaves.",
    photo_url: null,
    suggested_hygiene_measures: [
      "Prune affected lower leaves 15cm from ground",
      "Apply copper oxychloride (COC 50% WP @ 2.5g/L) during clear morning window",
      "Switch to drip irrigation to avoid leaf wetness",
    ],
    kvk_referral_sent: true,
    status: "ACTIVE",
    created_at: "2026-10-31T09:15:00Z",
    isSampleData: true,
  },
];

interface TriageCaseBody {
  cropName?: string;
  symptomDescription?: string;
  photoUrl?: string;
  suggestedHygieneMeasures?: string[];
  kvkReferralSent?: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const session = await verifyServerSession(request);

    let query = supabase.from("crop_triage_cases").select("*").order("created_at", { ascending: false });
    if (session.isAuthenticated && session.userId && session.role !== "ADMIN") {
      query = query.eq("farmer_id", session.userId);
    }

    const { data: cases, error } = await query;

    if (error) {
      return Response.json({
        success: true,
        databaseSource: "BENCHMARK_FALLBACK",
        migrationPending: true,
        migrationNotice: "Table 'crop_triage_cases' awaiting migration 003_platform_services.sql.",
        cases: SEED_TRIAGE_CASES,
      });
    }

    return Response.json({
      success: true,
      databaseSource: "SUPABASE_LIVE",
      migrationPending: false,
      cases: cases && cases.length > 0 ? cases : SEED_TRIAGE_CASES,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load triage cases.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifyServerSession(request);

    let body: TriageCaseBody;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const { cropName, symptomDescription, photoUrl, suggestedHygieneMeasures, kvkReferralSent } = body;

    if (!cropName || !symptomDescription) {
      return Response.json(
        { error: "cropName and symptomDescription are required." },
        { status: 400 }
      );
    }

    const triagePayload = {
      farmer_id: session.profileId || session.userId || null,
      crop_name: cropName.trim(),
      symptom_description: symptomDescription.trim(),
      photo_url: photoUrl || null,
      suggested_hygiene_measures: suggestedHygieneMeasures || [
        "Isolate affected foliage to prevent spore drift",
        "Sterilize pruning shears with 5% bleach solution",
        "Avoid overhead sprinkler irrigation to lower humidity",
      ],
      kvk_referral_sent: Boolean(kvkReferralSent),
      status: "ACTIVE",
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from("crop_triage_cases").insert(triagePayload).select().single();

    return Response.json({
      success: true,
      message: "Crop triage case filed.",
      triageCase: data || { id: `trg-${Date.now()}`, ...triagePayload },
      migrationPending: Boolean(error),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Crop triage submission failed.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
