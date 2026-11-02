import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  let body: { newPassword?: string };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  const newPassword = body.newPassword;

  if (!newPassword || newPassword.length < 6) {
    return Response.json(
      { error: "Password must be at least 6 characters." },
      { status: 400 }
    );
  }

  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json(
        { error: "Authentication required to reset password." },
        { status: 401 }
      );
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json({
      success: true,
      message: "Password updated successfully. You can now sign in with your new password.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Password reset failed.";
    return Response.json({ error: message }, { status: 500 });
  }
}
