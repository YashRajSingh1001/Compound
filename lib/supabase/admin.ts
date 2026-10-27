import "server-only";

import { createClient } from "@supabase/supabase-js";

// Service-role client: skips Row Level Security, so every query made with it
// must filter on user_id itself. Only for places with no logged-in session
// (the MCP server). Never import this into client code.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service credentials are not set");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
