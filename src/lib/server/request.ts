import { NextRequest } from "next/server";
import { ZodType } from "zod";

export async function parseJson<T>(request: NextRequest, schema: ZodType<T>) {
  const json = await request.json();
  return schema.parse(json);
}

export function parseSearchParams<T>(request: NextRequest, schema: ZodType<T>) {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  return schema.parse(params);
}
