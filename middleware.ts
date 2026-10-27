import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";
import { isPublicPage } from "@/lib/public-routes";

const { auth } = NextAuth(authConfig);
const ROBOTS_TAG = "noindex, nofollow, noarchive, nosnippet, noimageindex";
const INTERNAL_ROUTE_PREFIXES = ["/erp", "/dashboard", "/inventory", "/orders", "/customers", "/settings", "/reports", "/admin", "/login", "/api"];

function shouldSetNoindexHeader(pathname: string) {
  const normalized = pathname.toLowerCase();

  return INTERNAL_ROUTE_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`));
}

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;
  const response = NextResponse.next();

  if (shouldSetNoindexHeader(pathname)) {
    response.headers.set("x-robots-tag", ROBOTS_TAG);
  }

  const isPublicRoute = isPublicPage(pathname);

  // 1. Handle Public Routes
  if (isPublicRoute) {
    // Login must remain reachable when the server has revoked an older 2FA policy.
    // The edge decoder alone cannot validate the current database policy version.
    return response;
  }

  if (pathname.startsWith("/api")) {
    return response;
  }

  // 2. Enforce Authentication for Protected Routes
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  // Root path specific check if needed, or default allow for authenticated
  if (pathname === "/") {
    return response;
  }

  // Allow static files and others
  return response;
});

export const config = {
  // Static assets must bypass auth middleware so logged-out users (e.g. on
  // /login) always receive images/fonts instead of a login redirect.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js|map|txt|xml|woff|woff2|ttf)$).*)",
  ],
};
