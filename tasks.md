# Tasks

- [ ] Create Database Schema (Prisma) <!-- id: 0 -->
  - [ ] Define `GpisSettings` model
  - [ ] Define `GpisSerial` model
  - [ ] Define `GpisPrintJob` model
  - [ ] Define `GpisVerificationLog` model
  - [ ] Run `prisma migrate dev`

- [ ] Implement Server Actions (Backend Logic) <!-- id: 1 -->
  - [ ] Create `app/erp/packaging/actions.ts`
  - [ ] Implement `createPackagingSettings`, `updatePackagingSettings`, `getPackagingSettings`
  - [ ] Implement `validateInventoryForPackaging` (Check required fields)
  - [ ] Implement `generateSerials` (Transaction, Formatting, Uniqueness)
  - [ ] Implement `createPrintJob` (Store job details)
  - [ ] Implement `getSerialHistory` (Pagination, Filtering)
  - [ ] Implement `getVerificationLogs` (Pagination)

- [ ] Create UI Components (Frontend) <!-- id: 2 -->
  - [ ] Create `app/erp/packaging/layout.tsx` (Sidebar integration)
  - [ ] Create `app/erp/packaging/page.tsx` (Dashboard)
  - [ ] Create `app/erp/packaging/create/page.tsx` (Create Wizard)
    - [ ] `CreatePackagingWizard` component (Multi-step form)
    - [ ] `InventorySelector` component
    - [ ] `SerialPreview` component
  - [ ] Create `app/erp/packaging/ledger/page.tsx` (Serial Ledger)
    - [ ] `SerialLedgerTable` component
  - [ ] Create `app/erp/packaging/logs/page.tsx` (Verification Logs)
    - [ ] `VerificationLogsTable` component
  - [ ] Create `app/erp/packaging/settings/page.tsx` (Settings)
    - [ ] `SettingsForm` component

- [ ] Implement PDF Generation <!-- id: 3 -->
  - [ ] Create `lib/packaging-pdf-generator.ts` (jspdf logic)
  - [ ] Implement A4 layout (2 cols x 5 rows)
  - [ ] Implement content rendering (Header, Gemstone, Commercial, etc.)
  - [ ] Implement watermark overlay
  - [ ] Integrate with `CreatePackagingWizard` for print preview/download

- [ ] Implement Public Verification <!-- id: 4 -->
  - [ ] Create `app/verify/[serial]/page.tsx`
  - [ ] Fetch serial details from `GpisSerial`
  - [ ] Log scan to `GpisVerificationLog`
  - [ ] Display valid/invalid status and details

- [ ] Verify & Test <!-- id: 5 -->
  - [ ] Test Inventory Validation (Required fields check)
  - [ ] Test Serial Generation (Uniqueness, formatting)
  - [ ] Test PDF Layout (Margins, Content, Watermark)
  - [ ] Test Verification Route (Valid/Invalid scenarios)
  - [ ] Check RBAC (Access control)
