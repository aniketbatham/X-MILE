import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  let body: { email?: string; redirectTo?: string };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();

  if (!email || !email.includes("@")) {
    return Response.json(
      { error: "A valid email address is required." },
      { status: 400 }
    );
  }

  try {
    const origin = request.nextUrl.origin || "http://localhost:3000";
    const redirectTo = body.redirectTo || `${origin}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json({
      success: true,
      message: "Password recovery instructions have been sent to your registered email address.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Password recovery request failed.";
    return Response.json({ error: message }, { status: 500 });
  }
}
