import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;
  
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
    return NextResponse.next();
  }

  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // 2. Enforce Authentication for Protected Routes
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  // Root path specific check if needed, or default allow for authenticated
  if (pathname === "/") {
     return NextResponse.next();
  }

  // Allow static files and others
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
