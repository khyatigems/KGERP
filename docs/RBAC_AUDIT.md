
# RBAC Audit & Turso Migration Guide

## 1. RBAC Audit Findings

### Issue
User `abc@gmail.com` (Role: `VIEWER`) was able to access unauthorized pages (`/reports`, `/settings`, etc.) because the application lacked comprehensive authorization checks.

### Vulnerabilities Identified
- **Middleware**: Only checked for authentication (is user logged in?), but not authorization (does user have permission?).
- **Page Guards**: Critical pages like `Reports`, `Purchases`, and `Vendors` lacked server-side permission checks.
- **Frontend**: Navigation items might have been hidden, but routes were accessible via direct URL entry.

### Role Definitions (Verified)
- **SUPER_ADMIN**: All permissions.
- **ADMIN**: All permissions except `INVOICE_DELETE`.
- **SALES**: `INVENTORY_VIEW`, `INVENTORY_CREATE`, `INVENTORY_EDIT`, `QUOTATION_*`, `SALES_*`, `VENDOR_VIEW`.
- **ACCOUNTS**: `INVENTORY_VIEW`, `INVENTORY_VIEW_COST`, `QUOTATION_VIEW`, `SALES_VIEW`, `REPORTS_VIEW`, `VENDOR_VIEW`.
- **VIEWER**: `INVENTORY_VIEW`, `QUOTATION_VIEW` only.

## 2. Implemented Solutions

### Middleware Enhancement
Updated `middleware.ts` to enforce Role-Based Access Control (RBAC) on initial request.
- Maps routes to required permissions (e.g., `/reports` -> `REPORTS_VIEW`).
- Redirects or rewrites to 403 if user lacks permission.

### Page-Level Security
Added `hasPermission()` checks to the following Server Components:
- `app/(dashboard)/reports/page.tsx`
- `app/(dashboard)/purchases/page.tsx` (Requires `INVENTORY_VIEW_COST`)
- `app/(dashboard)/vendors/page.tsx`
- `app/(dashboard)/settings/page.tsx` (Already present, verified)
- `app/(dashboard)/users/page.tsx` (Already present, verified)
- `app/(dashboard)/sales/page.tsx` (Already present, verified)

### Verification
Created `scripts/test-rbac.ts` to verify permission logic against all roles.
- **Result**: All checks passed. `VIEWER` is correctly denied access to protected routes.

## 3. Turso Database Migration

The application is configured to support Turso (LibSQL) via Prisma Adapter.

### Configuration
The `lib/prisma.ts` file automatically detects the database provider based on `DATABASE_URL`.

**To Switch to Turso:**
1. Update your `.env` file:
   ```env
   # Turso Connection String (libsql://...)
   DATABASE_URL="libsql://your-database-name-org.turso.io"
   
   # Turso Auth Token
   TURSO_AUTH_TOKEN="ey..."
   ```

2. Generate Client:
   ```bash
   npx prisma generate
   ```

3. Push Schema:
   ```bash
   npx prisma db push
   ```

The application will automatically use the `@prisma/adapter-libsql` when a `libsql:` URL is detected.

## 4. Testing

Run the RBAC verification script:
```bash
npx tsx scripts/test-rbac.ts
```

This script simulates permission checks for all roles against critical routes.
