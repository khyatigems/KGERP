import { NextResponse } from "next/server";
import { appLockExempt } from "./app-lock-paths";
import { readCookie } from "./core";
import { APP_LOCK_COOKIE, appLockState, lockApp } from "./app-lock-store";

export async function enforceAppLock(request: Request, user: { id: string; appSessionId?: string }) {
  const url = new URL(request.url);
  // Public GET pages remain reachable; Server Actions posted to them must still
  // obey the lock. Auth recovery and the lock protocol have their own checks.
  try {
    if (url.pathname === "/unlock" && request.method === "GET" && user.appSessionId) await lockApp(user.appSessionId, user.id);
    if (appLockExempt(url.pathname) && (request.method === "GET" || url.pathname.startsWith("/api/auth/"))) return null;
    const token = readCookie(request, APP_LOCK_COOKIE);
    const state = await appLockState(user.appSessionId, user.id, token);
    if (!state.enabled) return null;
    const documentNavigation = request.method === "GET" && (request.headers.get("sec-fetch-dest") === "document" || (!request.headers.has("rsc") && request.headers.get("accept")?.includes("text/html")));
    // Table filters, refreshes, and a quick reopen are ordinary navigation while
    // the unlock grant remains valid. Only expiration or explicit lock denies it.
    if (state.unlocked) return null;
    if (documentNavigation) await lockApp(user.appSessionId!, user.id);
    if (url.pathname.startsWith("/api/") || request.method !== "GET" || request.headers.has("rsc")) {
      return NextResponse.json({ error: "ERP is locked. Unlock the app to continue.", code: "APP_LOCKED" }, { status: 423, headers: { "Cache-Control": "no-store" } });
    }
    const target = new URL("/unlock", url);
    target.searchParams.set("next", `${url.pathname}${url.search}`);
    const response = NextResponse.redirect(target);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return NextResponse.json({ error: "Unable to verify app lock. Try again when connected.", code: "APP_LOCK_UNAVAILABLE" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
