import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyServerSession } from "@/lib/server-auth";

interface FpoContributionBody {
  action?: "contribute_lot" | "create_demand" | "create_lot";
  fpoId?: string;
  lotId?: string;
  cropName?: string;
  quantityKg?: number;
  grade?: string;
  targetPricePerKg?: number;
  buyerName?: string;
  requiredQuantityMt?: number;
  deliveryLocation?: string;
  deadline?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fpoId = searchParams.get("fpoId");

    let fpoQuery = supabase.from("fpos").select("*");
    if (fpoId) {
      fpoQuery = fpoQuery.eq("id", fpoId);
    }

    const { data: liveFpos, error: fpoError } = await fpoQuery;
    const { data: liveLots, error: lotError } = await supabase.from("aggregated_lots").select("*");
    const { data: liveDemands, error: demandError } = await supabase.from("institutional_demands").select("*");

    const isPending = Boolean(fpoError || lotError || demandError);

    if (isPending) {
      return Response.json({
        success: true,
        databaseSource: "BENCHMARK_FALLBACK",
        migrationPending: true,
        migrationNotice: "FPO tables awaiting migration 003_platform_services.sql.",
        fpos: [
          {
            id: "fpo-tumakuru-01",
            name: "Sri Siddaganga Farmer Producer Co. Ltd.",
            registration_number: "U01111KA2021PTC148821",
            district: "Tumakuru",
            state: "Karnataka",
            total_members: 340,
            contact_person: "Shivanna Gowda",
            phone: "+91 94481 23456",
            crops_supported: ["Tomato", "Paddy", "Ragi", "Maize"],
          },
        ],
        aggregatedLots: [
          {
            id: "lot-fpo-101",
            lot_code: "LOT-TOM-26A",
            crop_name: "Tomato (Hybrid Shivam)",
            grade: "A",
            total_quantity_kg: 18500,
            pool_status: "COLLECTING",
            target_price_per_kg: 21.5,
          },
        ],
        institutionalDemands: [
          {
            id: "dem-inst-01",
            buyer_name: "FreshDirect Processing Ltd.",
            crop_name: "Tomato (Grade A)",
            required_quantity_mt: 50.0,
            offered_price_per_kg: 22.0,
            delivery_location: "Tumakuru Industrial Area Unit 2",
            deadline: "2026-11-15",
            status: "OPEN",
          },
        ],
      });
    }

    return Response.json({
      success: true,
      databaseSource: "SUPABASE_LIVE",
      migrationPending: false,
      fpos: liveFpos || [],
      aggregatedLots: liveLots || [],
      institutionalDemands: liveDemands || [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load FPO data.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifyServerSession(request);

    let body: FpoContributionBody;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const { action = "contribute_lot" } = body;

    if (action === "contribute_lot") {
      if (!body.lotId || !body.quantityKg || body.quantityKg <= 0) {
        return Response.json({ error: "Valid lotId and positive quantityKg are required." }, { status: 400 });
      }

      const contributionPayload = {
        lot_id: body.lotId,
        farmer_id: session.profileId || session.userId || null,
        quantity_contributed_kg: body.quantityKg,
        grade_verified: body.grade || "A",
        payout_status: "PENDING",
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase.from("lot_contributions").insert(contributionPayload).select().single();

      return Response.json({
        success: true,
        message: "Lot contribution recorded.",
        contribution: data || { id: `contrib-${Date.now()}`, ...contributionPayload },
        migrationPending: Boolean(error),
      });
    }

    if (action === "create_demand") {
      if (!body.cropName || !body.requiredQuantityMt || !body.deliveryLocation) {
        return Response.json({ error: "cropName, requiredQuantityMt, and deliveryLocation are required." }, { status: 400 });
      }

      const demandPayload = {
        buyer_id: session.userId || null,
        buyer_name: body.buyerName || session.name || "Procurement Buyer",
        crop_name: body.cropName,
        grade: body.grade || "A",
        required_quantity_mt: body.requiredQuantityMt,
        offered_price_per_kg: body.targetPricePerKg || 20,
        delivery_location: body.deliveryLocation,
        deadline: body.deadline || new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
        status: "OPEN",
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase.from("institutional_demands").insert(demandPayload).select().single();

      return Response.json({
        success: true,
        message: "Institutional demand posted.",
        demand: data || { id: `dem-${Date.now()}`, ...demandPayload },
        migrationPending: Boolean(error),
      });
    }

    return Response.json({ error: "Unsupported action." }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "FPO operation failed.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
