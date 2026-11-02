import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Server-only privileged Supabase client powered by the service role key.
 * Used exclusively for executing atomic RPC functions and administrative operations
 * after explicit server-side session authorization.
 *
 * NEVER import this file into client components ("use client").
 */
export function getServiceSupabase() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://gnypyybrresuynparioj.supabase.co";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not configured on the server."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
