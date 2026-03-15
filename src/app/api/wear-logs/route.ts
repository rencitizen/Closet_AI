import { NextRequest } from "next/server";
import { ZodError } from "zod";

import { created, fromZodError, internalServerError, ok } from "@/lib/api";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { requireOwnedClosetId } from "@/lib/server/closets";
import { parseJson } from "@/lib/server/request";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createWearLogSchema } from "@/lib/validators/closet";

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await requireAuthenticatedUser(request);

    if (authError) {
      return authError;
    }

    const { closetId, error: closetError } = await requireOwnedClosetId(request, user.id);

    if (closetError) {
      return closetError;
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("wear_logs")
      .select("*, wear_log_items (*)")
      .eq("closet_id", closetId)
      .order("worn_on", { ascending: false });

    if (error) {
      return internalServerError("Failed to fetch wear logs", error);
    }

    return ok({
      wear_logs: data ?? [],
      total: data?.length ?? 0,
    });
  } catch (error) {
    return internalServerError("Failed to fetch wear logs", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await requireAuthenticatedUser(request);

    if (authError) {
      return authError;
    }

    const input = await parseJson(request, createWearLogSchema);
    const { closetId, error: closetError } = await requireOwnedClosetId(request, user.id);

    if (closetError) {
      return closetError;
    }

    const supabase = getSupabaseServerClient();
    const wearLogInsert = await supabase
      .from("wear_logs")
      .insert({
        closet_id: closetId,
        worn_on: input.worn_on,
        outfit_id: input.outfit_id ?? null,
        notes: input.notes,
      })
      .select("*")
      .single();

    if (wearLogInsert.error || !wearLogInsert.data) {
      return internalServerError("Failed to create wear log", wearLogInsert.error);
    }

    const wearLogItems = input.item_ids.map((itemId) => ({
      wear_log_id: wearLogInsert.data.id,
      item_id: itemId,
    }));

    const wearLogItemsInsert = await supabase.from("wear_log_items").insert(wearLogItems).select("*");

    if (wearLogItemsInsert.error) {
      return internalServerError("Failed to create wear log items", wearLogItemsInsert.error);
    }

    const itemUpdates = await Promise.all(
      input.item_ids.map(async (itemId) => {
        const current = await supabase
          .from("clothing_items")
          .select("id, wear_count")
          .eq("id", itemId)
          .single();

        if (current.error || !current.data) {
          throw new Error(`Failed to fetch item ${itemId} for wear count update`);
        }

        const updated = await supabase
          .from("clothing_items")
          .update({
            wear_count: current.data.wear_count + 1,
            last_worn_at: input.worn_on,
            updated_at: new Date().toISOString(),
          })
          .eq("id", itemId)
          .select("id, wear_count, last_worn_at")
          .single();

        if (updated.error) {
          throw new Error(`Failed to update item ${itemId} wear state`);
        }

        return updated.data;
      }),
    );

    return created({
      wear_log: wearLogInsert.data,
      wear_log_items: wearLogItemsInsert.data ?? [],
      updated_items: itemUpdates,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return fromZodError(error);
    }

    return internalServerError("Failed to create wear log", error);
  }
}
