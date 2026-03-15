import { NextRequest } from "next/server";

import { badRequest, unauthorized } from "@/lib/api";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function requireOwnedClosetId(request: NextRequest, userId: string) {
  const closetId = request.headers.get("x-closet-id") ?? request.nextUrl.searchParams.get("closet_id");

  if (!closetId) {
    return {
      closetId: null,
      error: badRequest("Missing x-closet-id header or closet_id query parameter"),
    };
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("closets")
    .select("id")
    .eq("id", closetId)
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return {
      closetId: null,
      error: unauthorized("Closet does not belong to the authenticated user"),
    };
  }

  return {
    closetId,
    error: null,
  };
}

export async function requireOwnedItemId(itemId: string, userId: string) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("clothing_items")
    .select("id, closet_id, closets!inner(user_id)")
    .eq("id", itemId)
    .eq("closets.user_id", userId)
    .single();

  if (error || !data) {
    return {
      item: null,
      error: unauthorized("Item does not belong to the authenticated user"),
    };
  }

  return {
    item: data,
    error: null,
  };
}
