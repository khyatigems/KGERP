# KhyatiGems ERP v3 - Developer Handoff Guide

**Last Updated:** January 26, 2026
**Target Audience:** Full Stack Developers (Next.js / React / Prisma)

This document provides a deep technical dive into the KhyatiGems ERP system, covering architecture, core business logic, critical workflows, and deployment specifics.

---

## 1. System Overview & Architecture

### Tech Stack
*   **Framework**: Next.js 16.1.3 (App Router)
*   **Language**: TypeScript (Strict Mode)
*   **Database**: Distributed SQLite (LibSQL/Turso)
*   **ORM**: Prisma 6.0 (Custom Client at `@prisma/client-custom-v2`)
*   **UI**: Tailwind CSS v4 + shadcn/ui
*   **Auth**: NextAuth.js v5 Beta (Credentials Provider)

### Directory Structure
```text
khyatigems-erp/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Public authentication routes
│   ├── (dashboard)/        # Protected application routes (Sidebar layout)
│   │   ├── inventory/      # Stock management & Actions
│   │   ├── sales/          # Invoice & Payment lifecycle
│   │   ├── purchases/      # Vendor & Expense tracking
│   │   ├── reports/        # Analytics dashboards
│   │   └── settings/       # Master Data & Config
│   ├── api/                # Backend API (Webhooks, Dashboard Data)
│   └── actions.ts          # Global server actions
├── components/             # React Components
│   ├── ui/                 # Base UI primitives (shadcn)
│   ├── inventory/          # Complex inventory widgets (Forms, Tables)
│   └── reports/            # Recharts implementations
├── lib/                    # Business Logic Core
│   ├── prisma.ts           # DB Connection Factory
│   ├── report-generator.ts # PDF/Excel Engines
│   ├── invoice-generator.ts# Invoice Rendering Engine
│   └── permission-guard.ts # RBAC Security Layer
└── scripts/                # DevOps & Maintenance
```

---

## 2. Core Business Logic & Workflows

### A. Inventory Management
**Concept**: Decoupling of "Financial Record" (PurchaseItem) vs "Physical Stock" (Inventory).
*   **PurchaseItem**: Immutable financial line item from a Vendor Bill.
*   **Inventory**: Physical asset in the vault.
*   **Logic**: Creating a Purchase *does not* auto-create Inventory. This is intentional to allow for regrading, splitting, or consolidating parcels.
*   **CSV Import Flow**:
    1.  **Client**: `components/ui/csv-importer.tsx` parses file using `xlsx` in browser.
    2.  **Server**: `inventory/actions.ts` -> `importInventory`.
    3.  **Resolution**: Tries to match text (e.g., "Ruby") to Master Codes (`RUB`). If no code exists, falls back to Name matching.
    4.  **Transaction**: Uses `prisma.$transaction` to ensure atomic creation of items and sequential SKU generation.

### B. Sales & Invoicing Lifecycle
**Flow**: `Quotation` (Optional) -> `Invoice` -> `Sale` -> `Payment`.
1.  **Creation**: `sales/actions.ts` -> `createSale`.
    *   Generates sequential Invoice Number (`INV-YYYY-XXXX`).
    *   Creates a secure `token` for public access.
2.  **Versioning**: `lib/invoice-versioning.ts`.
    *   Every edit to an invoice triggers a snapshot. The entire invoice object graph is serialized to JSON and stored in `InvoiceVersion`.
3.  **PDF Generation**: `lib/invoice-generator.ts`.
    *   Uses `jspdf` + `jspdf-autotable`.
    *   Renders dynamically with base64 assets (Logo, Signature).
    *   Calculates GST and Totals on-the-fly during render.

### C. Reporting System
**Pattern**: Server-Side Aggregation -> Client-Side Visualization.
1.  **Data Fetching**: `app/(dashboard)/reports/vendor/page.tsx` (Server Component).
    *   Executes heavy aggregations (SUM, GROUP BY) directly via Prisma.
    *   Example: "Top Vendors by Volume" uses `prisma.purchase.groupBy`.
2.  **Visualization**: `components/reports/*`.
    *   Receives pre-calculated JSON.
    *   Renders charts using `recharts`.
3.  **Export Logic**: `lib/report-generator.ts`.
    *   **PDF**: Manually draws headers/totals.
    *   **Excel**: Generates multi-sheet Workbooks (Summary + Data) using `xlsx`.

### D. Label Printing
**Logic**: Client-Side PDF Generation with Server Audit.
1.  **Selection**: Users add items to a "Label Cart".
2.  **Job Creation**: Server Action `createLabelJob` records the intent and locks the job.
3.  **PDF Render**: `lib/label-generator.ts`.
    *   Calculates layout grid (Rows/Cols) for thermal printers.
    *   Generates QR Codes via `qrcode` lib.
    *   **Auto-Fit Text**: Iteratively reduces font size until long Gemstone names fit the label width.

---

## 3. Critical Technical Implementations

### Database Connection Strategy (`lib/prisma.ts`)
The system auto-detects the environment to choose the correct driver:
*   **Turso (Production)**: Uses `@prisma/adapter-libsql` (HTTP-based) when `DATABASE_URL` starts with `libsql:`.
*   **Local (Dev)**: Uses standard `sqlite` driver when `DATABASE_URL` starts with `file:`.
*   **Important**: You must use the custom client `@prisma/client-custom-v2`.

### Role-Based Access Control (RBAC)
**File**: `lib/permission-guard.ts`
*   **Mechanism**: Centralized `checkPermission` function used at the start of every Server Action.
*   **Audit**: Automatically logs denied attempts to `ActivityLog`.
*   **Roles**: Defined in `prisma/schema.prisma` (`SUPER_ADMIN`, `ADMIN`, `SALES`, `ACCOUNTS`, `VIEWER`).

