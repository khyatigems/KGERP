import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

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

  const isPublicRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/verify") ||
    pathname.startsWith("/preview") ||
    pathname.startsWith("/api/cron") ||
    pathname.startsWith("/api/serials/verify") ||
    pathname.startsWith("/api/skus") ||
    pathname.startsWith("/api/auth") || // Removed root "/" from public, as it's dashboard
    pathname.startsWith("/invoice"); // Make invoice pages public

  // 1. Handle Public Routes
  if (isPublicRoute) {
    // If logged in and trying to access login, redirect to dashboard
    if (isLoggedIn && pathname.startsWith("/login")) {
      return NextResponse.redirect(new URL("/", req.nextUrl));
    }
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
