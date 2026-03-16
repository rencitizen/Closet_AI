import { NextRequest } from "next/server";
import { ZodError } from "zod";

import { fromZodError, internalServerError, ok } from "@/lib/api";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { requireOwnedItemId } from "@/lib/server/closets";
import { parseJson } from "@/lib/server/request";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { updateItemSchema } from "@/lib/validators/closet";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { user, error: authError } = await requireAuthenticatedUser(_request);

    if (authError) {
      return authError;
    }

    const { id } = await context.params;
    const ownedItem = await requireOwnedItemId(id, user.id);

    if (ownedItem.error) {
      return ownedItem.error;
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("clothing_items")
      .select(`
        *,
        clothing_item_images (*),
        clothing_item_tags (
          tag_id,
          tags (*)
        ),
        purchase_records (*),
        disposal_records (*),
        care_logs (*)
      `)
      .eq("id", id)
      .single();

    if (error) {
      return internalServerError("Failed to fetch item detail", error);
    }

    return ok({ item: data });
  } catch (error) {
    return internalServerError("Failed to fetch item detail", error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { user, error: authError } = await requireAuthenticatedUser(request);

    if (authError) {
      return authError;
    }

    const { id } = await context.params;
    const ownedItem = await requireOwnedItemId(id, user.id);

    if (ownedItem.error) {
      return ownedItem.error;
    }

    const input = await parseJson(request, updateItemSchema);
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("clothing_items")
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return internalServerError("Failed to update item", error);
    }

    if (input.primary_image_url) {
      const resetPrimary = await supabase
        .from("clothing_item_images")
        .update({ is_primary: false })
        .eq("item_id", id)
        .eq("is_primary", true);

      if (resetPrimary.error) {
        return internalServerError("Item updated but failed to reset previous primary image", resetPrimary.error);
      }

      const existingImage = await supabase
        .from("clothing_item_images")
        .select("id")
        .eq("item_id", id)
        .eq("image_url", input.primary_image_url)
        .maybeSingle();

      if (existingImage.error) {
        return internalServerError("Item updated but failed to inspect replacement image metadata", existingImage.error);
      }

      if (existingImage.data?.id) {
        const markPrimary = await supabase
          .from("clothing_item_images")
          .update({ is_primary: true })
          .eq("id", existingImage.data.id);

        if (markPrimary.error) {
          return internalServerError("Item updated but failed to mark replacement image as primary", markPrimary.error);
        }
      } else {
        const imageInsert = await supabase.from("clothing_item_images").insert({
          item_id: id,
          image_url: input.primary_image_url,
          sort_order: 0,
          is_primary: true,
        });

        if (imageInsert.error) {
          return internalServerError("Item updated but failed to save replacement image metadata", imageInsert.error);
        }
      }
    }

    return ok({
      item_id: id,
      item: data,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return fromZodError(error);
    }

    return internalServerError("Item update failed", error);
  }
}
