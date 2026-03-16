import { NextRequest } from "next/server";
import { z, ZodError } from "zod";

import { fromZodError, internalServerError, ok } from "@/lib/api";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { parseJson } from "@/lib/server/request";

const generateItemImageSchema = z.object({
  name: z.string().trim().min(1),
  category: z.string().trim().min(1),
  color: z.string().trim().min(1).optional(),
  brand: z.string().trim().min(1).optional(),
  notes: z.string().trim().min(1).optional(),
});

function buildPrompt(input: z.infer<typeof generateItemImageSchema>) {
  const parts = [
    "Create a clean apparel product image for a personal closet app.",
    "Show a single fashion item only, centered, front-facing, full item visible, no mannequin, no person, no hands, no props, no floor.",
    "Use a transparent background.",
    "Keep the silhouette clear and the margins tight but not cropped.",
    "Make it look like a catalog cutout suitable for layering into outfit collages.",
    `Item type: ${input.category}.`,
    `Item name: ${input.name}.`,
  ];

  if (input.color) {
    parts.push(`Main color: ${input.color}.`);
  }

  if (input.brand) {
    parts.push(`Brand style reference: ${input.brand}.`);
  }

  if (input.notes) {
    parts.push(`Extra details: ${input.notes}.`);
  }

  return parts.join(" ");
}

export async function POST(request: NextRequest) {
  try {
    const { error: authError } = await requireAuthenticatedUser(request);

    if (authError) {
      return authError;
    }

    const input = await parseJson(request, generateItemImageSchema);
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return internalServerError("Missing OPENAI_API_KEY");
    }

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1.5",
        prompt: buildPrompt(input),
        size: "1024x1536",
        quality: "medium",
        background: "transparent",
        output_format: "png",
      }),
    });

    const payload = (await response.json()) as {
      data?: Array<{ b64_json?: string }>;
      error?: { message?: string };
    };

    if (!response.ok) {
      return internalServerError("OpenAI image generation request failed", payload);
    }

    const b64 = payload.data?.[0]?.b64_json;

    if (!b64) {
      return internalServerError("OpenAI did not return an image payload", payload);
    }

    return ok({
      image_data_url: `data:image/png;base64,${b64}`,
      prompt: buildPrompt(input),
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return fromZodError(error);
    }

    return internalServerError("Failed to generate item image", error);
  }
}
