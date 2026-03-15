import { NextRequest } from "next/server";

import { unauthorized } from "@/lib/api";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function requireAuthenticatedUser(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return {
      user: null,
      error: unauthorized("Missing Bearer token"),
    };
  }

  const token = authorization.slice("Bearer ".length).trim();
  const supabase = getSupabaseServerClient();
  const result = await supabase.auth.getUser(token);

  if (result.error || !result.data.user) {
    return {
      user: null,
      error: unauthorized("Invalid or expired session"),
    };
  }

  return {
    user: result.data.user,
    error: null,
  };
}
