import { NextRequest } from "next/server";
import { z, ZodError } from "zod";

import { fromZodError, internalServerError, ok } from "@/lib/api";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { parseJson } from "@/lib/server/request";

const analyzeItemSchema = z.object({
  image_data_url: z.string().min(1),
  filename: z.string().optional(),
});

const analysisSchema = {
  name: "closet_item_analysis",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      name: { type: "string" },
      category: {
        type: "string",
        enum: ["tops", "bottoms", "outer", "shoes", "bag", "accessory", "dress", "other"],
      },
      brand: { type: ["string", "null"] },
      color: { type: ["string", "null"] },
      season_tags: {
        type: "array",
        items: {
          type: "string",
          enum: ["spring", "summer", "autumn", "winter", "all_season"],
        },
      },
      status: {
        type: "string",
        enum: ["active", "stored", "in_laundry", "in_cleaning"],
      },
      notes: { type: ["string", "null"] },
      confidence: { type: "number" },
    },
    required: ["name", "category", "brand", "color", "season_tags", "status", "notes", "confidence"],
  },
} as const;

function extractJsonText(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const response = payload as {
    output_text?: string;
    output?: Array<{ content?: Array<{ text?: string }> }>;
  };

  if (typeof response.output_text === "string" && response.output_text.length > 0) {
    return response.output_text;
  }

  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (typeof content.text === "string" && content.text.length > 0) {
        return content.text;
      }
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { error: authError } = await requireAuthenticatedUser(request);

    if (authError) {
      return authError;
    }

    const input = await parseJson(request, analyzeItemSchema);
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return internalServerError("Missing OPENAI_API_KEY");
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_VISION_MODEL ?? "gpt-4o-mini",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text:
                  "Analyze this clothing item photo for a personal closet app. Infer a concise item name, broad category, likely brand if visible, main color, likely seasons, default status, and short notes. Return only structured data.",
              },
              {
                type: "input_image",
                image_url: input.image_data_url,
              },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            ...analysisSchema,
          },
        },
      }),
    });

    const payload = (await response.json()) as unknown;

    if (!response.ok) {
      return internalServerError("OpenAI analysis request failed", payload);
    }

    const rawJson = extractJsonText(payload);

    if (!rawJson) {
      return internalServerError("OpenAI did not return structured analysis", payload);
    }

    const parsed = JSON.parse(rawJson) as {
      name: string;
      category: string;
      brand: string | null;
      color: string | null;
      season_tags: string[];
      status: string;
      notes: string | null;
      confidence: number;
    };

    return ok({ analysis: parsed });
  } catch (error) {
    if (error instanceof ZodError) {
      return fromZodError(error);
    }

    return internalServerError("Failed to analyze item image", error);
  }
}
