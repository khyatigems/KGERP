import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;
  
  const isPublicRoute = 
    pathname.startsWith("/login") ||
    pathname.startsWith("/quote") ||
    pathname.startsWith("/invoice") ||
    pathname.startsWith("/api/auth") ||
  pathname === "/"; // Wait, root is Dashboard? "Admin app: /" in prompt. So / is protected.

  // "Admin app: /" implies root is the app.
  // Public pages: /quote, /invoice.
  
  if (pathname === "/") {
     // Root is protected
     if (!isLoggedIn) return NextResponse.redirect(new URL("/login", req.nextUrl));
     return NextResponse.next();
  }

  // Allow static files
  if (pathname.includes(".")) return NextResponse.next();

  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }
  
  // If logged in and at /login, redirect to /
  if (isLoggedIn && pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
