import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      // Invalidate Supabase session if token provided
      await supabase.auth.signOut();
    }

    return Response.json({
      success: true,
      message: "Signed out successfully.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error signing out.";
    return Response.json({ error: message }, { status: 500 });
  }
}
