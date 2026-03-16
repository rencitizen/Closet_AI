import { NextRequest } from "next/server";
import { z, ZodError } from "zod";

import { created, fromZodError, internalServerError, ok } from "@/lib/api";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { requireOwnedClosetId } from "@/lib/server/closets";
import { parseJson } from "@/lib/server/request";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const createSavedFilterSchema = z.object({
  name: z.string().trim().min(1),
  filter_json: z.record(z.string(), z.unknown()),
});

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await requireAuthenticatedUser(request);
    if (authError) return authError;

    const { closetId, error: closetError } = await requireOwnedClosetId(request, user.id);
    if (closetError) return closetError;

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("saved_filters")
      .select("*")
      .eq("closet_id", closetId)
      .order("created_at", { ascending: false });

    if (error) return internalServerError("Failed to fetch saved filters", error);
    return ok({ saved_filters: data ?? [] });
  } catch (error) {
    return internalServerError("Failed to fetch saved filters", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await requireAuthenticatedUser(request);
    if (authError) return authError;

    const input = await parseJson(request, createSavedFilterSchema);
    const { closetId, error: closetError } = await requireOwnedClosetId(request, user.id);
    if (closetError) return closetError;

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("saved_filters")
      .insert({ closet_id: closetId, ...input })
      .select("*")
      .single();

    if (error) return internalServerError("Failed to create saved filter", error);
    return created({ saved_filter: data });
  } catch (error) {
    if (error instanceof ZodError) return fromZodError(error);
    return internalServerError("Failed to create saved filter", error);
  }
}
