# Packaging Identity Module Specification

## 1. Overview
A new, independent module within the ERP for generating, printing, and verifying serialized packaging labels for gemstones. This module is architecturally separate from the existing label printing system.

## 2. Architecture
- **Namespace**: `/erp/packaging/*`
- **Database**: New tables prefixed with `gpis_`
- **Access Control**: restricted to `SUPER_ADMIN`, `ADMIN`, `INVENTORY_MANAGER` (mapped to existing roles).

## 3. Database Schema (New Tables)

### `gpis_settings`
Single row configuration table.
- `id` (UUID, PK)
- `brand_name` (String)
- `tagline` (String)
- `est_year` (String)
- `registered_address` (String)
- `gstin` (String)
- `iec` (String)
- `support_email` (String)
- `support_phone` (String)
- `support_timings` (String)
- `website` (String)
- `watermark_text` (String)
- `watermark_opacity` (Int, default 6)
- `label_version` (String)
- `logo_url` (String)
- `care_instruction` (String)
- `legal_metrology_line` (String)
- `updated_at` (DateTime)

### `gpis_serials`
Tracks individual serialized items.
- `id` (UUID, PK)
- `sku` (String, Required)
- `serial_number` (String, Unique, Required)
- `category_code` (String, Required)
- `year_month` (String)
- `running_number` (Int)
- `hash_fragment` (String)
- `status` (Enum: ACTIVE, REPRINTED, CANCELLED, default ACTIVE)
- `inventory_location` (String)
- `qc_code` (String)
- `packed_at` (DateTime, default now)
- `reprint_count` (Int, default 0)
- `created_by` (String)
- `created_at` (DateTime, default now)

### `gpis_print_jobs`
Tracks batch print jobs.
- `id` (UUID, PK)
- `print_job_id` (String, Unique)
- `sku` (String)
- `start_serial` (String)
- `end_serial` (String)
- `total_labels` (Int)
- `printer_type` (Enum: A4)
- `printed_by` (String)
- `printed_at` (DateTime, default now)
- `status` (Enum: COMPLETED, SUPERSEDED)

### `gpis_verification_logs`
Tracks public scans.
- `id` (UUID, PK)
- `serial_number` (String)
- `scanned_at` (DateTime, default now)
- `ip_address` (String)
- `user_agent` (String)

## 4. API Routes & Server Actions

### Base Namespace: `app/erp/packaging`
- **Dashboard**: `/erp/packaging` - Summary cards, recent jobs.
- **Create Wizard**: `/erp/packaging/create` - Step-by-step label generation.
- **Ledger**: `/erp/packaging/ledger` - Filterable table of all serials.
- **Verification Logs**: `/erp/packaging/logs` - Scan history.
- **Settings**: `/erp/packaging/settings` - Configure `gpis_settings`.

### Public Verification
- **Route**: `/verify/[serial]` (Public access)
- **Logic**: 
  - Look up `serial_number` in `gpis_serials`.
  - If found: Show details, log scan in `gpis_verification_logs`.
  - If not found: Show invalid message.

### Server Actions (`app/erp/packaging/actions.ts`)
- `createPackagingSettings(data)`
- `updatePackagingSettings(data)`
- `getPackagingSettings()`
- `validateInventoryForPackaging(sku)`
- `generateSerials(sku, quantity, location)`
- `createPrintJob(jobData)`
- `getSerialHistory(filters)`
- `getVerificationLogs(filters)`

## 5. Logic & Workflows

### Inventory Validation
Before generation, validate `Inventory` record for `sku`:
- Required: `itemName` (gemstone_name), `sku`, `category` (category_code), `gemType` (stone_type), `weightValue` (weight_carat), `weightUnit` (weight_grams logic), `treatment`, `certificateNo`, `sellingPrice` (mrp), `stockLocation` (inventory_location).
- If any missing -> Block generation.

### Serial Generation
Format: `KG-{Category}-{YYMM}-{Running}-{Hash}`
- `Category`: From Inventory `category` or `categoryCode`.
- `YYMM`: Current date.
- `Running`: Sequential number resetting per Category+YYMM.
- `Hash`: Short random string for uniqueness/security.

### PDF Generation
- **Library**: `jspdf`
- **Format**: A4, 2 columns x 5 rows.
- **Label Size**: 100mm x 50mm.
- **Content**: As specified (Brand, Gemstone Data, Commercial, Certification, Control, Security, QR, Barcode).
- **Watermark**: Overlay text with opacity.

## 6. UI Components
- **PackagingDashboard**: Stats cards, recent activity.
- **CreatePackagingWizard**: 
  - Step 1: Select SKU (Search/Autocomplete).
  - Step 2: Validate Inventory & Enter Quantity/Location.
  - Step 3: Preview Serials & Layout.
  - Step 4: Generate & Print.
- **SerialLedgerTable**: DataTable with filters/sorting.
- **VerificationLogsTable**: DataTable for logs.
- **SettingsForm**: Form for `gpis_settings`.

## 7. Security
- Role-based access (RBAC) on all `/erp/packaging` routes.
- Transactional integrity for serial generation.
- No deletion of serial records.
