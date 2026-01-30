import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";
import { PERMISSIONS, hasPermission, Permission } from "@/lib/permissions";

const { auth } = NextAuth(authConfig);

// Map routes to required permissions
const ROUTE_PERMISSIONS: Record<string, Permission> = {
  "/reports": PERMISSIONS.REPORTS_VIEW,
  "/settings": PERMISSIONS.SETTINGS_MANAGE,
  "/users": PERMISSIONS.USERS_MANAGE,
  "/sales": PERMISSIONS.SALES_VIEW,
  "/purchases": PERMISSIONS.INVENTORY_VIEW_COST, // Purchases reveal cost
  "/vendors": PERMISSIONS.VENDOR_VIEW,
  "/quotations": PERMISSIONS.QUOTATION_VIEW,
  "/inventory": PERMISSIONS.INVENTORY_VIEW,
};

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;
  const userRole = req.auth?.user?.role || "VIEWER";
  
  const isPublicRoute = 
    pathname.startsWith("/login") ||
    pathname.startsWith("/quote") ||
    pathname.startsWith("/invoice") ||
    pathname.startsWith("/preview") ||
    pathname.startsWith("/api/auth"); // Removed root "/" from public, as it's dashboard

  // 1. Handle Public Routes
  if (isPublicRoute) {
    // If logged in and trying to access login, redirect to dashboard
    if (isLoggedIn && pathname.startsWith("/login")) {
      return NextResponse.redirect(new URL("/", req.nextUrl));
    }
    return NextResponse.next();
  }

  // 2. Enforce Authentication for Protected Routes
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }
  
  // 3. Enforce Role-Based Access Control (RBAC)
  // Check if current path starts with any protected route key
  for (const [route, permission] of Object.entries(ROUTE_PERMISSIONS)) {
    if (pathname.startsWith(route)) {
      if (!hasPermission(userRole, permission)) {
        // Log unauthorized access attempt (optional, could be done via separate service)
        console.warn(`Unauthorized access attempt: User ${req.auth?.user?.email} (${userRole}) tried to access ${pathname}`);
        return NextResponse.rewrite(new URL("/403", req.nextUrl)); // Rewrite to a 403 page or redirect
      }
    }
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
