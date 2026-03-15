import { NextRequest } from "next/server";
import { ZodError } from "zod";

import { created, fromZodError, internalServerError, ok } from "@/lib/api";
import { requireClosetId } from "@/lib/server/closet-context";
import { parseJson } from "@/lib/server/request";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createCareLogSchema } from "@/lib/validators/closet";

export async function GET(request: NextRequest) {
  try {
    const { closetId, error: closetError } = requireClosetId(request);

    if (closetError) {
      return closetError;
    }

    const supabase = getSupabaseServerClient();
    const itemsResult = await supabase.from("clothing_items").select("id").eq("closet_id", closetId);

    if (itemsResult.error) {
      return internalServerError("Failed to fetch closet items", itemsResult.error);
    }

    const itemIds = (itemsResult.data ?? []).map((item) => item.id);

    if (itemIds.length === 0) {
      return ok({ care_logs: [], total: 0 });
    }

    const { data, error } = await supabase
      .from("care_logs")
      .select("*")
      .in("item_id", itemIds)
      .order("cared_on", { ascending: false });

    if (error) {
      return internalServerError("Failed to fetch care logs", error);
    }

    return ok({
      care_logs: data ?? [],
      total: data?.length ?? 0,
    });
  } catch (error) {
    return internalServerError("Failed to fetch care logs", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const input = await parseJson(request, createCareLogSchema);
    const { closetId, error: closetError } = requireClosetId(request);

    if (closetError) {
      return closetError;
    }

    const supabase = getSupabaseServerClient();
    const itemCheck = await supabase
      .from("clothing_items")
      .select("id, closet_id")
      .eq("id", input.item_id)
      .eq("closet_id", closetId)
      .single();

    if (itemCheck.error || !itemCheck.data) {
      return internalServerError("Target item was not found in the specified closet", itemCheck.error);
    }

    const careLogInsert = await supabase.from("care_logs").insert(input).select("*").single();

    if (careLogInsert.error || !careLogInsert.data) {
      return internalServerError("Failed to create care log", careLogInsert.error);
    }

    const nextStatus = input.status === "done" ? "active" : "in_cleaning";
    const itemUpdate = await supabase
      .from("clothing_items")
      .update({
        last_cared_at: input.cared_on,
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.item_id)
      .select("id, status, last_cared_at")
      .single();

    if (itemUpdate.error) {
      return internalServerError("Failed to update item care state", itemUpdate.error);
    }

    return created({
      care_log: careLogInsert.data,
      item: itemUpdate.data,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return fromZodError(error);
    }

    return internalServerError("Failed to create care log", error);
  }
}
