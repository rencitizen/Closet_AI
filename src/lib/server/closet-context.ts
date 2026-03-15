import { NextRequest } from "next/server";

import { badRequest } from "@/lib/api";

export function getClosetId(request: NextRequest) {
  return request.headers.get("x-closet-id") ?? request.nextUrl.searchParams.get("closet_id");
}

export function requireClosetId(request: NextRequest) {
  const closetId = getClosetId(request);

  if (!closetId) {
    return {
      closetId: null,
      error: badRequest("Missing x-closet-id header or closet_id query parameter"),
    };
  }

  return { closetId, error: null };
}
