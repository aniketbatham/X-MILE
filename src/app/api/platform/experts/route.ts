import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyServerSession } from "@/lib/server-auth";
import { PlatformDb, SEED_KVKS } from "@/lib/platform-db";

interface ExpertReferralBody {
  kvkId?: string;
  cropName?: string;
  issueDescription?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const district = searchParams.get("district");

    let kvkQuery = supabase.from("kvk_institutions").select("*");
    if (district) {
      kvkQuery = kvkQuery.eq("district", district);
    }

    const { data: kvkList, error: kvkError } = await kvkQuery;
    const { data: referrals, error: refError } = await supabase
      .from("expert_referrals")
      .select("*")
      .order("created_at", { ascending: false });

    if (kvkError || refError) {
      return Response.json({
        success: true,
        databaseSource: "BENCHMARK_FALLBACK",
        migrationPending: true,
        migrationNotice: "Expert tables awaiting migration 003_platform_services.sql.",
        kvkInstitutions: SEED_KVKS,
        referrals: PlatformDb.getExpertReferrals(),
      });
    }

    return Response.json({
      success: true,
      databaseSource: "SUPABASE_LIVE",
      migrationPending: false,
      kvkInstitutions: kvkList && kvkList.length > 0 ? kvkList : SEED_KVKS,
      referrals: referrals && referrals.length > 0 ? referrals : PlatformDb.getExpertReferrals(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load expert advisory data.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifyServerSession(request);

    let body: ExpertReferralBody;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const { kvkId, cropName, issueDescription } = body;

    if (!kvkId || !cropName || !issueDescription) {
      return Response.json(
        { error: "kvkId, cropName, and issueDescription are required." },
        { status: 400 }
      );
    }

    const referralPayload = {
      farmer_id: session.profileId || session.userId || null,
      kvk_id: kvkId,
      crop_name: cropName.trim(),
      issue_description: issueDescription.trim(),
      status: "SUBMITTED",
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from("expert_referrals").insert(referralPayload).select().single();

    return Response.json({
      success: true,
      message: "Consultation ticket referred to KVK scientist.",
      referral: data || { id: `ref-${Date.now()}`, ...referralPayload },
      migrationPending: Boolean(error),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Expert referral failed.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
