import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (!email || !password) {
    return Response.json(
      { error: "Email and password are required." },
      { status: 400 }
    );
  }

  try {
    // 1. Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      const errorMsg = (authError?.message || "").toLowerCase();
      const isEmailNotConfirmed = errorMsg.includes("email not confirmed");
      const isRateLimit = authError?.status === 429 || errorMsg.includes("rate limit");

      if (isEmailNotConfirmed) {
        return Response.json(
          {
            error: "Please verify your email address before signing in. Check your inbox (and spam folder) for the confirmation link sent by X-MILE.",
            code: "EMAIL_NOT_CONFIRMED",
          },
          { status: 401 }
        );
      }

      if (isRateLimit) {
        return Response.json(
          {
            error: "Too many sign-in attempts. Please wait a moment before trying again.",
            code: "RATE_LIMIT_EXCEEDED",
          },
          { status: 429 }
        );
      }

      return Response.json(
        { error: authError?.message || "Invalid email or password." },
        { status: 401 }
      );
    }

    const userId = authData.user.id;

    // 2. Fetch authoritative profile from database (1:1 Unified Identity: id = auth.users.id)
    const { data: profile, error: _profileError } = await supabase
      .from("profiles")
      .select("id, full_name, email, phone, role, preferred_language, state, district, village, is_verified")
      .eq("id", userId)
      .maybeSingle();

    // 3. Fallback / Server-side Role Resolution
    // If profiles table record exists, role is authoritative from PostgreSQL
    let role = profile?.role;
    const isVerified = Boolean(profile?.is_verified);
    const fullName = profile?.full_name || authData.user.user_metadata?.full_name || email.split("@")[0];

    if (!role) {
      const metaRole = authData.user.user_metadata?.role;
      // Never allow self-promoted ADMIN from metadata
      role = metaRole === "ADMIN" ? "FARMER" : metaRole || "FARMER";
    }

    // 4. Determine authoritative role-based portal route
    const rolePortals: Record<string, string> = {
      FARMER: "/farmer",
      BUYER: "/buyer",
      ADMIN: "/admin",
      FPO_ADMIN: "/fpo",
      MACHINERY_PROVIDER: "/machinery",
      TRANSPORT_PROVIDER: "/logistics",
      STORAGE_PROVIDER: "/storage",
      EXPERT: "/experts",
    };

    const targetPortal = rolePortals[role] || "/farmer";

    return Response.json({
      success: true,
      session: {
        accessToken: authData.session?.access_token,
        refreshToken: authData.session?.refresh_token,
        expiresAt: authData.session?.expires_at,
      },
      user: {
        id: userId,
        email: authData.user.email,
        fullName,
        role,
        isVerified,
        preferredLanguage: profile?.preferred_language || authData.user.user_metadata?.preferred_language || "en",
        state: profile?.state || "Karnataka",
        district: profile?.district || "Tumakuru",
        village: profile?.village || null,
      },
      targetPortal,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Authentication error.";
    return Response.json({ error: message }, { status: 500 });
  }
}
