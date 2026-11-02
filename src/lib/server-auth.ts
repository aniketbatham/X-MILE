import { NextRequest } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export interface VerifiedSession {
  isAuthenticated: boolean;
  userId: string | null;
  profileId: string | null;
  role: string;
  name: string;
  isAdmin: boolean;
  isVerified: boolean;
  token: string | null;
  error?: string;
}

/**
 * Creates an authenticated Supabase client scoping RLS to the authenticated user.
 */
export function getAuthenticatedClient(token: string): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL is not configured on the server.");
  }
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

/**
 * Extracts and verifies the authenticated user from request headers.
 * NEVER trusts client-supplied user IDs in query params or JSON bodies.
 */
export async function verifyServerSession(req: Request | NextRequest): Promise<VerifiedSession> {
  const authHeader = req.headers.get("authorization");
  let token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;

  // Fallback to cookie check if Bearer header was not set
  if (!token && "cookies" in req) {
    const cookieHeader = req.headers.get("cookie") || "";
    const match = cookieHeader.match(/sb-[a-z0-9]+-auth-token=([^;]+)/i);
    if (match) {
      try {
        const decoded = decodeURIComponent(match[1]);
        const parsed = JSON.parse(decoded);
        token = parsed?.access_token || (Array.isArray(parsed) ? parsed[0] : null);
      } catch {
        // ignore parse error
      }
    }
  }

  // If Bearer token is provided, verify against Supabase Auth (Primary Path)
  if (token) {
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
          isVerified: false,
          token: null,
          error: authError?.message || "Invalid or expired authentication token.",
        };
      }

      // Lookup profile and role directly in Supabase using authenticated client so RLS (id = auth.uid()) passes
      const authClient = getAuthenticatedClient(token);
      const { data: profile, error: profileError } = await authClient
        .from("profiles")
        .select("id, role, full_name, is_verified")
        .eq("id", user.id)
        .maybeSingle();

      // Fail-closed security rule: Missing or erroring profiles must NEVER silently default to FARMER
      if (profileError || !profile) {
        return {
          isAuthenticated: false,
          userId: user.id,
          profileId: null,
          role: "GUEST",
          name: user.email?.split("@")[0] || "Unregistered User",
          isAdmin: false,
          isVerified: false,
          token: null,
          error: "User profile not found or database unavailable. Complete account registration.",
        };
      }

      const role = profile.role;
      const isAdmin = role === "ADMIN";
      const isVerified = Boolean(profile.is_verified);

      return {
        isAuthenticated: true,
        userId: user.id,
        profileId: profile.id,
        role,
        name: profile.full_name || user.email?.split("@")[0] || "User",
        isAdmin,
        isVerified,
        token,
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
        isVerified: false,
        token: null,
        error: message,
      };
    }
  }

  // Cryptographic Auth Enforcement: All public & procurement endpoints require verified Supabase JWTs.
  // Static header key bypasses (x-admin-key) are strictly prohibited.
  return {
    isAuthenticated: false,
    userId: null,
    profileId: null,
    role: "GUEST",
    name: "Anonymous User",
    isAdmin: false,
    isVerified: false,
    token: null,
    error: "Authentication required. Please sign in with an authorized account.",
  };
}

/**
 * Enforces admin authorization.
 */
export async function requireAdminSession(req: Request | NextRequest): Promise<{ session: VerifiedSession | null; errorResponse: Response | null }> {
  const session = await verifyServerSession(req);

  if (!session.isAdmin || !session.isVerified) {
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
