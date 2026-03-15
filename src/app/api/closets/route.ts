import { NextRequest } from "next/server";
import { ZodError, z } from "zod";

import { created, fromZodError, internalServerError, ok } from "@/lib/api";
import { parseJson } from "@/lib/server/request";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const createClosetSchema = z.object({
  user_id: z.string().uuid(),
  name: z.string().trim().min(1).default("My Closet"),
  timezone: z.string().trim().min(1).default("Asia/Tokyo"),
  currency: z.string().trim().min(1).default("JPY"),
});

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.from("closets").select("*").order("created_at", { ascending: false });

    if (error) {
      return internalServerError("Failed to fetch closets", error);
    }

    return ok({ closets: data ?? [] });
  } catch (error) {
    return internalServerError("Failed to initialize Supabase client", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const input = await parseJson(request, createClosetSchema);
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.from("closets").insert(input).select("*").single();

    if (error) {
      return internalServerError("Failed to create closet", error);
    }

    return created({ closet: data });
  } catch (error) {
    if (error instanceof ZodError) {
      return fromZodError(error);
    }

    return internalServerError("Failed to create closet", error);
  }
}
