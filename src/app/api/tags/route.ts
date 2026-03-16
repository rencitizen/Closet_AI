import { NextRequest } from "next/server";
import { z, ZodError } from "zod";

import { created, fromZodError, internalServerError, ok } from "@/lib/api";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { requireOwnedClosetId } from "@/lib/server/closets";
import { parseJson } from "@/lib/server/request";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const createTagSchema = z.object({
  name: z.string().trim().min(1),
  color: z.string().trim().min(1).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await requireAuthenticatedUser(request);
    if (authError) return authError;

    const { closetId, error: closetError } = await requireOwnedClosetId(request, user.id);
    if (closetError) return closetError;

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.from("tags").select("*").eq("closet_id", closetId).order("name");

    if (error) return internalServerError("Failed to fetch tags", error);
    return ok({ tags: data ?? [] });
  } catch (error) {
    return internalServerError("Failed to fetch tags", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await requireAuthenticatedUser(request);
    if (authError) return authError;

    const input = await parseJson(request, createTagSchema);
    const { closetId, error: closetError } = await requireOwnedClosetId(request, user.id);
    if (closetError) return closetError;

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("tags")
      .insert({ closet_id: closetId, ...input })
      .select("*")
      .single();

    if (error) return internalServerError("Failed to create tag", error);
    return created({ tag: data });
  } catch (error) {
    if (error instanceof ZodError) return fromZodError(error);
    return internalServerError("Failed to create tag", error);
  }
}
