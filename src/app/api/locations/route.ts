import { NextRequest } from "next/server";
import { z, ZodError } from "zod";

import { created, fromZodError, internalServerError, ok } from "@/lib/api";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { requireOwnedClosetId } from "@/lib/server/closets";
import { parseJson } from "@/lib/server/request";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const createLocationSchema = z.object({
  name: z.string().trim().min(1),
  location_type: z.string().trim().min(1).default("closet"),
  sort_order: z.number().int().min(0).default(0),
});

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await requireAuthenticatedUser(request);
    if (authError) return authError;

    const { closetId, error: closetError } = await requireOwnedClosetId(request, user.id);
    if (closetError) return closetError;

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("locations")
      .select("*")
      .eq("closet_id", closetId)
      .order("sort_order", { ascending: true });

    if (error) return internalServerError("Failed to fetch locations", error);
    return ok({ locations: data ?? [] });
  } catch (error) {
    return internalServerError("Failed to fetch locations", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await requireAuthenticatedUser(request);
    if (authError) return authError;

    const input = await parseJson(request, createLocationSchema);
    const { closetId, error: closetError } = await requireOwnedClosetId(request, user.id);
    if (closetError) return closetError;

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("locations")
      .insert({ closet_id: closetId, ...input })
      .select("*")
      .single();

    if (error) return internalServerError("Failed to create location", error);
    return created({ location: data });
  } catch (error) {
    if (error instanceof ZodError) return fromZodError(error);
    return internalServerError("Failed to create location", error);
  }
}
