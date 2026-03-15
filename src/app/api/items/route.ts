import { NextRequest } from "next/server";
import { ZodError } from "zod";

import { created, fromZodError, internalServerError, ok } from "@/lib/api";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { requireOwnedClosetId } from "@/lib/server/closets";
import { parseJson, parseSearchParams } from "@/lib/server/request";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createItemSchema, itemQuerySchema } from "@/lib/validators/closet";

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await requireAuthenticatedUser(request);

    if (authError) {
      return authError;
    }

    const query = parseSearchParams(request, itemQuerySchema);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { closetId, error: closetError } = await requireOwnedClosetId(request, user.id);

    if (closetError) {
      return closetError;
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const supabase = getSupabaseServerClient();

    let builder = supabase
      .from("clothing_items")
      .select("*", { count: "exact" })
      .eq("closet_id", closetId)
      .range(from, to);

    if (!query.include_archived) {
      builder = builder.neq("status", "archived");
    }

    if (query.category) builder = builder.eq("category", query.category);
    if (query.status) builder = builder.eq("status", query.status);
    if (query.color) builder = builder.eq("color", query.color);
    if (query.brand) builder = builder.eq("brand", query.brand);
    if (query.location_id) builder = builder.eq("location_id", query.location_id);
    if (query.season) builder = builder.contains("season_tags", [query.season]);
    if (query.q) builder = builder.or(`name.ilike.%${query.q}%,brand.ilike.%${query.q}%,notes.ilike.%${query.q}%`);

    if (query.sort === "last_worn_at") {
      builder = builder.order("last_worn_at", { ascending: false, nullsFirst: false });
    } else if (query.sort === "wear_count") {
      builder = builder.order("wear_count", { ascending: false });
    } else {
      builder = builder.order("created_at", { ascending: false });
    }

    const { data, error, count } = await builder;

    if (error) {
      return internalServerError("Failed to fetch items", error);
    }

    return ok({
      items: data ?? [],
      page,
      limit,
      total: count ?? 0,
      filters: query,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return fromZodError(error);
    }

    return internalServerError("Failed to fetch items", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await requireAuthenticatedUser(request);

    if (authError) {
      return authError;
    }

    const input = await parseJson(request, createItemSchema);
    const { closetId, error: closetError } = await requireOwnedClosetId(request, user.id);

    if (closetError) {
      return closetError;
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("clothing_items")
      .insert({
        closet_id: closetId,
        ...input,
      })
      .select("*")
      .single();

    if (error) {
      return internalServerError("Failed to create item", error);
    }

    return created({
      item: data,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return fromZodError(error);
    }

    return internalServerError("Item creation failed", error);
  }
}
