import { NextRequest } from "next/server";

import { internalServerError, ok } from "@/lib/api";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { requireOwnedClosetId } from "@/lib/server/closets";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await requireAuthenticatedUser(request);
    if (authError) return authError;

    const { closetId, error: closetError } = await requireOwnedClosetId(request, user.id);
    if (closetError) return closetError;

    const supabase = getSupabaseServerClient();
    const { data: items, error: itemsError } = await supabase
      .from("clothing_items")
      .select("id, status, purchase_price, last_worn_at, primary_image_url")
      .eq("closet_id", closetId);

    if (itemsError) return internalServerError("Failed to fetch dashboard items", itemsError);

    const { data: outfits, error: outfitsError } = await supabase
      .from("outfits")
      .select("id")
      .eq("closet_id", closetId);

    if (outfitsError) return internalServerError("Failed to fetch dashboard outfits", outfitsError);

    const { data: wearLogs, error: wearLogsError } = await supabase
      .from("wear_logs")
      .select("id, worn_on")
      .eq("closet_id", closetId)
      .order("worn_on", { ascending: false })
      .limit(10);

    if (wearLogsError) return internalServerError("Failed to fetch dashboard wear logs", wearLogsError);

    const totalSpent = (items ?? []).reduce((sum, item) => sum + Number(item.purchase_price ?? 0), 0);
    const activeCount = (items ?? []).filter((item) => item.status === "active").length;
    const careCount = (items ?? []).filter((item) => item.status === "in_cleaning" || item.status === "in_laundry").length;
    const unwornCount = (items ?? []).filter((item) => !item.last_worn_at).length;

    return ok({
      stats: {
        total_items: items?.length ?? 0,
        active_items: activeCount,
        care_items: careCount,
        unworn_items: unwornCount,
        total_spent: totalSpent,
        outfit_count: outfits?.length ?? 0,
      },
      recent_wear_logs: wearLogs ?? [],
    });
  } catch (error) {
    return internalServerError("Failed to fetch dashboard", error);
  }
}
