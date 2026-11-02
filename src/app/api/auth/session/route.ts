import { NextRequest } from "next/server";
import { verifyServerSession, getAuthenticatedClient } from "@/lib/server-auth";
import { supabase as anonClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const session = await verifyServerSession(request);

  if (!session.isAuthenticated || !session.userId) {
    return Response.json(
      {
        isAuthenticated: false,
        user: null,
        error: session.error || "No active session.",
      },
      { status: 401 }
    );
  }

  const client = session.token ? getAuthenticatedClient(session.token) : anonClient;

  // Fetch full profile and default address
  const [profileResult, addressResult] = await Promise.all([
    client
      .from("profiles")
      .select("id, full_name, email, phone, role, preferred_language, state, district, village, is_verified, notification_preferences")
      .eq("id", session.userId)
      .maybeSingle(),
    client
      .from("user_addresses")
      .select("*")
      .eq("user_id", session.userId)
      .eq("is_default", true)
      .maybeSingle(),
  ]);

  const profile = profileResult.data;
  const defaultAddress = addressResult.data;

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

  return Response.json({
    isAuthenticated: true,
    user: {
      id: session.userId,
      email: profile?.email || null,
      fullName: profile?.full_name || session.name,
      role: session.role,
      isAdmin: session.isAdmin,
      isVerified: session.isVerified,
      preferredLanguage: profile?.preferred_language || "en",
      state: profile?.state || "Karnataka",
      district: profile?.district || "Tumakuru",
      village: profile?.village || null,
      notificationPreferences: profile?.notification_preferences || { sms: true, push: true, email: false },
      defaultAddress: defaultAddress || null,
    },
    targetPortal: rolePortals[session.role] || "/farmer",
  });
}
