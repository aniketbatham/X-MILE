import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import crypto from "crypto";

const PUBLIC_ALLOWED_ROLES = new Set([
  "FARMER",
  "BUYER",
  "FPO_ADMIN",
  "MACHINERY_PROVIDER",
  "TRANSPORT_PROVIDER",
  "STORAGE_PROVIDER",
  "EXPERT",
]);

export async function POST(request: NextRequest) {
  let body: {
    email?: string;
    password?: string;
    fullName?: string;
    phone?: string;
    role?: string;
    preferredLanguage?: string;
    adminInvitationToken?: string;
    state?: string;
    district?: string;
  };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  const fullName = body.fullName?.trim();
  const rawRole = (body.role || "FARMER").toUpperCase();
  const preferredLanguage = body.preferredLanguage || "en";
  const state = body.state || "Karnataka";
  const district = body.district || "Tumakuru";

  if (!email || !email.includes("@")) {
    return Response.json({ error: "A valid email address is required." }, { status: 400 });
  }

  if (!fullName) {
    return Response.json({ error: "Full name is required." }, { status: 400 });
  }

  // 1. Role Authorization Security Check
  const assignedRole = rawRole;
  let isVerified = false;
  let validatedInvitationId: string | null = null;

  if (assignedRole === "ADMIN") {
    // Strictly require and validate single-use, time-limited invitation token
    if (!body.adminInvitationToken) {
      return Response.json(
        {
          error: "Unauthorized: Public Administrator registration is prohibited. An authorized invitation token is required.",
          code: "ADMIN_INVITATION_REQUIRED",
        },
        { status: 403 }
      );
    }

    const tokenHash = crypto.createHash("sha256").update(body.adminInvitationToken.trim()).digest("hex");

    // Atomic conditional redemption check: prevents concurrent race conditions
    const { data: inv, error: invError } = await supabase
      .from("admin_invitations")
      .select("*")
      .eq("invitation_token_hash", tokenHash)
      .eq("status", "PENDING")
      .single();

    if (invError || !inv) {
      return Response.json(
        {
          error: "Forbidden: Invalid or already redeemed administrator invitation token.",
          code: "INVALID_ADMIN_INVITATION",
        },
        { status: 403 }
      );
    }

    if (new Date(inv.expires_at).getTime() < Date.now()) {
      return Response.json(
        {
          error: "Forbidden: Administrator invitation token has expired.",
          code: "EXPIRED_ADMIN_INVITATION",
        },
        { status: 403 }
      );
    }

    if (inv.email.trim().toLowerCase() !== email) {
      return Response.json(
        {
          error: "Forbidden: This invitation was issued for a different email address.",
          code: "INVITATION_EMAIL_MISMATCH",
        },
        { status: 403 }
      );
    }

    validatedInvitationId = inv.id;
    isVerified = true;
  } else if (!PUBLIC_ALLOWED_ROLES.has(assignedRole)) {
    return Response.json(
      {
        error: `Invalid role '${assignedRole}'. Must be one of: ${[...PUBLIC_ALLOWED_ROLES].join(", ")}`,
        code: "INVALID_ROLE",
      },
      { status: 400 }
    );
  }

  // Experts and FPO Admins require credential review before is_verified = true
  if (assignedRole === "EXPERT" || assignedRole === "FPO_ADMIN") {
    isVerified = false;
  }

  // 2. Register User in Supabase Auth if password provided
  let authUserId: string | null = null;
  let userSessionToken: string | null = null;
  let emailConfirmationRequired = false;

  if (password && password.length >= 6) {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: assignedRole,
          preferred_language: preferredLanguage,
          state,
          district,
        },
      },
    });

    if (authError) {
      const errorMsg = (authError.message || "").toLowerCase();
      const isRateLimit =
        authError.status === 429 ||
        errorMsg.includes("rate limit") ||
        errorMsg.includes("over_email_send_rate_limit") ||
        errorMsg.includes("for security purposes, you can only request this");

      if (isRateLimit) {
        return Response.json(
          {
            success: false,
            error:
              "The email verification service has temporarily reached its sending limit. If you already registered or requested a link, please check your inbox (and spam folder). Otherwise, please wait a minute before trying again.",
            code: "EMAIL_RATE_LIMIT_EXCEEDED",
          },
          { status: 429 }
        );
      }

      const isAlreadyExists =
        authError.status === 422 ||
        errorMsg.includes("already registered") ||
        errorMsg.includes("already exists") ||
        errorMsg.includes("user already exists");

      if (isAlreadyExists) {
        return Response.json(
          {
            success: false,
            error: "An account with this email address already exists. Please sign in instead.",
            code: "USER_ALREADY_EXISTS",
          },
          { status: 409 }
        );
      }

      return Response.json({ success: false, error: authError.message }, { status: 400 });
    }

    // Modern Supabase user enumeration prevention:
    // If user already exists, signUp returns an empty identities array with no error
    if (authData.user && authData.user.identities && authData.user.identities.length === 0) {
      return Response.json(
        {
          success: false,
          error: "An account with this email address already exists. Please sign in instead.",
          code: "USER_ALREADY_EXISTS",
        },
        { status: 409 }
      );
    }

    authUserId = authData.user?.id || null;
    userSessionToken = authData.session?.access_token || null;
    // When email verification is required by Supabase Auth, session is null
    emailConfirmationRequired = !authData.session;
  }

  const profileId = authUserId || crypto.randomUUID();

  // 3. Upsert Profile into profiles table (1:1 Unified Identity: id = auth.users.id)
  // When an authenticated session is returned by signUp, execute with the user's token context.
  // When email confirmation is required, the Postgres trigger `on_auth_user_created` (SECURITY DEFINER)
  // automatically inserts the profile with the user's metadata.
  if (userSessionToken && authUserId) {
    const { createClient } = await import("@supabase/supabase-js");
    const authedClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "placeholder",
      {
        global: {
          headers: {
            Authorization: `Bearer ${userSessionToken}`,
          },
        },
      }
    );

    const profileRecord = {
      id: profileId,
      full_name: fullName,
      email,
      phone: body.phone || null,
      role: assignedRole,
      preferred_language: preferredLanguage,
      state,
      district,
      is_verified: isVerified,
      updated_at: new Date().toISOString(),
    };

    const { error: profileError } = await authedClient
      .from("profiles")
      .upsert(profileRecord, { onConflict: "id" });

    if (profileError) {
      return Response.json(
        { error: `Database error while establishing profile: ${profileError.message}` },
        { status: 500 }
      );
    }
  }

  // 4. Atomic Invitation Consumption: acquire row lock and mark ACCEPTED
  if (assignedRole === "ADMIN" && body.adminInvitationToken) {
    const tokenHash = crypto.createHash("sha256").update(body.adminInvitationToken.trim()).digest("hex");

    const { data: updatedInv, error: updateError } = await supabase
      .from("admin_invitations")
      .update({
        status: "ACCEPTED",
        accepted_at: new Date().toISOString(),
        accepted_by: profileId,
      })
      .eq("invitation_token_hash", tokenHash)
      .eq("status", "PENDING")
      .select()
      .maybeSingle();

    if (!updateError && updatedInv) {
      // Audit log only after successful atomic update
      await supabase.from("admin_audit_logs").insert({
        admin_id: profileId,
        action: "ADMIN_INVITATION_ACCEPTED",
        entity_type: "ADMIN_INVITATION",
        entity_id: validatedInvitationId || profileId,
        new_state: { email, role: "ADMIN", status: "ACCEPTED" },
        reason: "Administrator account activated via verified single-use token",
        ip_address: request.headers.get("x-forwarded-for") || "127.0.0.1",
        created_at: new Date().toISOString(),
      });
    }
  }

  return Response.json({
    success: true,
    emailConfirmationRequired,
    message: emailConfirmationRequired
      ? `A verification email has been sent to ${email}. Please check your inbox and verify your email before signing in.`
      : `Account created successfully with role ${assignedRole}.`,
    user: {
      id: profileId,
      email,
      fullName,
      role: assignedRole,
      isVerified,
      preferredLanguage,
    },
  });
}
