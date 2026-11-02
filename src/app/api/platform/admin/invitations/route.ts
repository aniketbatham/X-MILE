import { NextRequest } from "next/server";
import { verifyServerSession } from "@/lib/server-auth";
import { supabase } from "@/lib/supabase";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  const session = await verifyServerSession(request);
  if (!session.isAdmin) {
    return Response.json(
      { error: "Forbidden: Verified Administrator privileges required.", code: "ADMIN_REQUIRED" },
      { status: 403 }
    );
  }

  try {
    const { data: invitations, error } = await supabase
      .from("admin_invitations")
      .select("id, email, status, token_prefix, expires_at, created_at, accepted_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error && error.code !== "42P01" && error.code !== "PGRST205") {
      throw error;
    }

    return Response.json({
      success: true,
      invitations: invitations || [],
      migrationPending: error?.code === "42P01" || error?.code === "PGRST205",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch admin invitations.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await verifyServerSession(request);
  if (!session.isAdmin) {
    return Response.json(
      { error: "Forbidden: Verified Administrator privileges required to issue invitations.", code: "ADMIN_REQUIRED" },
      { status: 403 }
    );
  }

  let body: { email?: string; note?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return Response.json({ error: "Valid email address is required for admin invitation." }, { status: 400 });
  }

  // Generate single-use, time-limited token (48 hour validity)
  const rawInvitationToken = `adm_inv_${crypto.randomBytes(24).toString("hex")}`;
  // Store only the SHA-256 hash of the token to prevent exposure via database read
  const tokenHash = crypto.createHash("sha256").update(rawInvitationToken).digest("hex");
  const tokenPrefix = rawInvitationToken.substring(0, 16) + "...";
  const expiresAt = new Date(Date.now() + 48 * 3600 * 1000).toISOString();

  const invitationRecord = {
    email,
    invited_by: session.profileId && session.profileId.startsWith("admin-") ? null : session.profileId,
    invitation_token_hash: tokenHash,
    token_prefix: tokenPrefix,
    status: "PENDING",
    expires_at: expiresAt,
    created_at: new Date().toISOString(),
  };

  try {
    // 1. Insert into admin_invitations
    const { data, error } = await supabase
      .from("admin_invitations")
      .insert(invitationRecord)
      .select("id, email, status, token_prefix, expires_at, created_at")
      .single();

    // 2. Audit log entry ONLY after successful insert
    if (!error && data) {
      await supabase.from("admin_audit_logs").insert({
        admin_id: session.profileId && session.profileId.startsWith("admin-") ? null : session.profileId,
        action: "ADMIN_INVITATION_CREATED",
        entity_type: "ADMIN_INVITATION",
        entity_id: data.id,
        new_state: { email, tokenPrefix, expiresAt, status: "PENDING" },
        reason: body.note || "Administrator invitation issued by authorized supervisor",
        ip_address: request.headers.get("x-forwarded-for") || "127.0.0.1",
        created_at: new Date().toISOString(),
      });
    }

    return Response.json({
      success: true,
      message: `Admin invitation created for ${email}. Valid for 48 hours.`,
      invitationId: data?.id || `sim-${Date.now()}`,
      email,
      expiresAt,
      tokenPrefix,
      // The raw invitation token is delivered ONLY ONCE in the response to the issuing administrator
      invitationToken: rawInvitationToken,
      migrationPending: error?.code === "42P01" || error?.code === "PGRST205",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to record admin invitation.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
