import { NextRequest } from "next/server";
import { verifyServerSession, getAuthenticatedClient } from "@/lib/server-auth";
import { supabase as anonClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const session = await verifyServerSession(request);

  if (!session.isAuthenticated || !session.userId) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  const client = session.token ? getAuthenticatedClient(session.token) : anonClient;

  try {
    const { data: profile, error } = await client
      .from("profiles")
      .select("*")
      .eq("id", session.userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!profile) {
      return Response.json({ error: "Profile not found." }, { status: 404 });
    }

    return Response.json({
      success: true,
      profile,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load profile.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await verifyServerSession(request);

  if (!session.isAuthenticated || !session.userId) {
    return Response.json({ error: "Authentication required to update profile." }, { status: 401 });
  }

  let body: {
    fullName?: string;
    phone?: string;
    preferredLanguage?: string;
    state?: string;
    district?: string;
    village?: string;
    notificationPreferences?: { sms?: boolean; push?: boolean; email?: boolean };
  };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.fullName !== undefined) updates.full_name = body.fullName.trim();
  if (body.phone !== undefined) updates.phone = body.phone ? body.phone.trim() : null;
  if (body.preferredLanguage !== undefined) updates.preferred_language = body.preferredLanguage;
  if (body.state !== undefined) updates.state = body.state;
  if (body.district !== undefined) updates.district = body.district;
  if (body.village !== undefined) updates.village = body.village ? body.village.trim() : null;
  if (body.notificationPreferences !== undefined) updates.notification_preferences = body.notificationPreferences;

  try {
    const client = session.token ? getAuthenticatedClient(session.token) : anonClient;
    const { data, error } = await client
      .from("profiles")
      .update(updates)
      .eq("id", session.userId)
      .select()
      .maybeSingle();

    if (error) {
      throw error;
    }

    return Response.json({
      success: true,
      message: "Profile updated successfully.",
      profile: data,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update profile.";
    return Response.json({ error: message }, { status: 500 });
  }
}
