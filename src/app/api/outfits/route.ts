import { NextRequest } from "next/server";
import { ZodError } from "zod";

import { created, fromZodError, internalServerError, ok } from "@/lib/api";
import { requireClosetId } from "@/lib/server/closet-context";
import { parseJson } from "@/lib/server/request";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createOutfitSchema } from "@/lib/validators/closet";

export async function GET(request: NextRequest) {
  try {
    const { closetId, error: closetError } = requireClosetId(request);

    if (closetError) {
      return closetError;
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("outfits")
      .select("*, outfit_items (*)")
      .eq("closet_id", closetId)
      .order("created_at", { ascending: false });

    if (error) {
      return internalServerError("Failed to fetch outfits", error);
    }

    return ok({
      outfits: data ?? [],
      total: data?.length ?? 0,
    });
  } catch (error) {
    return internalServerError("Failed to fetch outfits", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const input = await parseJson(request, createOutfitSchema);
    const { closetId, error: closetError } = requireClosetId(request);

    if (closetError) {
      return closetError;
    }

    const supabase = getSupabaseServerClient();
    const outfitInsert = await supabase
      .from("outfits")
      .insert({
        closet_id: closetId,
        name: input.name,
        season_tags: input.season_tags,
        occasion_tags: input.occasion_tags,
        rating: input.rating,
        is_favorite: input.is_favorite,
        notes: input.notes,
      })
      .select("*")
      .single();

    if (outfitInsert.error || !outfitInsert.data) {
      return internalServerError("Failed to create outfit", outfitInsert.error);
    }

    const outfitItems = input.item_ids.map((itemId, index) => ({
      outfit_id: outfitInsert.data.id,
      item_id: itemId,
      sort_order: index,
    }));

    const outfitItemsInsert = await supabase.from("outfit_items").insert(outfitItems).select("*");

    if (outfitItemsInsert.error) {
      return internalServerError("Failed to create outfit items", outfitItemsInsert.error);
    }

    return created({
      outfit: outfitInsert.data,
      outfit_items: outfitItemsInsert.data ?? [],
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return fromZodError(error);
    }

    return internalServerError("Failed to create outfit", error);
  }
}
