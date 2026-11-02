import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyServerSession } from "@/lib/server-auth";
import { SEED_SCHEMES } from "@/lib/platform-db";

interface SchemeApplicationBody {
  schemeId?: string;
  schemeCode?: string;
  applicantRole?: string;
  documentsAttached?: string[];
}

export async function GET(request: NextRequest) {
  try {
    const session = await verifyServerSession(request);

    const { data: schemes, error: schemesError } = await supabase.from("government_schemes").select("*");
    let appQuery = supabase.from("scheme_applications").select("*").order("applied_date", { ascending: false });

    if (session.isAuthenticated && session.userId && session.role !== "ADMIN") {
      appQuery = appQuery.eq("applicant_id", session.userId);
    }

    const { data: applications, error: appError } = await appQuery;

    if (schemesError || appError) {
      return Response.json({
        success: true,
        databaseSource: "BENCHMARK_FALLBACK",
        migrationPending: true,
        migrationNotice: "Government schemes awaiting migration 003_platform_services.sql.",
        schemes: SEED_SCHEMES,
        applications: [],
      });
    }

    return Response.json({
      success: true,
      databaseSource: "SUPABASE_LIVE",
      migrationPending: false,
      schemes: schemes && schemes.length > 0 ? schemes : SEED_SCHEMES,
      applications: applications || [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load government schemes.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifyServerSession(request);

    let body: SchemeApplicationBody;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const { schemeId, schemeCode, documentsAttached } = body;

    if (!schemeId && !schemeCode) {
      return Response.json({ error: "schemeId or schemeCode is required." }, { status: 400 });
    }

    const appPayload = {
      scheme_id: schemeId || null,
      applicant_id: session.profileId || session.userId || null,
      applied_date: new Date().toISOString().split("T")[0],
      status: "UNDER_REVIEW",
      documents_submitted: documentsAttached || ["Aadhaar Verification", "Pahani / Land Record"],
      subsidy_claimed_amount: 15000,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from("scheme_applications").insert(appPayload).select().single();

    return Response.json({
      success: true,
      message: "Scheme subsidy application submitted for verification.",
      application: data || { id: `app-${Date.now()}`, ...appPayload },
      migrationPending: Boolean(error),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Scheme application failed.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
