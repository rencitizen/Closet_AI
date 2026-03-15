import { NextRequest } from "next/server";
import { z, ZodError } from "zod";

import { created, fromZodError, internalServerError } from "@/lib/api";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { requireOwnedClosetId } from "@/lib/server/closets";
import { parseJson } from "@/lib/server/request";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const uploadItemImageSchema = z.object({
  image_data_url: z.string().min(1),
  filename: z.string().min(1).optional(),
});

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(.+?);base64,(.+)$/);

  if (!match) {
    throw new Error("Invalid data URL");
  }

  return {
    mimeType: match[1],
    base64: match[2],
  };
}

function guessExtension(mimeType: string) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/gif") return "gif";
  return "jpg";
}

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await requireAuthenticatedUser(request);

    if (authError) {
      return authError;
    }

    const { closetId, error: closetError } = await requireOwnedClosetId(request, user.id);

    if (closetError) {
      return closetError;
    }

    const input = await parseJson(request, uploadItemImageSchema);
    const { mimeType, base64 } = parseDataUrl(input.image_data_url);
    const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "closet-items";
    const extension = guessExtension(mimeType);
    const safeName = (input.filename ?? `item.${extension}`).replace(/[^a-zA-Z0-9._-]/g, "_");
    const objectPath = `${user.id}/${closetId}/${Date.now()}-${safeName}`;
    const bytes = Buffer.from(base64, "base64");
    const supabase = getSupabaseServerClient();

    const upload = await supabase.storage.from(bucket).upload(objectPath, bytes, {
      contentType: mimeType,
      upsert: false,
    });

    if (upload.error) {
      return internalServerError("Failed to upload image to Supabase Storage", upload.error);
    }

    const publicUrl = supabase.storage.from(bucket).getPublicUrl(objectPath).data.publicUrl;

    return created({
      path: objectPath,
      public_url: publicUrl,
      bucket,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return fromZodError(error);
    }

    return internalServerError("Failed to upload item image", error);
  }
}