### Standard Server Action Response
All actions return a standardized `ActionResponse` type:
```typescript
type ActionResponse = {
  success?: boolean;
  message?: string;       // User-friendly success message
  error?: string;         // User-friendly error message
  fields?: Record<string, string>; // Zod validation errors
};
```
*   **Error Handling**: All DB calls are wrapped in `try/catch`. Prisma errors (Unique Constraint, Foreign Key) are caught and mapped to readable messages.

---

## 4. Deployment & Maintenance

### Migration Workflow (CRITICAL)
Because we use the LibSQL adapter for Turso, standard Prisma migration commands often fail.
**Correct Workflow**:
1.  **Local Dev**:
    ```bash
    npx prisma migrate dev --name <migration_name>
    ```
2.  **Production Sync**:
    *   Edit `scripts/apply-migration-turso.js` and add the new migration folder name to the `MIGRATIONS` array.
    *   Run:
        ```bash
        node scripts/apply-migration-turso.js
        ```

### Environment Variables
Ensure these are set in your deployment platform (Vercel/Netlify):
*   `DATABASE_URL`: Turso connection string.
*   `NEXTAUTH_SECRET`: for session encryption.
*   `CLOUDINARY_*`: for media handling.

### Debugging
*   **Activity Log**: Check `/activity-log` in the dashboard for user action history.
*   **Console**: Server-side errors are logged with stack traces in the Vercel/Node logs.

---

## 5. Database Schema Reference

Below are the Prisma models that define the SQL structure. These are the single source of truth for the database schema.

### User & Auth
```prisma
model User {
  id                 String    @id @default(uuid())
  name               String
  email              String    @unique
  password           String
  role               String // SUPER_ADMIN | ADMIN | SALES | ACCOUNTS | VIEWER
  avatar             String?
  lastLogin          DateTime?
  lastPasswordChange DateTime?
  forceLogoutBefore  DateTime?
  createdAt          DateTime  @default(now())
}
```

### Inventory & Stock
```prisma
model Inventory {
  id              String   @id @default(uuid())
  sku             String   @unique
  itemName        String
  category        String // Loose, Certified, Parcel
  gemType         String?
  pieces          Int      @default(1)
  weightValue     Float?   @default(0)
  weightUnit      String?
  carats          Float   @default(0)
  costPrice       Float
  sellingPrice    Float
  status          String   @default("IN_STOCK") // IN_STOCK, SOLD, MEMO, PROCESSING
  location        String?
  
  // Jewelry Fields
  braceletType    String?
  beadSizeMm      Float?
  
  // Relations
  purchaseId      String?
  vendorId        String?
  imageUrl        String?
  
  purchase        Purchase? @relation(fields: [purchaseId], references: [id])
  vendor          Vendor?   @relation(fields: [vendorId], references: [id])
}

model InventoryMedia {
  id          String   @id @default(uuid())
  inventoryId String
  mediaUrl    String
  type        String   // IMAGE, VIDEO
  isPrimary   Boolean  @default(false)
}
```

### Purchase & Vendors
```prisma
model Vendor {
  id         String   @id @default(uuid())
  name       String   @unique
  phone      String?
  email      String?
  city       String?
  status     String   @default("PENDING")
}

model Purchase {
  id            String    @id @default(uuid())
  invoiceNo     String?
  purchaseDate  DateTime
  vendorId      String?
  totalAmount   Float
  paymentStatus String    @default("PENDING")
  
  items         Inventory[]
  purchaseItems PurchaseItem[]
}

model PurchaseItem {
  id          String   @id @default(uuid())
  purchaseId  String
  itemName    String
  weightValue Float
  weightUnit  String
  quantity    Float    @default(1)
  unitCost    Float
  totalCost   Float
}
```

### Sales, Invoices & Quotations
```prisma
model Customer {
  id        String   @id @default(uuid())
  name      String
  email     String?
  phone     String?
  city      String?
}

model Quotation {
  id              String   @id @default(uuid())
  quotationNumber String   @unique
  token           String   @unique
  customerName    String
  status          String   @default("DRAFT")
  totalAmount     Float
  
  items           QuotationItem[]
  invoices        Invoice[]
}

model Invoice {
  id            String   @id @default(uuid())
  invoiceNumber String   @unique
  token         String   @unique
  status        String   @default("DRAFT")
  subtotal      Float
  taxTotal      Float
  totalAmount   Float
  paymentStatus String     @default("UNPAID")
  paidAmount    Float      @default(0)
  
  sales         Sale[]     @relation("NewInvoice")
  payments      Payment[]
  versions      InvoiceVersion[]
}

model Sale {
  id             String   @id @default(uuid())
  inventoryId    String
  customerId     String?
  salePrice      Float
  paymentStatus  String   @default("PENDING")
  invoiceId      String?
  
  inventory Inventory @relation(fields: [inventoryId], references: [id])
  invoice   Invoice?  @relation("NewInvoice", fields: [invoiceId], references: [id])
}

model Payment {
  id          String   @id @default(uuid())
  invoiceId   String
  amount      Float
  date        DateTime @default(now())
  method      String   // CASH, UPI, BANK_TRANSFER
  reference   String?
}
```

### Master Data (Settings)
```prisma
// Example of a Code table (others: GemstoneCode, ColorCode, etc. follow same structure)
model CategoryCode {
  id          String      @id @default(uuid())
  name        String      @unique
  code        String      @unique
  status      String      @default("ACTIVE")
}
```
