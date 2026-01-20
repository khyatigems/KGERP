# KhyatiGems™ ERP – Developer Onboarding

## 1️⃣ Prerequisites

- Node.js ≥ 18 (LTS recommended)
- npm or pnpm
- Git
- Turso database URL (or Turso CLI to create one)
- Cloudinary account (for media)

## 2️⃣ Clone & Install

```bash
git clone <REPO_URL> khyatigems-erp
cd khyatigems-erp
npm install
# or: pnpm install
```

## 3️⃣ Environment Setup

Create `.env.local` at the project root:

```bash
# App URLs
NEXTAUTH_URL="http://localhost:3000"
APP_BASE_URL="http://localhost:3000"

# Database (Turso)
DATABASE_URL="libsql://<your-db>.turso.io?authToken=<YOUR_TOKEN>"

# Auth
NEXTAUTH_SECRET="<random-long-secret>"

# Cloudinary
CLOUDINARY_CLOUD_NAME="<cloud-name>"
CLOUDINARY_API_KEY="<api-key>"
CLOUDINARY_API_SECRET="<api-secret>"
```

> Do not commit `.env.local`.

For local development migrations (Prisma CLI), create a `.env` file:
```bash
DATABASE_URL="file:./dev.db"
```
This allows `prisma migrate dev` to work locally. The app will use `.env.local` to connect to Turso.

## 4️⃣ Database Setup (Turso + Prisma)

Generate Prisma client:

```bash
npx prisma generate
```

Run migrations locally (creates dev.db):

```bash
npx prisma migrate dev --name init
```

Seed base data (admin user, roles, permissions, base settings):

```bash
npm run seed
```
*(Note: You need to implement the seed script logic to sync with Turso if you want remote data populated)*

## 5️⃣ Run the App Locally

```bash
npm run dev
```

- App: http://localhost:3000
- Login: use the seeded Admin credentials (see `scripts/seed.ts`)

Routing basics:

- `/login` – Auth
- `/` (dashboard) – KPI + charts (protected)
- `/inventory` – Inventory list
- `/quotations` – Quotation list + creation
- `/sales` – Sales list
- `/purchases` – Purchases
- `/vendors` – Vendor management
- `/reports` – Analytics
- `/users` – Users & roles
- `/settings` – Company/payment/templates/settings
- `/quote/[token]` – Public quotation
- `/invoice/[token]` – Public invoice

## 6️⃣ Core Engineering Rules (MANDATORY)

- **Purchases ≠ Inventory**
  - Purchase creation must not create or update inventory records.
- **Inventory ≠ Sales**
  - Sales are created only via explicit “Mark as Sold” / “Convert to Sale” flows.
- **Profit is system-calculated**
  - No UI control may allow editing profit directly.
  - Profit must be computed on the server (never trusted from client).
- **Public views are read-only and safe**
  - `/quote/[token]` and `/invoice/[token]` must not expose:
    - Purchase cost
    - Profit
    - Vendor identity
    - Internal notes
- **All writes go through server-side code**
  - Use Next.js Server Actions or Route Handlers for mutations.
  - No direct client-to-DB access.
- **RBAC enforced on backend**
  - Permission checks (e.g. `inventory.create`, `sales.delete`) live in server code, not only in the UI.
- **Public links must be revocable**
  - Every public quotation/invoice link is backed by a DB token with `isActive` flag and optional expiry.
  - Disabling a link invalidates future access immediately.

## 7️⃣ Important Business Logic Locations

| Logic                     | File                |
|---------------------------|---------------------|
| Prisma client             | `lib/prisma.ts`     |
| Auth helpers              | `lib/auth.ts`       |
| Permissions / RBAC        | `lib/permissions.ts`|
| SKU generation            | `lib/sku.ts`        |
| Profit calculations       | `lib/utils.ts`      |
| UPI URI / QR helpers      | `lib/upi.ts`        |
| WhatsApp deep links       | `lib/whatsapp.ts`   |
| Quotation/invoice tokens  | `lib/tokens.ts`     |
| Cron-like jobs (expiry)   | `scripts/cron.ts`   |
| Seed data (admin, roles)  | `scripts/seed.ts`   |

## 8️⃣ Deployment (Vercel + Turso)

1. **Create Turso DB**
   - Via Turso CLI or dashboard.
   - Get `DATABASE_URL` (libsql URL with auth token).

2. **Configure Vercel Project**
   - Framework: Next.js
   - Build command: `next build` (default)
   - Environment variables (Production):
     - `DATABASE_URL`
     - `NEXTAUTH_SECRET`
     - `NEXTAUTH_URL` (prod URL)
     - Cloudinary vars
   - Optional: any feature flags.

3. **Run DB migrations on Production**
   - Since Prisma CLI doesn't support `libsql` protocol for migrations directly, use `prisma db push` (carefully) or `turso db shell < migration.sql`.
   - Recommended: Use a script using `@libsql/client` to execute the migration SQL found in `prisma/migrations`.

4. **Seed Production Carefully**
   - Run a one-time seed for:
     - Admin user
     - Base roles/permissions
   - Do **not** reseed in a way that overwrites existing data.

## 9️⃣ Pre-Merge Testing Checklist

Before merging any feature branch:

- Inventory
  - Add new inventory item.
  - Edit item.
- Quotations
  - Create multi-item quotation.
  - Check expiry behavior.
- Sales
  - Convert quotation to sale.
  - Delete sale (Admin only) and ensure inventory status reverts to `IN_STOCK`.
- Public Links
  - Open quotation link as anonymous user.
  - Disable the link and confirm it stops working.
- Profit
  - Verify profit values are correct and are never user-editable.
  - Confirm public pages never show cost/profit/vendor.
