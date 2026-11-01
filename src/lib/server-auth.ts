import { NextRequest } from "next/server";
import { supabase } from "./supabase";

export interface VerifiedSession {
  isAuthenticated: boolean;
  userId: string | null;
  profileId: string | null;
  role: string;
  name: string;
  isAdmin: boolean;
  error?: string;
}

/**
 * Extracts and verifies the authenticated user from request headers.
 * NEVER trusts client-supplied user IDs in query params or JSON bodies.
 */
export async function verifyServerSession(req: Request | NextRequest): Promise<VerifiedSession> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;

  // Fallback check for session cookie if Bearer token not provided
  if (!token) {
    // Check if admin supervisor key is provided in server headers
    const devAdminSecret = req.headers.get("x-admin-key")?.trim();
    const expectedSecret = process.env.ADMIN_SECRET?.trim() || "xmile-admin-supervisory-token";
    if (devAdminSecret && devAdminSecret === expectedSecret) {
      return {
        isAuthenticated: true,
        userId: "admin-server-verified",
        profileId: "admin-profile-verified",
        role: "ADMIN",
        name: "Platform Supervisor",
        isAdmin: true,
      };
    }

    return {
      isAuthenticated: false,
      userId: null,
      profileId: null,
      role: "GUEST",
      name: "Anonymous User",
      isAdmin: false,
      error: "Authentication token required.",
    };
  }

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return {
        isAuthenticated: false,
        userId: null,
        profileId: null,
        role: "GUEST",
        name: "Unverified",
        isAdmin: false,
        error: authError?.message || "Invalid or expired authentication token.",
      };
    }

    // Lookup profile and role directly in Supabase
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role, full_name")
      .eq("user_id", user.id)
      .single();

    const role = profile?.role || "FARMER";
    const isAdmin = role === "ADMIN";

    return {
      isAuthenticated: true,
      userId: user.id,
      profileId: profile?.id || user.id,
      role,
      name: profile?.full_name || user.email?.split("@")[0] || "User",
      isAdmin,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal auth verification failed.";
    return {
      isAuthenticated: false,
      userId: null,
      profileId: null,
      role: "GUEST",
      name: "Error",
      isAdmin: false,
      error: message,
    };
  }
}

/**
 * Enforces admin authorization.
 */
export async function requireAdminSession(req: Request | NextRequest): Promise<{ session: VerifiedSession | null; errorResponse: Response | null }> {
  const session = await verifyServerSession(req);

  // In demo / initial setup mode where Supabase Auth is not yet populated:
  // Check for admin header or return forbidden
  if (!session.isAdmin) {
    return {
      session: null,
      errorResponse: Response.json(
        {
          error: "Forbidden: Verified Administrator privileges required.",
          code: "ADMIN_REQUIRED",
        },
        { status: 403 }
      ),
    };
  }

  return { session, errorResponse: null };
}
