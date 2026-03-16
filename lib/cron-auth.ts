import type { NextRequest } from "next/server";

export function isAuthorizedCronRequest(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    if (process.env.NODE_ENV === "production") {
      console.error("CRON_SECRET is missing in production; cron endpoint will reject requests");
    }
    return process.env.NODE_ENV !== "production";
  }
  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const headerSecret = request.headers.get("x-cron-secret");
  return bearer === expected || headerSecret === expected;
}
