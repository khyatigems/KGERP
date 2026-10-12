import type { NextRequest } from "next/server";

/** Validate cookie-authenticated writes against the browser's request host. */
export function isSameRequestOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;

  try {
    const parsedOrigin = new URL(origin);
    const forwardedHost = req.headers.get("x-forwarded-host")?.split(",")[0].trim();
    const requestHost = forwardedHost || req.headers.get("host");
    if (!requestHost || parsedOrigin.host.toLowerCase() !== requestHost.toLowerCase()) return false;

    const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0].trim();
    const requestProtocol = forwardedProto ? `${forwardedProto}:` : req.nextUrl.protocol;
    return parsedOrigin.protocol === requestProtocol;
  } catch {
    return false;
  }
}
