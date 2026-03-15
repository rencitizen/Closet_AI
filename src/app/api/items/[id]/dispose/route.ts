import { NextRequest } from "next/server";
import { ZodError } from "zod";

import { created, fromZodError, internalServerError } from "@/lib/api";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { requireOwnedItemId } from "@/lib/server/closets";
import { parseJson } from "@/lib/server/request";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { disposeItemSchema } from "@/lib/validators/closet";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
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

    const input = await parseJson(request, disposeItemSchema);
    const supabase = getSupabaseServerClient();
    const disposalInsert = await supabase
      .from("disposal_records")
      .upsert({
        item_id: id,
        ...input,
      })
      .select("*")
      .single();

    if (disposalInsert.error) {
      return internalServerError("Failed to record disposal", disposalInsert.error);
    }

    const itemUpdate = await supabase
      .from("clothing_items")
      .update({
        status: "disposed",
        disposed_at: `${input.disposed_on}T00:00:00.000Z`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (itemUpdate.error) {
      return internalServerError("Failed to update disposed item", itemUpdate.error);
    }

    return created({
      item_id: id,
      disposal_record: disposalInsert.data,
      item: itemUpdate.data,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return fromZodError(error);
    }

    return internalServerError("Item disposal failed", error);
  }
}
